import * as vscode from 'vscode';
import {
  LanguageModelTool,
  LanguageModelToolResult,
  LanguageModelToolInvocationOptions,
  LanguageModelToolInvocationPrepareOptions,
  ProviderResult,
  LanguageModelTextPart,
} from 'vscode';

export interface GetVariablesToolParameters {
  variableName: string;
}

interface Thread {
  id: number;
  name: string;
}

interface StackFrame {
  id: number;
  name: string;
  line: number;
  column: number;
}

interface Scope {
  name: string;
  variablesReference: number;
  expensive: boolean;
}

interface Variable {
  name: string;
  value: string;
  type?: string;
  variablesReference: number;
}

export class GetVariablesTool
  implements LanguageModelTool<GetVariablesToolParameters>
{
  async invoke(
    options: LanguageModelToolInvocationOptions<GetVariablesToolParameters>
  ): Promise<LanguageModelToolResult> {
    const variableName = options.input.variableName;

    try {
      // Check if there's an active debug session
      const activeSession = vscode.debug.activeDebugSession;
      if (!activeSession) {
        return this.createErrorResult('No active debug session found');
      }

      // Step 1: Get threads
      const threadsResponse = await activeSession.customRequest('threads');
      if (!threadsResponse.threads || threadsResponse.threads.length === 0) {
        return this.createErrorResult('No threads found in debug session');
      }

      const firstThread: Thread = threadsResponse.threads[0];

      // Step 2: Get stack trace for the first thread
      const stackTraceResponse = await activeSession.customRequest(
        'stackTrace',
        {
          threadId: firstThread.id,
        }
      );

      if (
        !stackTraceResponse.stackFrames ||
        stackTraceResponse.stackFrames.length === 0
      ) {
        return this.createErrorResult('No stack frames found');
      }

      const topFrame: StackFrame = stackTraceResponse.stackFrames[0];

      // Step 3: Get scopes for the top frame
      const scopesResponse = await activeSession.customRequest('scopes', {
        frameId: topFrame.id,
      });

      if (!scopesResponse.scopes || scopesResponse.scopes.length === 0) {
        return this.createErrorResult('No scopes found in current frame');
      }

      // Step 4: Search for the variable in all scopes
      for (const scope of scopesResponse.scopes) {
        const variable = await this.findVariableInScope(
          activeSession,
          scope.variablesReference,
          variableName
        );

        if (variable) {
          const result = this.formatVariableResult(variable);
          return this.createSuccessResult(result);
        }
      }

      return this.createErrorResult(
        `Variable '${variableName}' not found in current scope`
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      return this.createErrorResult(`Failed to get variable: ${errorMessage}`);
    }
  }

  private async findVariableInScope(
    session: vscode.DebugSession,
    variablesReference: number,
    targetName: string
  ): Promise<Variable | null> {
    try {
      const variablesResponse = await session.customRequest('variables', {
        variablesReference,
      });

      if (!variablesResponse.variables) {
        return null;
      }

      // Look for exact match first
      const exactMatch = variablesResponse.variables.find(
        (v: Variable) => v.name === targetName
      );

      if (exactMatch) {
        return exactMatch;
      }

      // If not found, recursively search in nested objects
      for (const variable of variablesResponse.variables) {
        if (variable.variablesReference > 0) {
          const nestedResult = await this.findVariableInScope(
            session,
            variable.variablesReference,
            targetName
          );
          if (nestedResult) {
            return nestedResult;
          }
        }
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  private formatVariableResult(variable: Variable): string {
    let result = `Variable: ${variable.name}\n`;
    result += `Value: ${variable.value}`;

    if (variable.type) {
      result += `\nType: ${variable.type}`;
    }

    if (variable.variablesReference > 0) {
      result += '\n(Object with nested properties)';
    }

    return result;
  }

  private createSuccessResult(message: string): LanguageModelToolResult {
    const textPart = new LanguageModelTextPart(message);
    return new LanguageModelToolResult([textPart]);
  }

  private createErrorResult(message: string): LanguageModelToolResult {
    const textPart = new LanguageModelTextPart(`Error: ${message}`);
    return new LanguageModelToolResult([textPart]);
  }

  prepareInvocation?(
    options: LanguageModelToolInvocationPrepareOptions<GetVariablesToolParameters>
  ): ProviderResult<vscode.PreparedToolInvocation> {
    return {
      invocationMessage: `Getting variable '${options.input.variableName}' from debug session`,
    };
  }
}
