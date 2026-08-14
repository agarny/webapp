import * as vue from 'vue';

import * as common from './common';
import * as dependencies from './dependencies';
import { electronApi } from './electronApi';

import * as locApi from '../libopencor/locApi';
import type { MainModule as IWasmLocApi } from '@opencor/libopencor-types';

type WasmFactory = (options?: unknown) => Promise<IWasmLocApi>;

// Our different external dependencies.

type ExternalDependency = {
  name: string;
  url: string;
  set: (module: dependencies.Module) => void;
  cssUrl?: string;
};

const externalDependencies: ExternalDependency[] = [
  {
    name: 'jsonschema',
    url: 'https://cdn.jsdelivr.net/npm/jsonschema@1.5.0/+esm',
    set: (m) => dependencies.setJsonSchema(m)
  },
  {
    name: 'JSZip',
    url: 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm',
    set: (m) => dependencies.setJsZip(m)
  },
  {
    name: 'Math.js',
    url: 'https://cdn.jsdelivr.net/npm/mathjs@15.2.0/+esm',
    set: (m) => dependencies.setMathJs(m)
  },
  {
    name: 'Plotly.js',
    url: 'https://cdn.jsdelivr.net/npm/plotly.js-cartesian-dist-min@3.7.0/+esm',
    set: (m) => dependencies.setPlotlyJs(m)
  }
];

// Some variables to keep track of the initialisation progress.
// Note: the 2 initial steps are to import libOpenCOR's WASM and to instantiate it. We then have one or two steps per
//       external dependency, depending on whether it has an associated CSS file or not. Finally, we have one step to
//       initialise xxHash.

const crtNbOfSteps = vue.ref<number>(0);
const totalNbOfSteps =
  (electronApi ? 0 : 2) +
  externalDependencies.reduce((res, dependency) => res + (dependency.url ? 1 : 0) + (dependency.cssUrl ? 1 : 0), 0) +
  1;

// The base URL for libOpenCOR's files.

const libOpenCORWasmBaseUrl = `https://opencor.ws/libopencor/downloads/wasm/${__LIBOPENCOR_WASM_VERSION__}`;

// Import and instantiate libOpenCOR.

const importAndInstantiateLibOpenCOR = async (libOpenCORJSUrl: string): Promise<void> => {
  const libOpenCOR = (await import(/* @vite-ignore */ libOpenCORJSUrl)).default as WasmFactory;

  ++crtNbOfSteps.value;

  locApi.setWasmLocApi(
    await libOpenCOR({
      locateFile: (path: string) => {
        // Note: the only file that is loaded by libOpenCOR is its threaded WASM, hence fetching it directly from
        //       https://opencor.ws.

        return `${libOpenCORWasmBaseUrl}/${path}`;
      }
    })
  );

  ++crtNbOfSteps.value;
};

// Retrieve the version of libOpenCOR that is to be used. Two options:
//  - OpenCOR: libOpenCOR can be accessed using window.locApi, which references our C++ API.
//  - OpenCOR's Web app: libOpenCOR can be accessed using our WebAssembly module.

