import * as vscode from 'vscode';
import { LanguageModelToolResult, LanguageModelTextPart } from 'vscode';

// Shared DAP interfaces
export interface Thread {
  id: number;
  name: string;
}

export interface StackFrame {
  id: number;
  name: string;
  line: number;
  column: number;
}

export interface Scope {
  name: string;
  variablesReference: number;
  expensive: boolean;
}

export interface Variable {
  name: string;
  value: string;
  type?: string;
  evaluateName?: string;
  variablesReference: number;
}

export interface VariableInfo {
  name: string;
  value: string;
  type?: string;
  isExpandable: boolean;
}

export interface ScopeInfo {
  name: string;
  variables: VariableInfo[];
}

export interface VariablesData {
  scopes: ScopeInfo[];
}

export interface DebugContext {
  thread: Thread;
  frame: StackFrame;
  scopes: Scope[];
}

export interface FoundVariable {
  variable: VariableInfo;
  scopeName: string;
}

// Shared DAP helper functions
export class DAPHelpers {
  static async getDebugContext(
    session: vscode.DebugSession
  ): Promise<DebugContext | null> {
    try {
      // Step 1: Get threads
      const threadsResponse = await session.customRequest('threads');
      if (!threadsResponse.threads || threadsResponse.threads.length === 0) {
        return null;
      }
      const firstThread: Thread = threadsResponse.threads[0];

      // Step 2: Get stack trace for the first thread
      const stackTraceResponse = await session.customRequest('stackTrace', {
        threadId: firstThread.id,
      });
      if (
        !stackTraceResponse.stackFrames ||
        stackTraceResponse.stackFrames.length === 0
      ) {
        return null;
      }
      const topFrame: StackFrame = stackTraceResponse.stackFrames[0];

      // Step 3: Get scopes for the top frame
      const scopesResponse = await session.customRequest('scopes', {
        frameId: topFrame.id,
      });
      if (!scopesResponse.scopes || scopesResponse.scopes.length === 0) {
        return null;
      }

      return {
        thread: firstThread,
        frame: topFrame,
        scopes: scopesResponse.scopes,
      };
    } catch (error) {
      return null;
    }
  }

  static async getVariablesFromReference(
    session: vscode.DebugSession,
    variablesReference: number
  ): Promise<VariableInfo[]> {
    try {
      const variablesResponse = await session.customRequest('variables', {
        variablesReference,
      });

      if (!variablesResponse.variables) {
        return [];
      }

      return variablesResponse.variables.map((v: Variable) => ({
        name: v.evaluateName || v.name,
        value: v.value,
        type: v.type,
        isExpandable: v.variablesReference > 0,
      }));
    } catch (error) {
      return [];
    }
  }

  static async findVariableInScopes(
    session: vscode.DebugSession,
    scopes: Scope[],
    variableName: string
  ): Promise<FoundVariable | null> {
    for (const scope of scopes) {
      const variables = await this.getVariablesFromReference(
        session,
        scope.variablesReference
      );
      const foundVariable = variables.find(v => v.name === variableName);
      if (foundVariable) {
        return { variable: foundVariable, scopeName: scope.name };
      }
    }
    return null;
  }

  static createSuccessResult(message: string): LanguageModelToolResult {
    const textPart = new LanguageModelTextPart(message);
    return new LanguageModelToolResult([textPart]);
  }

  static createErrorResult(message: string): LanguageModelToolResult {
    const textPart = new LanguageModelTextPart(`Error: ${message}`);
    return new LanguageModelToolResult([textPart]);
  }
}
