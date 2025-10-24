# Project Rules & Code Style

This file contains project-specific rules and conventions that must be followed when working on this codebase.

## Import Rules

### Static Imports Only
- **ALWAYS** use static imports at the top of files
- **NEVER** use dynamic imports (`await import()` or `import()`)
- Dynamic imports reduce reliability and can cause silent failures or hanging behavior
- Exception: Only use dynamic imports if absolutely necessary for code splitting large libraries, and it must be explicitly justified with a comment

**Bad:**
```typescript
// ❌ NEVER do this
const { savePendingSync } = await import("@/lib/airdrop-sync-storage");
```

**Good:**
```typescript
// ✅ ALWAYS do this
import { savePendingSync } from "@/lib/airdrop-sync-storage";
```

## TypeScript Rules

- Use explicit types for function parameters and return values
- Prefer `interface` over `type` for object shapes
- Use `const` for variables that won't be reassigned

## React/Next.js Rules

- All components should use TypeScript with proper prop types
- Use "use client" directive for client components
- Prefer server components by default unless client-side interactivity is needed

## Error Handling

- Always add try-catch blocks for async operations
- Log errors with descriptive context using `console.error()`
- Never swallow errors silently

## Multi-Chain Support

- Always use `chainId` parameter when dealing with blockchain operations
- Use `getChainConfig()` helper to get chain-specific configuration
- Never hardcode RPC URLs or contract addresses - use the chain config system
