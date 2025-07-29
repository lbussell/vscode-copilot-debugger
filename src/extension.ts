// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import {
  LanguageModelTool,
  LanguageModelToolResult,
  LanguageModelToolInvocationOptions,
  LanguageModelToolInvocationPrepareOptions,
  ProviderResult,
  LanguageModelTextPart,
} from 'vscode';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  registerTools(context);
}

function registerTools(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.lm.registerTool('set_breakpoint', new SetBreakpointTool()),
    vscode.lm.registerTool('start_debugger', new StartDebuggerTool())
  );
}

// This method is called when your extension is deactivated
export function deactivate() {}

interface SetBreakpointToolParameters {
  file: string;
  line: number;
}

interface StartDebuggerToolParameters {
  configuration?: string;
}

class SetBreakpointTool
  implements LanguageModelTool<SetBreakpointToolParameters>
{
  invoke(
    options: LanguageModelToolInvocationOptions<SetBreakpointToolParameters>
  ): ProviderResult<LanguageModelToolResult> {
    const file = options.input.file;
    const line = options.input.line;

    const location = new vscode.Location(
      vscode.Uri.file(file),
      // Line numbers are 0-based in VS Code
      new vscode.Position(line - 1, 0)
    );

    const breakpoint = new vscode.SourceBreakpoint(
      location,
      /* enabled */ true
    );

    vscode.debug.addBreakpoints([breakpoint]);

    const result = `Breakpoint set at ${file} line ${line}`;
    const textPart = new LanguageModelTextPart(result);
    const toolResult = new LanguageModelToolResult([textPart]);

    return toolResult;
  }

  prepareInvocation?(
    options: LanguageModelToolInvocationPrepareOptions<SetBreakpointToolParameters>
  ): ProviderResult<vscode.PreparedToolInvocation> {
    return {
      invocationMessage: `Setting breakpoint at ${options.input.file} line ${options.input.line}`,
    };
  }
}

class StartDebuggerTool
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
