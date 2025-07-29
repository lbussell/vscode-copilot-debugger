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
  - `WaitForBreakpointTool` - Waits for breakpoint hits using Debug Adapter Protocol monitoring
  - `GetVariablesTool` - Retrieves variable values from active debug sessions using DAP
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
- `src/waitForBreakpointTool.ts` - WaitForBreakpointTool class and interface (requires debug-tracker-vscode)
- `src/getVariablesTool.ts` - GetVariablesTool class and interface
- `package.json` - Extension manifest with tool definitions and VS Code configuration
- `out/` - Compiled JavaScript output (generated)
- TypeScript configuration uses Node16 modules targeting ES2022
- Uses camelCase naming convention for TypeScript files

## Extension Configuration

The extension contributes language model tools that allow Copilot to interact with VS Code's debugging system:

- **`set_breakpoint`** - Sets breakpoints by specifying file path and line number
- **`start_debugger`** - Starts debugging sessions with optional configuration name
- **`wait_for_breakpoint`** - Waits for the debugger to hit a breakpoint or stop execution
- **`get_variables`** - Retrieves variable values from the current debug session when stopped

Tools are automatically available to Copilot when the extension is active.

## Prerequisites

This extension requires the **debug-tracker-vscode** extension to be installed for the `wait_for_breakpoint` tool to function:

1. **Automatic Installation**: The extension will attempt to auto-install if not present
2. **Manual Installation**: Install from VS Code marketplace: `mcu-debug.debug-tracker-vscode`
3. **Command**: Use Quick Open (`Ctrl+P`) and search for "debug-tracker-vscode"

The debug tracker extension provides API services for monitoring debug sessions and is required for breakpoint waiting functionality.

## Implementation Notes

- When adding new tools, define the interface in `package.json` under `languageModelTools`
- Create a separate camelCase `.ts` file for each tool class (e.g., `newToolName.ts`)
- Each tool file should export both the parameters interface and the tool class
- Implement the tool class with `LanguageModelTool<ParametersInterface>` interface
- Import and register the tool in `registerTools()` function using `vscode.lm.registerTool()`
- Use proper TypeScript typing and handle optional parameters carefully
- VS Code's `startDebugging()` requires 2+ arguments - use conditional logic for optional parameters
- Always validate workspace folder exists before debugging operations

## External Dependencies

### debug-tracker-vscode Integration

- **Dual dependency requirement**: Requires both NPM package and VS Code extension
- **NPM package**: `debug-tracker-vscode` - Provides TypeScript types and API client
- **VS Code extension**: `mcu-debug.debug-tracker-vscode` - Provides the actual debug tracking service
- **API access**: Use `DebugTracker.getTrackerExtension('extension-name')` to get tracker instance
- **Event handlers**: Must be async functions returning `Promise<void>`
- **Resource cleanup**: Always unsubscribe from debug events to prevent memory leaks
- **State handling**: Check current debug status immediately with `getSessionStatus()` before waiting
- **Subscription pattern**: Use `wantCurrentStatus: true` to get immediate status when subscribing

### Debug Adapter Protocol Monitoring

- **Status monitoring**: Track `DebugSessionStatus` changes (Running → Stopped = breakpoint hit)
- **Event filtering**: Can monitor specific debug adapters or use `'*'` for all
- **Session validation**: Always verify active debug session exists before monitoring
- **Timeout handling**: Implement timeout mechanisms to prevent infinite waiting
- **Error scenarios**: Handle debug session termination, extension unavailability, and API errors

### Debug Adapter Protocol Variable Access

- **Four-step DAP flow**: threads → stackTrace → scopes → variables requests
- **Request chain**: Each step provides context for the next (threadId → frameId → variablesReference)
- **Recursive traversal**: Variables with `variablesReference > 0` contain nested properties
- **Scope searching**: Must search all scopes (local, closure, global) to find variables
- **Session state**: Debug session must be stopped/paused to access variable values
- **Error handling**: Each DAP request can fail independently and requires proper error handling

## Code Organization

- Keep `src/extension.ts` minimal - only activation, deactivation, and registration logic
- Separate each tool class into its own file for better maintainability
- Use flat file structure in `src/` directory (no subdirectories for tools)
- Export both interface and class from each tool file
- Follow consistent patterns across all tool implementations

## Advanced Patterns

### Promise-based Tool Implementation

- For tools that wait for events (like `wait_for_breakpoint`), return a Promise from `invoke()`
- Use proper Promise constructor with resolve/reject for event-driven operations
- Implement cleanup logic in both success and error paths
- Handle race conditions between timeouts and actual events

### Event-driven Debug Monitoring

- Always check current state before subscribing to avoid missing already-occurred events
- Use subscription IDs for proper cleanup to prevent memory leaks
- Handle multiple possible outcomes (success, timeout, session termination)
- Provide meaningful feedback messages for all scenarios

### Error Handling Best Practices

- Gracefully handle external dependency unavailability (debug tracker extension)
- Provide clear installation instructions in error messages
- Use try-catch blocks around async operations with proper cleanup
- Distinguish between recoverable and non-recoverable errors

### DAP Variable Access Implementation

- **Request chaining**: Use `session.customRequest()` for all DAP communication
- **Context building**: Each request builds context for the next (threads → frames → scopes → variables)
- **Default selection**: Use first available thread and topmost stack frame for simplicity
- **Recursive search**: Implement recursive traversal for nested object properties
- **Scope iteration**: Search all available scopes until variable is found
- **Type safety**: Define TypeScript interfaces for all DAP response structures

## Workflow Guidance

- **Always update CLAUDE.md when you complete a feature**
