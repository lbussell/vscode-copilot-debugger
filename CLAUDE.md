# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Build**: `npm run compile` - Compiles TypeScript to JavaScript in `out/` directory
- **Watch mode**: `npm run watch` - Compiles TypeScript in watch mode for development
- **Lint**: `npm run lint` - Runs ESLint on TypeScript files in `src/`
- **Test**: `npm run test` - Runs tests using vscode-test
- **Prepare for publish**: `npm run vscode:prepublish` - Runs compile before publishing

## Architecture

This is a VS Code extension that integrates with GitHub Copilot to provide debugging capabilities through language model tools.

### Core Components

- **Extension entry point**: `src/extension.ts` - Main activation logic and tool registration
- **Language Model Tools**: Classes implementing VS Code's `LanguageModelTool` interface
  - `SetBreakpointTool` - Sets breakpoints at specified file/line locations
  - `StartDebuggerTool` - Starts debugging sessions with optional configuration
- **Tool registration**: Registers tools with VS Code's language model system via `vscode.lm.registerTool()`

### Key Architecture Patterns

- The extension uses VS Code's Language Model Tools API to expose debugging functionality to Copilot
- Tool definitions in `package.json` under `languageModelTools` specify the interface for Copilot
- Each tool class implements both `invoke()` and optional `prepareInvocation()` methods
- Line numbers are converted from 1-based (user input) to 0-based (VS Code internal)
- Async operations use `async/await` pattern with proper error handling
- Tools validate workspace state before performing operations

### File Structure

- `src/extension.ts` - Main extension logic and tool implementation
- `package.json` - Extension manifest with tool definitions and VS Code configuration
- `out/` - Compiled JavaScript output (generated)
- TypeScript configuration uses Node16 modules targeting ES2022

## Extension Configuration

The extension contributes language model tools that allow Copilot to interact with VS Code's debugging system:

- **`set_breakpoint`** - Sets breakpoints by specifying file path and line number
- **`start_debugger`** - Starts debugging sessions with optional configuration name

Tools are automatically available to Copilot when the extension is active.

## Implementation Notes

- When adding new tools, define the interface in `package.json` under `languageModelTools`
- Implement the tool class with `LanguageModelTool<ParametersInterface>` interface
- Register the tool in `registerTools()` function using `vscode.lm.registerTool()`
- Use proper TypeScript typing and handle optional parameters carefully
- VS Code's `startDebugging()` requires 2+ arguments - use conditional logic for optional parameters
- Always validate workspace folder exists before debugging operations