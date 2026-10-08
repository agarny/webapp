import * as common from './common';
import * as dependencies from './dependencies';

export type FloatArray = Float64Array<ArrayBufferLike>;

type MathJsValue = number | FloatArray;
type MathJsResult = boolean | MathJsValue;
type MathJsFunction = (...args: MathJsValue[]) => MathJsValue;
export type ExpressionScope = Record<string, MathJsValue>;

class MathError extends Error {
  constructor(
    public readonly expression: string,
    public readonly message: string
  ) {
    super(`${common.formatMessage(common.formatError(message), false)} in '${expression}'`);

    this.name = 'MathError';
  }
}

interface ICompiledExpression {
  evaluate: (scope: ExpressionScope) => MathJsResult;
}

interface IMathJsLike {
  import: (object: Record<string, MathJsFunction>, options?: { override?: boolean }) => void;
  compile: (expression: string) => ICompiledExpression;
}

const ELEMENTWISE_REGEX = /\.([*/^])/g;
// Note #1: we match numbers as well as identifiers so that the exponent of a number in scientific notation (e.g., e3
//          in 2e3 or 2.e3) is not mistaken for an identifier while still allowing for implicit multiplication (e.g., 2x
//          or 2e). A number is matched the way Math.js tokenises it (see parse.js in Math.js), i.e. either some digits
//          followed by an optional decimal mark (a "." that is not the start of an element-wise operator, i.e. ".*",
//          "./", or ".^") and some optional digits, or a decimal mark followed by some digits, with an optional
//          exponent in both cases.
// Note #2: an identifier starts with a letter and is followed by letters and/or digits where a letter is what Math.js
//          considers to be a letter (see parse.isAlpha() in Math.js), i.e. a Latin letter, an underscore, a dollar
//          sign, a Latin-1 Supplement or Latin Extended letter (U+00C0 to U+02AF), a Greek or Coptic letter (U+0370 to
//          U+03FF), a letterlike symbol (U+2100 to U+214F), or a mathematical alphanumeric symbol (U+1D400 to U+1D7FF,
//          i.e. a surrogate pair, since we don't use the u flag).

const NUMBER_OR_IDENTIFIER_REGEX =
  /((?:\d+(?:\.(?![*/^]))?\d*|\.\d+)(?:[eE][+-]?\d+)?)|((?:[A-Za-z_$\u00C0-\u02AF\u0370-\u03FF\u2100-\u214F]|\uD835[\uDC00-\uDFFF])(?:[A-Za-z0-9_$\u00C0-\u02AF\u0370-\u03FF\u2100-\u214F]|\uD835[\uDC00-\uDFFF])*)/g;

// A helper function to retrieve the identifiers (i.e. variables, functions, and constants) used in an expression.

export const expressionIdentifiers = (expression: string): string[] => {
  const res: string[] = [];

  for (const match of expression.matchAll(NUMBER_OR_IDENTIFIER_REGEX)) {
    if (match[2]) {
      res.push(match[2]);
    }
  }

  return res;
};

// The functions and constants that can be used in an expression.

const ALLOWED_FUNCTIONS = new Set([
  // Note: this list must be kept in sync with the functions imported into Math.js in sharedMathJs(), as well as some
  //       constants.

  'add',
  'subtract',
  'multiply',
  'divide',
  'pow',
  'mod',
  'unaryMinus',
  'sqrt',
  'abs',
  'exp',
  'log',
  'log10',
  'ceil',
  'floor',
  'min',
  'max',
  'sin',
  'cos',
  'tan',
  'sec',
  'csc',
  'cot',
  'sinh',
  'cosh',
  'tanh',
  'sech',
  'csch',
  'coth',
  'asin',
  'acos',
  'atan',
  'asec',
  'acsc',
  'acot',
  'asinh',
  'acosh',
  'atanh',
  'asech',
  'acsch',
  'acoth',
  'true',
  'false',
  'e',
  'pi'
]);

// Our Math.js instance.
// Note: creating a Math.js instance is expensive, so we create it once and share it between all our Float64ArrayMath
//       objects. Also, we create it lazily since Math.js is loaded asynchronously (see dependencies.ts).

let mathJs: IMathJsLike | null = null;

