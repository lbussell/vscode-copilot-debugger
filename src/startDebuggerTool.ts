import * as vscode from 'vscode';
import {
  LanguageModelTool,
  LanguageModelToolResult,
  LanguageModelToolInvocationOptions,
  LanguageModelToolInvocationPrepareOptions,
  ProviderResult,
  LanguageModelTextPart,
} from 'vscode';

export interface StartDebuggerToolParameters {
  configuration?: string;
}

export class StartDebuggerTool
  implements LanguageModelTool<StartDebuggerToolParameters>
{
  async invoke(
    options: LanguageModelToolInvocationOptions<StartDebuggerToolParameters>
  ): Promise<LanguageModelToolResult> {
    const configuration = options.input.configuration;

    // Get the current workspace folder
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      const result = 'No workspace folder is open. Cannot start debugger.';
      const textPart = new LanguageModelTextPart(result);
      return new LanguageModelToolResult([textPart]);
    }

    try {
      // Start debugging with the specified configuration or let VS Code choose the default
      const success = await vscode.debug.startDebugging(
        workspaceFolder,
        configuration ?? ''
      );

      const result = success
        ? `Debugger started successfully${configuration ? ` with configuration "${configuration}"` : ''}`
        : `Failed to start debugger${configuration ? ` with configuration "${configuration}"` : ''}`;

      const textPart = new LanguageModelTextPart(result);
      return new LanguageModelToolResult([textPart]);
    } catch (error) {
      const result = `Error starting debugger: ${error instanceof Error ? error.message : 'Unknown error'}`;
      const textPart = new LanguageModelTextPart(result);
      return new LanguageModelToolResult([textPart]);
    }
  }

  prepareInvocation?(
    options: LanguageModelToolInvocationPrepareOptions<StartDebuggerToolParameters>
  ): ProviderResult<vscode.PreparedToolInvocation> {
    return {
      invocationMessage: `Starting debugger${options.input.configuration ? ` with configuration "${options.input.configuration}"` : ''}`,
    };
  }
}
