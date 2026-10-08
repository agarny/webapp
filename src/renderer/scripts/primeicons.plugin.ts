import * as postcss from 'postcss';
import type { Plugin } from 'vite';

// A Vite plugin to remove PrimeIcons' @font-face rule.
// Note: PrimeIcons' CSS (which we import in src/renderer/src/assets/app.css) has a @font-face rule that references its
//       fonts in various formats (EOT, WOFF2, WOFF, TTF, and SVG), all of which Vite would either emit (application
//       builds) or inline (library build). Yet, we don't need that rule since we inject our own @font-face rule, which
//       only references an inlined WOFF2 font (see src/renderer/src/assets/primeicons-assets.ts). So, we remove that
//       rule once Tailwind CSS has inlined PrimeIcons' CSS, but before Vite processes the URLs referenced by our CSS,
//       hence our plugin must be enforced as 'pre' and be placed right after Tailwind CSS's plugin (which is also
//       enforced as 'pre').

export const stripPrimeIconsFontFacePlugin = (): Plugin => {
  return {
    name: 'strip-primeicons-font-face',
    enforce: 'pre',
    transform(code, id) {
      if (!id.split('?')[0]?.endsWith('.css') || !code.includes('primeicons')) {
        return null;
      }

      const root = postcss.parse(code);
      let removed = false;

      root.walkAtRules('font-face', (atRule) => {
        let isPrimeIconsFontFace = false;

        atRule.walkDecls('font-family', (decl) => {
          if (decl.value.includes('primeicons')) {
            isPrimeIconsFontFace = true;
          }
        });

        if (isPrimeIconsFontFace) {
          atRule.remove();

          removed = true;
        }
      });

      return removed ? { code: root.toString(), map: null } : null;
    }
  };
};
