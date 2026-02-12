// Declarations for CDN ESM imports.
// Note: this avoids TypeScript "Cannot find module" diagnostics for direct CDN imports.

declare module 'https://cdn.jsdelivr.net/npm/*' {
  const module: unknown;

  export default module;
}
