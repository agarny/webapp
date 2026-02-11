export const URI_SCHEME: string = 'opencor';
export const FULL_URI_SCHEME: string = `${URI_SCHEME}://`;

export const NO_DELAY: number = 0;
export const SHORT_DELAY: number = 69;
export const MEDIUM_DELAY: number = 169;
export const LONG_DELAY: number = 369;

export const TOAST_LIFE: number = 3000;

const crtYear: number = new Date().getFullYear();

export const COPYRIGHT: string = crtYear === 2025 ? '2025' : `2025-${String(crtYear)}`;
