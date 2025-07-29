# Get Variables Tool Specification

## Overview

This specification documents the implementation of the `get_variables` Language Model Tool for VS Code extensions that integrate with GitHub Copilot. The tool allows Copilot to retrieve variable values from active debug sessions using the Debug Adapter Protocol (DAP).

## Research Findings

### Debug Adapter Protocol Flow

Based on [Stack Overflow research](https://stackoverflow.com/questions/50287482/vs-code-how-to-access-debug-variables-from-within-extension), accessing debug variables requires a four-step DAP request chain:

1. **Threads Request** (`threads`) - Get available thread IDs
2. **StackTrace Request** (`stackTrace`) - Get frame IDs for a specific thread
3. **Scopes Request** (`scopes`) - Get variable references for a specific frame
4. **Variables Request** (`variables`) - Get actual variable values using references

### Key Technical Insights

#### DAP Request Pattern
```typescript
const session = vscode.debug.activeDebugSession;
const threadsResponse = await session.customRequest('threads');
const stackTraceResponse = await session.customRequest('stackTrace', { threadId });
const scopesResponse = await session.customRequest('scopes', { frameId });
const variablesResponse = await session.customRequest('variables', { variablesReference });
```

#### Variable Traversal
- Variables with `variablesReference > 0` contain nested properties
- Recursive traversal required for complex objects
- Each scope (local, global, closure) must be searched independently

#### VS Code Integration Requirements
- Must check `vscode.debug.activeDebugSession` exists
- Debug session must be in stopped/paused state to access variables
- Use VS Code's `LanguageModelTool` interface for Copilot integration

## Implementation Details

### Tool Interface Design
- **Simplified Parameter**: Only `variableName: string` parameter for Copilot ease-of-use
- **Automatic Context**: Uses first available thread and topmost stack frame
- **Smart Search**: Searches all scopes and nested objects automatically

### Error Handling Strategy
1. **Session Validation**: Check active debug session exists
2. **State Verification**: Ensure debug session is stopped/paused
3. **Request Failures**: Handle DAP request errors gracefully
4. **Variable Not Found**: Clear messaging when variable doesn't exist

### Output Format
```
Variable: <name>
Value: <value>
Type: <type> (if available)
(Object with nested properties) (if applicable)
```

## Architecture Patterns

### File Organization
- `src/getVariablesTool.ts` - Tool implementation
- Interface and class in same file following project conventions
- Separate TypeScript interfaces for DAP response types

### VS Code Extension Integration
1. **Tool Definition**: Added to `package.json` under `languageModelTools`
2. **Registration**: Added to `registerTools()` function in `extension.ts`
3. **Import**: Added import statement following alphabetical order

### TypeScript Implementation
- **Async/Await**: All DAP requests are asynchronous
- **Type Safety**: Defined interfaces for Thread, StackFrame, Scope, Variable
- **Error Boundaries**: Try-catch blocks around each major operation
- **Promise Handling**: Proper Promise return types for tool interface

## Lessons Learned

### DAP Complexity
- Different debug adapters may have slight implementation variations
- Variable references are hierarchical and require recursive traversal
- Scope ordering matters (local → closure → global typically)

### VS Code API Constraints
- `customRequest()` is the primary interface for DAP communication
- Debug session state must be validated before variable access
- Tool interface requires specific return types and error handling

### Copilot Integration Best Practices
- **Simplicity**: Minimal parameters reduce complexity for AI model
- **Context Awareness**: Tool should handle context (thread/frame) automatically
- **Clear Messaging**: Both success and error messages should be descriptive

## Future Considerations

### Potential Enhancements
- **Variable Filtering**: Support for filtering by variable type or scope
- **Batch Retrieval**: Get multiple variables in single request
- **Watch Expressions**: Support for evaluating expressions, not just variable names
- **Deep Object Inspection**: Configurable depth limits for nested objects

### Performance Optimizations
- **Scope Caching**: Cache scope information for repeated requests
- **Request Batching**: Combine multiple DAP requests where possible
- **Timeout Handling**: Add configurable timeouts for DAP requests

### Debug Adapter Compatibility
- **Provider Testing**: Test with different debug adapters (Node.js, Python, C++, etc.)
- **Fallback Strategies**: Handle debug adapters with limited DAP support
- **Error Recovery**: More sophisticated error handling for adapter-specific issues

## Related Documentation

- [Debug Adapter Protocol Specification](https://microsoft.github.io/debug-adapter-protocol/specification)
- [VS Code Debug API](https://code.visualstudio.com/api/extension-guides/debugger-extension)
- [VS Code Language Model Tools](https://code.visualstudio.com/api/extension-guides/language-model)

## Testing Strategy

### Manual Testing Scenarios
1. **Basic Variable Retrieval**: Simple local variables (string, number, boolean)
2. **Complex Objects**: Objects with nested properties and arrays
3. **Different Scopes**: Local, closure, and global variables
4. **Error Conditions**: No debug session, session not stopped, variable not found
5. **Multiple Debug Adapters**: Test with Node.js, Python, other language debuggers

### Edge Cases
- Variables with special characters in names
- Variables with very large values (arrays, objects)
- Variables that change type during debugging session
- Shadowed variables (same name in different scopes)