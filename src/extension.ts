// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { SetBreakpointTool } from './setBreakpointTool';
import { StartDebuggerTool } from './startDebuggerTool';

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
