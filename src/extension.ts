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

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	// console.log('Congratulations, your extension "copilot-debugger" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	// const disposable = vscode.commands.registerCommand('copilot-debugger.helloWorld', () => {
	// 	// The code you place here will be executed every time your command is executed
	// 	// Display a message box to the user
	// 	vscode.window.showInformationMessage('Hello World from Copilot Debugger!');
	// });

	registerTools(context);

	// context.subscriptions.push(disposable);
}

function registerTools(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.lm.registerTool('set_breakpoint', new SetBreakpointTool())
	);
}

// This method is called when your extension is deactivated
export function deactivate() {}

interface SetBreakpointToolParameters {
	file: string;
	line: number;
}

class SetBreakpointTool implements LanguageModelTool<SetBreakpointToolParameters> {
	invoke(options: LanguageModelToolInvocationOptions<SetBreakpointToolParameters>): ProviderResult<LanguageModelToolResult> {

		const file = options.input.file;
		const line = options.input.line;

		const location = new vscode.Location(
			vscode.Uri.file(file),
			// Line numbers are 0-based in VS Code
			new vscode.Position(line - 1, 0)
		);

		const breakpoint = new vscode.SourceBreakpoint(location, /* enabled */ true);

		vscode.debug.addBreakpoints([breakpoint]);

		const result = `Breakpoint set at ${file} line ${line}`;
		const textPart = new LanguageModelTextPart(result);
		const toolResult = new LanguageModelToolResult([textPart]);

		return toolResult;
	}

	prepareInvocation?(options: LanguageModelToolInvocationPrepareOptions<SetBreakpointToolParameters>): ProviderResult<vscode.PreparedToolInvocation> {
		return {
			invocationMessage: `Setting breakpoint at ${options.input.file} line ${options.input.line}`,
		}
	}
}
