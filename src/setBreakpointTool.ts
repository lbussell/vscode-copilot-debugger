import * as vscode from 'vscode';
import {
  LanguageModelTool,
  LanguageModelToolResult,
  LanguageModelToolInvocationOptions,
  LanguageModelToolInvocationPrepareOptions,
  ProviderResult,
  LanguageModelTextPart,
} from 'vscode';

export interface SetBreakpointToolParameters {
  file: string;
  line: number;
}

export class SetBreakpointTool
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