export const initialiseLocApi = async (): Promise<void> => {
  // @ts-expect-error (window.locApi may or may not be defined which is why we test it)
  if (window.locApi) {
    // We are running OpenCOR, so libOpenCOR can be accessed using window.locApi.

    // @ts-expect-error (window.locApi is defined)
    locApi.setCppLocApi(window.locApi);
  } else {
    // We are running OpenCOR's Web app, so we must import libOpenCOR's WebAssembly module and instantiate it.

    try {
      // libOpenCOR's glue (i.e. its JavaScript loader) can be served from various places, depending on the host
      // application:
      //  - OpenCOR's Web app serves it from a same-origin URL (from its public folder in development and from its own
      //    Web root in production). This is required by its Content Security Policy, which only allows scripts and
      //    workers from 'self'.
      //  - Other host applications (e.g., a third-party app using @opencor/opencor as an npm package) don't serve it at
      //    all, in which case we import it from https://opencor.ws. To make the worker same-origin (cross-origin
      //    workers are not always allowed, e.g., under COEP or in restricted embedders), we fetch the glue's source,
      //    patch its worker-script URL so that it points to a same-origin blob URL, and import the patched source from
      //    that blob URL.
      // We therefore first try to import the glue from a same-origin URL, and only fall back on importing it from
      // https://opencor.ws if the host application doesn't serve it.

      // The relative URL, with respect to the host application, from which the glue might be served. It matches both
      // OpenCOR's Web app in production (https://opencor.ws serves libOpenCOR from /libopencor/downloads/wasm/...) and
      // a copy of libOpenCOR's files at the root of the host application (e.g., in OpenCOR's Web app's public folder,
      // which mirrors the same path).

      const url = new URL(`libopencor/downloads/wasm/${__LIBOPENCOR_WASM_VERSION__}`, document.baseURI).href;
      // Note: document.baseURI is used rather than window.location.href, since the former doesn't change with
      //       client-side routing.

      try {
        const response = await fetch(`${url}/libopencor.js`, { method: 'HEAD' });
        const contentType = response.headers.get('content-type') ?? '';
        // Note: we use a HEAD request to check that the glue is served from this URL before actually importing it. We
        //       only fall back on https://opencor.ws when the host application clearly doesn't serve it: a 405 (Method
        //       Not Allowed) response means that the glue is served but HEAD requests are not supported, so we try to
        //       import it anyway, and the content-type check is only meant to detect an HTML or XHTML fallback page
        //       (some host applications return one for any URL), since the content-type of a statically served
        //       JavaScript file is not always reported as such.

        if (
          response.status === 405 ||
          (response.ok && !contentType.includes('text/html') && !contentType.includes('application/xhtml+xml'))
        ) {
          await importAndInstantiateLibOpenCOR(`${url}/libopencor.js`);

          return;
        }
      } catch {
        // The host application doesn't serve libOpenCOR from this URL, so import it from https://opencor.ws instead.
      }

      // The host application doesn't serve libOpenCOR itself, so import it from https://opencor.ws. To make its module
      // worker same-origin (see above), we fetch the glue's source, patch its worker-script URL so that it points to a
      // same-origin blob URL, and import the patched source from that blob URL.

      const response = await fetch(`${libOpenCORWasmBaseUrl}/libopencor.js`);

      if (!response.ok) {
        throw new Error(
          `Failed to load libOpenCOR's glue from ${libOpenCORWasmBaseUrl} (${response.status}: ${response.statusText}).`
        );
      }

      const libOpenCORSource = await response.text();

      // The URL of the worker script, which must be the same glue, but served from a same-origin blob URL.

      const libOpenCORWorkerUrl = URL.createObjectURL(new Blob([libOpenCORSource], { type: 'text/javascript' }));

      // Patch the glue's worker-script URL so that its worker is spawned from the same-origin blob URL.

      const workerUrlPattern = 'new URL("libopencor.js",import.meta.url)';

      const patchedLibOpenCORSource = libOpenCORSource.includes(workerUrlPattern)
        ? libOpenCORSource.replace(workerUrlPattern, JSON.stringify(libOpenCORWorkerUrl))
        : undefined;

      if (patchedLibOpenCORSource !== undefined) {
        const patchedLibOpenCORUrl = URL.createObjectURL(
          new Blob([patchedLibOpenCORSource], { type: 'text/javascript' })
        );

        try {
          await importAndInstantiateLibOpenCOR(patchedLibOpenCORUrl);
        } finally {
          // The patched glue has now been imported, so its blob URL is no longer needed and can be revoked.
          // Note: libOpenCORWorkerUrl, on the other hand, must remain valid since libOpenCOR spawns its module worker
          //       lazily (on the first simulation run, and again whenever no worker is available), so revoking it now
          //       would prevent the worker from being spawned.

          URL.revokeObjectURL(patchedLibOpenCORUrl);
        }
      } else {
        // The glue doesn't contain the expected worker-script URL, which means a future version of libOpenCOR generates
        // different code. So, import it directly from https://opencor.ws, which works in standard browsers (the worker
        // will then be cross-origin, which is allowed with CORS), but may not in restricted ones.

        URL.revokeObjectURL(libOpenCORWorkerUrl);
        // Note: the worker URL is not used in this case, so it can be revoked.

        await importAndInstantiateLibOpenCOR(`${libOpenCORWasmBaseUrl}/libopencor.js`);
      }
    } catch (error: unknown) {
      console.error('OpenCOR: failed to load libOpenCOR:', common.formatError(error));

      throw error;
    }
  }
};

// A method to create a lazy initialiser, which imports an external dependency and optionally its CSS.

const injectedCss = new Set<string>();

const createLazyInitialiser = (
  name: string,
  url: string,
  set: (module: dependencies.Module) => void,
  cssUrl?: string
) => {
  return async (): Promise<void> => {
    try {
      // Import the exteral dependency and set it.

      const module = await import(/* @vite-ignore */ url);

      set((module as dependencies.Module).default ?? module);

      ++crtNbOfSteps.value;

      // Fetch any CSS for the module and inject it into the page if we haven't already done so.

      if (cssUrl) {
        if (!injectedCss.has(cssUrl)) {
          const response = await fetch(/* @vite-ignore */ cssUrl, { mode: 'cors' });

          if (!response.ok) {
            throw new Error(`Failed to load ${name ?? 'stylesheet'} (${response.status}: ${response.statusText}).`);
          }

          const style = document.createElement('style');

          style.textContent = await response.text();

          document.head.appendChild(style);

          injectedCss.add(cssUrl);
        }

        ++crtNbOfSteps.value;
      }
    } catch (error: unknown) {
      console.error(`OpenCOR: failed to import ${name ?? url}:`, common.formatError(error));

      throw error;
    }
  };
};

// A method to handle any error that occurs during initialisation.

const initialisationError = (error: unknown): void => {
  if (!issues.value.length) {
    issues.value.push({
      type: locApi.EIssueType.INFORMATION,
      description: 'An error occurred while initialising OpenCOR. Please check your setup and reload the page.'
    });
  }

  issues.value.splice(Math.max(0, issues.value.length - 1), 0, {
    type: locApi.EIssueType.ERROR,
    description: common.formatMessage(common.formatError(error))
  });

  failed.value = true;
};

// Initialise libOpenCOR, our external dependencies, and xxHash.

initialiseLocApi().catch((error: unknown) => {
  initialisationError(error);
});

for (const externalDependency of externalDependencies) {
  createLazyInitialiser(
    externalDependency.name,
    externalDependency.url,
    externalDependency.set,
    externalDependency.cssUrl
  )().catch((error: unknown) => {
    initialisationError(error);
  });
}

dependencies.initialiseXxhash
  .then(() => {
    ++crtNbOfSteps.value;
  })
  .catch((error: unknown) => {
    initialisationError(error);
  });

// Let people know whether initialisation is done and how it's progressing.

export const done = vue.computed<boolean>(() => {
  return progress.value >= 100;
});
export const failed = vue.ref<boolean>(false);
export const issues = vue.ref<locApi.IIssue[]>([]);
export const progress = vue.computed<number>(() => {
  return Math.round((100 * crtNbOfSteps.value) / totalNbOfSteps);
});