const sharedMathJs = (): IMathJsLike => {
  if (mathJs) {
    return mathJs;
  }

  // Note: we only keep track of our Math.js instance once it has been fully set up.

  const res: IMathJsLike = dependencies._mathJs.create(dependencies._mathJs.all, {});

  res.import(
    // Note: everything is inlined to keep call sites monomorphic and let V8 emit optimal machine code.

    {
      // Core arithmetic operators.

      add: (a: MathJsValue, b: MathJsValue): MathJsValue => {
        if (typeof a === 'number') {
          if (typeof b === 'number') {
            return a + b;
          }

          const len = b.length;
          const res = new Float64Array(len);

          for (let i = 0; i < len; ++i) {
            res[i] = a + b[i];
          }

          return res;
        }

        const len = a.length;
        const res = new Float64Array(len);

        if (typeof b === 'number') {
          for (let i = 0; i < len; ++i) {
            res[i] = a[i] + b;
          }
        } else {
          for (let i = 0; i < len; ++i) {
            res[i] = a[i] + b[i];
          }
        }

        return res;
      },

      subtract: (a: MathJsValue, b: MathJsValue): MathJsValue => {
        if (typeof a === 'number') {
          if (typeof b === 'number') {
            return a - b;
          }

          const len = b.length;
          const res = new Float64Array(len);

          for (let i = 0; i < len; ++i) {
            res[i] = a - b[i];
          }

          return res;
        }

        const len = a.length;
        const res = new Float64Array(len);

        if (typeof b === 'number') {
          for (let i = 0; i < len; ++i) {
            res[i] = a[i] - b;
          }
        } else {
          for (let i = 0; i < len; ++i) {
            res[i] = a[i] - b[i];
          }
        }

        return res;
      },

      multiply: (a: MathJsValue, b: MathJsValue): MathJsValue => {
        if (typeof a === 'number') {
          if (typeof b === 'number') {
            return a * b;
          }

          const len = b.length;
          const res = new Float64Array(len);

          for (let i = 0; i < len; ++i) {
            res[i] = a * b[i];
          }

          return res;
        }
        const len = a.length;
        const res = new Float64Array(len);

        if (typeof b === 'number') {
          for (let i = 0; i < len; ++i) {
            res[i] = a[i] * b;
          }
        } else {
          for (let i = 0; i < len; ++i) {
            res[i] = a[i] * b[i];
          }
        }

        return res;
      },

      divide: (a: MathJsValue, b: MathJsValue): MathJsValue => {
        if (typeof a === 'number') {
          if (typeof b === 'number') {
            return a / b;
          }

          const len = b.length;
          const res = new Float64Array(len);

          for (let i = 0; i < len; ++i) {
            res[i] = a / b[i];
          }

          return res;
        }

        const len = a.length;
        const res = new Float64Array(len);

        if (typeof b === 'number') {
          for (let i = 0; i < len; ++i) {
            res[i] = a[i] / b;
          }
        } else {
          for (let i = 0; i < len; ++i) {
            res[i] = a[i] / b[i];
          }
        }

        return res;
      },

      pow: (a: MathJsValue, b: MathJsValue): MathJsValue => {
        if (typeof a === 'number') {
          if (typeof b === 'number') {
            return a ** b;
          }

          const len = b.length;
          const res = new Float64Array(len);

          for (let i = 0; i < len; ++i) {
            res[i] = a ** b[i];
          }

          return res;
        }

        const len = a.length;
        const res = new Float64Array(len);

        if (typeof b === 'number') {
          for (let i = 0; i < len; ++i) {
            res[i] = a[i] ** b;
          }
        } else {
          for (let i = 0; i < len; ++i) {
            res[i] = a[i] ** b[i];
          }
        }
        return res;
      },

      mod: (a: MathJsValue, b: MathJsValue): MathJsValue => {
        if (typeof a === 'number') {
          if (typeof b === 'number') {
            return a % b;
          }

          const len = b.length;
          const res = new Float64Array(len);

          for (let i = 0; i < len; ++i) {
            res[i] = a % b[i];
          }

          return res;
        }

        const len = a.length;
        const res = new Float64Array(len);

        if (typeof b === 'number') {
          for (let i = 0; i < len; ++i) {
            res[i] = a[i] % b;
          }
        } else {
          for (let i = 0; i < len; ++i) {
            res[i] = a[i] % b[i];
          }
        }

        return res;
      },

      unaryMinus: (x: MathJsValue): MathJsValue => {
        if (typeof x === 'number') {
          return -x;
        }

        const len = x.length;
        const res = new Float64Array(len);

        for (let i = 0; i < len; ++i) {
          res[i] = -x[i];
        }

        return res;
      },

      // Math functions.

      sqrt: (x: MathJsValue): MathJsValue => {
        if (typeof x === 'number') {
          return Math.sqrt(x);
        }

        const len = x.length;
        const res = new Float64Array(len);

        for (let i = 0; i < len; ++i) {
          res[i] = Math.sqrt(x[i]);
        }

        return res;
      },

      abs: (x: MathJsValue): MathJsValue => {
        if (typeof x === 'number') {
          return Math.abs(x);
        }

        const len = x.length;
        const res = new Float64Array(len);

        for (let i = 0; i < len; ++i) {
          res[i] = Math.abs(x[i]);
        }

        return res;
      },

      exp: (x: MathJsValue): MathJsValue => {
        if (typeof x === 'number') {
          return Math.exp(x);
        }

        const len = x.length;
        const res = new Float64Array(len);

        for (let i = 0; i < len; ++i) {
          res[i] = Math.exp(x[i]);
        }

        return res;
      },

      log: (x: MathJsValue): MathJsValue => {
        if (typeof x === 'number') {
          return Math.log(x);
        }

        const len = x.length;
        const res = new Float64Array(len);

        for (let i = 0; i < len; ++i) {
          res[i] = Math.log(x[i]);
        }

        return res;
      },

      log10: (x: MathJsValue): MathJsValue => {
        if (typeof x === 'number') {
          return Math.log10(x);
        }

        const len = x.length;
        const res = new Float64Array(len);

        for (let i = 0; i < len; ++i) {
          res[i] = Math.log10(x[i]);
        }

        return res;
      },

      ceil: (x: MathJsValue): MathJsValue => {
        if (typeof x === 'number') {
          return Math.ceil(x);
        }

        const len = x.length;
        const res = new Float64Array(len);

        for (let i = 0; i < len; ++i) {
          res[i] = Math.ceil(x[i]);
        }

        return res;
      },

      floor: (x: MathJsValue): MathJsValue => {
        if (typeof x === 'number') {
          return Math.floor(x);
        }

        const len = x.length;
        const res = new Float64Array(len);

        for (let i = 0; i < len; ++i) {
          res[i] = Math.floor(x[i]);
        }

        return res;
      },

      min: (a: MathJsValue, b: MathJsValue): MathJsValue => {
        if (typeof a === 'number') {
          if (typeof b === 'number') {
            return Math.min(a, b);
          }

          const len = b.length;
          const res = new Float64Array(len);

          for (let i = 0; i < len; ++i) {
            res[i] = Math.min(a, b[i]);
          }

          return res;
        }

        const len = a.length;
        const res = new Float64Array(len);

        if (typeof b === 'number') {
          for (let i = 0; i < len; ++i) {
            res[i] = Math.min(a[i], b);
          }
        } else {
          for (let i = 0; i < len; ++i) {
            res[i] = Math.min(a[i], b[i]);
          }
        }

        return res;
      },

      max: (a: MathJsValue, b: MathJsValue): MathJsValue => {
        if (typeof a === 'number') {
          if (typeof b === 'number') {
            return Math.max(a, b);
          }

          const len = b.length;
          const res = new Float64Array(len);

          for (let i = 0; i < len; ++i) {
            res[i] = Math.max(a, b[i]);
          }

          return res;
        }

        const len = a.length;
        const res = new Float64Array(len);

        if (typeof b === 'number') {
          for (let i = 0; i < len; ++i) {
            res[i] = Math.max(a[i], b);
          }
        } else {
          for (let i = 0; i < len; ++i) {
            res[i] = Math.max(a[i], b[i]);
          }
        }

        return res;
      },

      // Trigonometric functions.

      sin: (x: MathJsValue): MathJsValue => {
        if (typeof x === 'number') {
          return Math.sin(x);
        }

        const len = x.length;
        const res = new Float64Array(len);

        for (let i = 0; i < len; ++i) {
          res[i] = Math.sin(x[i]);
        }

        return res;
      },

      cos: (x: MathJsValue): MathJsValue => {
        if (typeof x === 'number') {
          return Math.cos(x);
        }

        const len = x.length;
        const res = new Float64Array(len);

        for (let i = 0; i < len; ++i) {
          res[i] = Math.cos(x[i]);
        }

        return res;
      },

      tan: (x: MathJsValue): MathJsValue => {
        if (typeof x === 'number') {
          return Math.tan(x);
        }

        const len = x.length;
        const res = new Float64Array(len);

        for (let i = 0; i < len; ++i) {
          res[i] = Math.tan(x[i]);
        }

        return res;
      },

      sec: (x: MathJsValue): MathJsValue => {
        if (typeof x === 'number') {
          return 1 / Math.cos(x);
        }

        const len = x.length;
        const res = new Float64Array(len);

        for (let i = 0; i < len; ++i) {
          res[i] = 1 / Math.cos(x[i]);
        }

        return res;
      },

      csc: (x: MathJsValue): MathJsValue => {
        if (typeof x === 'number') {
          return 1 / Math.sin(x);
        }

        const len = x.length;
        const res = new Float64Array(len);

        for (let i = 0; i < len; ++i) {
          res[i] = 1 / Math.sin(x[i]);
        }

        return res;
      },

      cot: (x: MathJsValue): MathJsValue => {
        if (typeof x === 'number') {
          return 1 / Math.tan(x);
        }

        const len = x.length;
        const res = new Float64Array(len);

        for (let i = 0; i < len; ++i) {
          res[i] = 1 / Math.tan(x[i]);
        }

        return res;
      },

      sinh: (x: MathJsValue): MathJsValue => {
        if (typeof x === 'number') {
          return Math.sinh(x);
        }

        const len = x.length;
        const res = new Float64Array(len);

        for (let i = 0; i < len; ++i) {
          res[i] = Math.sinh(x[i]);
        }

        return res;
      },

      cosh: (x: MathJsValue): MathJsValue => {
        if (typeof x === 'number') {
          return Math.cosh(x);
        }

        const len = x.length;
        const res = new Float64Array(len);

        for (let i = 0; i < len; ++i) {
          res[i] = Math.cosh(x[i]);
        }

        return res;
      },

      tanh: (x: MathJsValue): MathJsValue => {
        if (typeof x === 'number') {
          return Math.tanh(x);
        }

        const len = x.length;
        const res = new Float64Array(len);

        for (let i = 0; i < len; ++i) {
          res[i] = Math.tanh(x[i]);
        }

        return res;
      },

      sech: (x: MathJsValue): MathJsValue => {
        if (typeof x === 'number') {
          return 1 / Math.cosh(x);
        }

        const len = x.length;
        const res = new Float64Array(len);

        for (let i = 0; i < len; ++i) {
          res[i] = 1 / Math.cosh(x[i]);
        }

        return res;
      },

      csch: (x: MathJsValue): MathJsValue => {
        if (typeof x === 'number') {
          return 1 / Math.sinh(x);
        }

        const len = x.length;
        const res = new Float64Array(len);

        for (let i = 0; i < len; ++i) {
          res[i] = 1 / Math.sinh(x[i]);
        }

        return res;
      },

      coth: (x: MathJsValue): MathJsValue => {
        if (typeof x === 'number') {
          return 1 / Math.tanh(x);
        }

        const len = x.length;
        const res = new Float64Array(len);

        for (let i = 0; i < len; ++i) {
          res[i] = 1 / Math.tanh(x[i]);
        }

        return res;
      },

      asin: (x: MathJsValue): MathJsValue => {
        if (typeof x === 'number') {
          return Math.asin(x);
        }

        const len = x.length;
        const res = new Float64Array(len);

        for (let i = 0; i < len; ++i) {
          res[i] = Math.asin(x[i]);
        }

        return res;
      },

      acos: (x: MathJsValue): MathJsValue => {
        if (typeof x === 'number') {
          return Math.acos(x);
        }

        const len = x.length;
        const res = new Float64Array(len);

        for (let i = 0; i < len; ++i) {
          res[i] = Math.acos(x[i]);
        }

        return res;
      },

      atan: (x: MathJsValue): MathJsValue => {
        if (typeof x === 'number') {
          return Math.atan(x);
        }

        const len = x.length;
        const res = new Float64Array(len);

        for (let i = 0; i < len; ++i) {
          res[i] = Math.atan(x[i]);
        }

        return res;
      },

      asec: (x: MathJsValue): MathJsValue => {
        if (typeof x === 'number') {
          return Math.acos(1 / x);
        }

        const len = x.length;
        const res = new Float64Array(len);

        for (let i = 0; i < len; ++i) {
          res[i] = Math.acos(1 / x[i]);
        }

        return res;
      },

      acsc: (x: MathJsValue): MathJsValue => {
        if (typeof x === 'number') {
          return Math.asin(1 / x);
        }

        const len = x.length;
        const res = new Float64Array(len);

        for (let i = 0; i < len; ++i) {
          res[i] = Math.asin(1 / x[i]);
        }

        return res;
      },

      acot: (x: MathJsValue): MathJsValue => {
        if (typeof x === 'number') {
          return Math.atan(1 / x);
        }

        const len = x.length;
        const res = new Float64Array(len);

        for (let i = 0; i < len; ++i) {
          res[i] = Math.atan(1 / x[i]);
        }

        return res;
      },

      asinh: (x: MathJsValue): MathJsValue => {
        if (typeof x === 'number') {
          return Math.asinh(x);
        }

        const len = x.length;
        const res = new Float64Array(len);

        for (let i = 0; i < len; ++i) {
          res[i] = Math.asinh(x[i]);
        }

        return res;
      },

      acosh: (x: MathJsValue): MathJsValue => {
        if (typeof x === 'number') {
          return Math.acosh(x);
        }

        const len = x.length;
        const res = new Float64Array(len);

        for (let i = 0; i < len; ++i) {
          res[i] = Math.acosh(x[i]);
        }

        return res;
      },

      atanh: (x: MathJsValue): MathJsValue => {
        if (typeof x === 'number') {
          return Math.atanh(x);
        }

        const len = x.length;
        const res = new Float64Array(len);

        for (let i = 0; i < len; ++i) {
          res[i] = Math.atanh(x[i]);
        }

        return res;
      },

      asech: (x: MathJsValue): MathJsValue => {
        if (typeof x === 'number') {
          return Math.acosh(1 / x);
        }

        const len = x.length;
        const res = new Float64Array(len);

        for (let i = 0; i < len; ++i) {
          res[i] = Math.acosh(1 / x[i]);
        }

        return res;
      },

      acsch: (x: MathJsValue): MathJsValue => {
        if (typeof x === 'number') {
          return Math.asinh(1 / x);
        }

        const len = x.length;
        const res = new Float64Array(len);

        for (let i = 0; i < len; ++i) {
          res[i] = Math.asinh(1 / x[i]);
        }

        return res;
      },

      acoth: (x: MathJsValue): MathJsValue => {
        if (typeof x === 'number') {
          return Math.atanh(1 / x);
        }

        const len = x.length;
        const res = new Float64Array(len);

        for (let i = 0; i < len; ++i) {
          res[i] = Math.atanh(1 / x[i]);
        }

        return res;
      }
    },
    { override: true }
  );

  mathJs = res;

  return res;
};

