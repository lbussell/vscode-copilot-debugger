import * as vscode from 'vscode';
import {
  LanguageModelTool,
  LanguageModelToolResult,
  LanguageModelToolInvocationOptions,
  LanguageModelToolInvocationPrepareOptions,
  ProviderResult,
  LanguageModelTextPart,
} from 'vscode';
import {
  IDebuggerSubscription,
  DebugSessionStatus,
  DebugTracker,
  IDebugTracker,
} from 'debug-tracker-vscode';

export interface WaitForBreakpointToolParameters {
  timeout?: number; // Optional timeout in seconds, default 30
}

export class WaitForBreakpointTool
  implements LanguageModelTool<WaitForBreakpointToolParameters>
{
  async invoke(
    options: LanguageModelToolInvocationOptions<WaitForBreakpointToolParameters>
  ): Promise<LanguageModelToolResult> {
    const timeout = options.input.timeout ?? 30; // Default 30 seconds
    let subscription: IDebuggerSubscription | undefined;

    try {
      // Get the debug tracker
      const trackerResult =
        await DebugTracker.getTrackerExtension('copilot-debugger');
      if (trackerResult instanceof Error) {
        const result = `Debug tracker extension not available: ${trackerResult.message}. Please install the "debug-tracker-vscode" extension from the marketplace.`;
        return new LanguageModelToolResult([new LanguageModelTextPart(result)]);
      }
      const tracker = trackerResult;

      // Check if there are any active debug sessions
      const debugSessions = vscode.debug.activeDebugSession;
      if (!debugSessions) {
        const result =
          'No active debug session found. Please start debugging first.';
        return new LanguageModelToolResult([new LanguageModelTextPart(result)]);
      }

      const sessionId = debugSessions.id;

      // Check current status immediately
      const currentStatus = tracker.getSessionStatus(sessionId);
      if (currentStatus === DebugSessionStatus.Stopped) {
        const sessionInfo = tracker.getSessionInfo(sessionId);
        const result = `Already stopped at breakpoint in debug session "${sessionId}". Session info: ${JSON.stringify(sessionInfo, null, 2)}`;
        return new LanguageModelToolResult([new LanguageModelTextPart(result)]);
      }

      if (currentStatus === DebugSessionStatus.Terminated) {
        const result = 'Debug session has terminated.';
        return new LanguageModelToolResult([new LanguageModelTextPart(result)]);
      }

      // Set up promise to wait for breakpoint hit
      return new Promise<LanguageModelToolResult>((resolve, reject) => {
        let timeoutHandle: NodeJS.Timeout;

        const handleTimeout = () => {
          if (subscription) {
            tracker.unsubscribe(subscription.clientId);
          }
          resolve(
            new LanguageModelToolResult([
              new LanguageModelTextPart(
                `Timeout after ${timeout} seconds waiting for breakpoint.`
              ),
            ])
          );
        };

        // Set up timeout
        timeoutHandle = setTimeout(handleTimeout, timeout * 1000);

        // Subscribe to debug events
        const subscriptionResult = tracker.subscribe({
          version: 1,
          body: {
            debuggers: '*', // Monitor all debug adapters
            wantCurrentStatus: true,
            notifyAllEvents: false,
            debugLevel: 0,
            handler: async (event: any) => {
              try {
                // Check if this is our session and it stopped
                if (
                  event.sessionId === sessionId &&
                  event.status === DebugSessionStatus.Stopped
                ) {
                  clearTimeout(timeoutHandle);
                  if (subscription) {
                    tracker.unsubscribe(subscription.clientId);
                  }

                  const sessionInfo = tracker.getSessionInfo(sessionId);
                  const result = `Breakpoint hit in debug session "${sessionId}". Session info: ${JSON.stringify(sessionInfo, null, 2)}`;

                  resolve(
                    new LanguageModelToolResult([
                      new LanguageModelTextPart(result),
                    ])
                  );
                } else if (
                  event.sessionId === sessionId &&
                  event.status === DebugSessionStatus.Terminated
                ) {
                  clearTimeout(timeoutHandle);
                  if (subscription) {
                    tracker.unsubscribe(subscription.clientId);
                  }

                  resolve(
                    new LanguageModelToolResult([
                      new LanguageModelTextPart(
                        'Debug session terminated while waiting for breakpoint.'
                      ),
                    ])
                  );
                }
              } catch (error) {
                clearTimeout(timeoutHandle);
                if (subscription) {
                  tracker.unsubscribe(subscription.clientId);
                }
                reject(error);
              }
            },
          },
        });

        if (typeof subscriptionResult === 'string') {
          clearTimeout(timeoutHandle);
          resolve(
            new LanguageModelToolResult([
              new LanguageModelTextPart(
                `Failed to subscribe to debug events: ${subscriptionResult}`
              ),
            ])
          );
          return;
        }

        subscription = subscriptionResult;
      });
    } catch (error) {
      if (subscription) {
        try {
          const trackerResult =
            await DebugTracker.getTrackerExtension('copilot-debugger');
          if (!(trackerResult instanceof Error)) {
            trackerResult.unsubscribe(subscription.clientId);
          }
        } catch {
          // Ignore errors during cleanup
        }
      }

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const result = `Error waiting for breakpoint: ${errorMessage}`;
      return new LanguageModelToolResult([new LanguageModelTextPart(result)]);
    }
  }

  prepareInvocation?(
    options: LanguageModelToolInvocationPrepareOptions<WaitForBreakpointToolParameters>
  ): ProviderResult<vscode.PreparedToolInvocation> {
    const timeout = options.input.timeout ?? 30;
    return {
      invocationMessage: `Waiting for breakpoint hit (timeout: ${timeout}s)`,
    };
  }
}
