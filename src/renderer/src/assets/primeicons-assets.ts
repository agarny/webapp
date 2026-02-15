// Import the PrimeIcons file that we need, so Vite resolves it correctly in both dev and production modes, then inject
// a @font-face rule.

import woff2 from 'primeicons/fonts/primeicons.woff2';

const css = `@font-face {
  font-family: 'primeicons';
  font-display: swap;
  src: url('${woff2}') format('woff2');
  font-weight: normal;
  font-style: normal;
}

.pi {
  font-family: 'primeicons';
}
`;

const existingStyle = document.head.querySelector('style[primeicons-css="injected"]');

if (!existingStyle) {
  const style = document.createElement('style');

  style.setAttribute('primeicons-css', 'injected');
  style.textContent = css;

  document.head.appendChild(style);
}
