#!/usr/bin/env node

// Type-checking wrapper for projects that use TypeScript 7 while `vue-tsc` still expects TypeScript 6 internals.
// Note: this requires the `typescript-6` package alias to be installed in the project (so that we can have both
//       TypeScript 6 and TypeScript 7 installed at the same time).

import fs from 'node:fs';
import Module, { createRequire } from 'node:module';
import path from 'node:path';

const currentWorkingDir = process.cwd();
const currentFolder = path.basename(currentWorkingDir);
const parentFolder = path.basename(path.resolve(currentWorkingDir, '..'));
const projectRoot =
  currentFolder === 'scripts' && parentFolder === 'renderer'
    ? path.resolve(currentWorkingDir, '..')
    : currentWorkingDir;
const origResolveFilename = Module._resolveFilename;

Module._resolveFilename = function (request: string, parent: Module, ...args: unknown[]) {
  if (request === 'typescript/lib/tsc') {
    return path.join(projectRoot, 'node_modules', 'typescript-6', 'lib', 'tsc.js');
  }

  return origResolveFilename.call(this, request, parent, ...args);
};

// Make `vue-tsc` work with Bun.
// Note #1: `vue-tsc` adds support for Vue files to `tsc` by patching its code. It does so by temporarily replacing
//          fs.readFileSync() with a version that patches `tsc`'s code, and then by requiring `tsc` (see runTsc() in
//          @volar/typescript). However, unlike Node.js, Bun doesn't use fs.readFileSync() to load a module, so `tsc`
//          would get loaded unpatched, i.e. without support for Vue files, and our type checking would silently succeed
//          without having checked any Vue file. So, we use a Bun plugin to load `tsc` using fs.readFileSync(), so that
//          it gets patched by `vue-tsc`.
// Note #2: Bun considers the code returned by a plugin with the `js` loader to be an ES module, but `tsc` is a CommonJS
//          module, so we run its code ourselves (as Node.js would) and return its exports using the `object` loader.

interface IBunPluginBuilder {
  onLoad(
    options: { filter: RegExp },
    callback: (args: { path: string }) => { exports: Record<string, unknown>; loader: 'object' }
  ): void;
}

interface IBun {
  plugin(plugin: { name: string; setup(build: IBunPluginBuilder): void }): void;
}

const bun = (globalThis as { Bun?: IBun }).Bun;

if (bun) {
  bun.plugin({
    name: 'vue-tsc',
    setup(build) {
      build.onLoad({ filter: /[\\/]typescript-6[\\/]lib[\\/]tsc\.js$/ }, (args) => {
        const code = fs.readFileSync(args.path, 'utf8');
        const module = { exports: {} };

        new Function('module', 'exports', 'require', '__filename', '__dirname', code)(
          module,
          module.exports,
          createRequire(args.path),
          args.path,
          path.dirname(args.path)
        );

        return { exports: { default: module.exports }, loader: 'object' };
      });
    }
  });
}

await import(path.join(projectRoot, 'node_modules', 'vue-tsc', 'bin', 'vue-tsc.js'));
