import * as vscode from 'vscode';
import {
  LanguageModelTool,
  LanguageModelToolResult,
  LanguageModelToolInvocationOptions,
  LanguageModelToolInvocationPrepareOptions,
  ProviderResult,
  LanguageModelTextPart,
} from 'vscode';

export interface GetVariablesToolParameters {}

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
  evaluateName?: string;
  variablesReference: number;
}

interface VariableInfo {
  name: string;
  value: string;
  type?: string;
  isExpandable: boolean;
}

interface ScopeInfo {
  name: string;
  variables: VariableInfo[];
}

interface VariablesData {
  scopes: ScopeInfo[];
}

export class GetVariablesTool
  implements LanguageModelTool<GetVariablesToolParameters>
{
  async invoke(
    options: LanguageModelToolInvocationOptions<GetVariablesToolParameters>
  ): Promise<LanguageModelToolResult> {
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

      // Step 4: Get all variables from all scopes
      const variablesData: VariablesData = { scopes: [] };

      for (const scope of scopesResponse.scopes) {
        const scopeInfo = await this.getScopeInfo(
          activeSession,
          scope.variablesReference,
          scope.name
        );
        if (scopeInfo.variables.length > 0) {
          variablesData.scopes.push(scopeInfo);
        }
      }

      if (variablesData.scopes.length === 0) {
        return this.createErrorResult('No variables found in current scope');
      }

      const result = JSON.stringify(variablesData, null, 2);
      return this.createSuccessResult(result);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      return this.createErrorResult(`Failed to get variables: ${errorMessage}`);
    }
  }

  private async getScopeInfo(
    session: vscode.DebugSession,
    variablesReference: number,
    scopeName: string
  ): Promise<ScopeInfo> {
    try {
      const variablesResponse = await session.customRequest('variables', {
        variablesReference,
      });

      if (!variablesResponse.variables) {
        return { name: scopeName, variables: [] };
      }

      const variables: VariableInfo[] = variablesResponse.variables.map(
        (v: Variable) => ({
          name: v.evaluateName,
          value: v.value,
          type: v.type,
          expandable: v.variablesReference > 0,
        })
      );

      return { name: scopeName, variables };
    } catch (error) {
      return { name: scopeName, variables: [] };
    }
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
      invocationMessage: 'Getting all variables from debug session',
    };
  }
}
