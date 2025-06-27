export const URI_SCHEME = 'opencor'
export const FULL_URI_SCHEME = `${URI_SCHEME}://`

export const SHORT_DELAY = 69
export const MEDIUM_DELAY = 169
export const LONG_DELAY = 369

export const TOAST_LIFE = 3000

const currentYear = new Date().getFullYear()

export const COPYRIGHT = currentYear === 2025 ? '2025' : `2025-${currentYear.toString()}`