export class Float64ArrayMath {
  private readonly math = sharedMathJs();
  private readonly compiledExpressions = new Map<string, ICompiledExpression>();
  private readonly validatedTokens = new Map<string, true>();

  // Reset both the compiled expressions and the token validation cache.

  resetCompiledExpressions(): void {
    this.compiledExpressions.clear();
    this.validatedTokens.clear();
  }

  // A method to compile expressions, normalising element-wise operators so that `.*`, `./`, and `.^` behave like `*`,
  // `/`, and `^`.

  private normaliseExpression(expression: string): string {
    return expression.replace(ELEMENTWISE_REGEX, '$1');
  }

  compile(expression: string): ICompiledExpression {
    const normalisedExpression = this.normaliseExpression(expression);

    let res = this.compiledExpressions.get(normalisedExpression);

    if (!res) {
      res = this.math.compile(normalisedExpression);

      this.compiledExpressions.set(normalisedExpression, res);
    }

    return res;
  }

  // A method to evaluate expressions with a scope, using the cached compiled expressions.
  // Note: this can return a boolean (when we want to determine whether an input widget is to be shown/hidden), but to
  //       keep the implementation of the math functions as simple as possible, booleans are not part of MathJsValue
  //       (which is used for function arguments and scopes), but are included in the dedicated MathJsResult type which
  //       is used for expression results.

  evaluate(expression: string, scope: ExpressionScope): MathJsResult {
    // If this expression has already been validated and its scope-allowed variables haven't changed, skip token
    // scanning entirely.

    const normalisedExpression = this.normaliseExpression(expression);

    if (!this.validatedTokens.has(normalisedExpression)) {
      const tokens = expressionIdentifiers(expression);
      const allowedVariables = new Set(Object.keys(scope));
      const seenTokens = new Set<string>();

      for (const token of tokens) {
        if (seenTokens.has(token)) {
          continue;
        }

        seenTokens.add(token);

        if (!allowedVariables.has(token) && !ALLOWED_FUNCTIONS.has(token)) {
          throw new MathError(expression, `Unknown symbol ${token}.`);
        }
      }

      this.validatedTokens.set(normalisedExpression, true);
    }

    return this.compile(expression).evaluate(scope);
  }
}
