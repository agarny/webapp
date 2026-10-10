// TypeScript shims for Vite-style imports.
// Note: `vue-tsc` needs to know how to treat `.vue` files and Vite-style asset imports.

declare const __LIBOPENCOR_WASM_VERSION__: string;

declare module '*.vue' {
  const component: import('vue').DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>;

  export default component;
}

declare module '*.css';

declare module '*?asset' {
  const source: string;

  export default source;
}

declare module '*.woff2?inline' {
  const source: string;

  export default source;
}
