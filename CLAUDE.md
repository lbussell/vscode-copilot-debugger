# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Build**: `npm run compile` - Compiles TypeScript to JavaScript in `out/` directory
- **Watch mode**: `npm run watch` - Compiles TypeScript in watch mode for development
- **Lint**: `npm run lint` - Runs ESLint on TypeScript files in `src/`
- **Format**: `npm run format` - Formats all files with Prettier
- **Format check**: `npm run format:check` - Checks if files are properly formatted
- **Test**: `npm run test` - Runs tests using vscode-test
- **Prepare for publish**: `npm run vscode:prepublish` - Runs compile before publishing
- **Important**: Always run `npm run format` before `npm run lint` to avoid formatting conflicts

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

- `src/extension.ts` - Main extension logic, activation, and tool registration only
- `src/setBreakpointTool.ts` - SetBreakpointTool class and interface
- `src/startDebuggerTool.ts` - StartDebuggerTool class and interface
- `package.json` - Extension manifest with tool definitions and VS Code configuration
- `out/` - Compiled JavaScript output (generated)  
- TypeScript configuration uses Node16 modules targeting ES2022
- Uses camelCase naming convention for TypeScript files

## Extension Configuration

The extension contributes language model tools that allow Copilot to interact with VS Code's debugging system:

- **`set_breakpoint`** - Sets breakpoints by specifying file path and line number
- **`start_debugger`** - Starts debugging sessions with optional configuration name

Tools are automatically available to Copilot when the extension is active.

## Implementation Notes

- When adding new tools, define the interface in `package.json` under `languageModelTools`
- Create a separate camelCase `.ts` file for each tool class (e.g., `newToolName.ts`)
- Each tool file should export both the parameters interface and the tool class
- Implement the tool class with `LanguageModelTool<ParametersInterface>` interface
- Import and register the tool in `registerTools()` function using `vscode.lm.registerTool()`
- Use proper TypeScript typing and handle optional parameters carefully
- VS Code's `startDebugging()` requires 2+ arguments - use conditional logic for optional parameters
- Always validate workspace folder exists before debugging operations

## Code Organization

- Keep `src/extension.ts` minimal - only activation, deactivation, and registration logic
- Separate each tool class into its own file for better maintainability
- Use flat file structure in `src/` directory (no subdirectories for tools)
- Export both interface and class from each tool file
- Follow consistent patterns across all tool implementations