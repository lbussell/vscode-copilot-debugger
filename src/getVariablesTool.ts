import * as vscode from 'vscode';
import {
  LanguageModelTool,
  LanguageModelToolResult,
  LanguageModelToolInvocationOptions,
  LanguageModelToolInvocationPrepareOptions,
  ProviderResult,
} from 'vscode';
import { DAPHelpers, VariablesData } from './debugUtils';

export interface GetVariablesToolParameters {}

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
        return DAPHelpers.createErrorResult('No active debug session found');
      }

      // Get debug context (threads, frames, scopes)
      const debugContext = await DAPHelpers.getDebugContext(activeSession);
      if (!debugContext) {
        return DAPHelpers.createErrorResult(
          'Unable to get debug context (threads, frames, or scopes)'
        );
      }

      // Get all variables from all scopes
      const variablesData: VariablesData = { scopes: [] };

      for (const scope of debugContext.scopes) {
        const variables = await DAPHelpers.getVariablesFromReference(
          activeSession,
          scope.variablesReference
        );
        if (variables.length > 0) {
          variablesData.scopes.push({ name: scope.name, variables });
        }
      }

      if (variablesData.scopes.length === 0) {
        return DAPHelpers.createErrorResult(
          'No variables found in current scope'
        );
      }

      const result = JSON.stringify(variablesData, null, 2);
      return DAPHelpers.createSuccessResult(result);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      return DAPHelpers.createErrorResult(
        `Failed to get variables: ${errorMessage}`
      );
    }
  }

  prepareInvocation?(
    options: LanguageModelToolInvocationPrepareOptions<GetVariablesToolParameters>
  ): ProviderResult<vscode.PreparedToolInvocation> {
    return {
      invocationMessage: 'Getting all variables from debug session',
    };
  }
}
