import libOpenCOR from 'libopencor'

interface LOCAPI {
  // Note: src/preload/index.ts needs to be in sync with this file.

  versionString: () => string
}

// @ts-expect-error (window.locAPI may or not be defined and that is why we test it)
const winLocAPI = window.locAPI ?? undefined
const locAPI: LOCAPI = winLocAPI ?? (await libOpenCOR())
const cppLocAPI = !!winLocAPI

export function version() {
  return locAPI.versionString() + (cppLocAPI ? ' (compiled or interpreted)' : ' (interpreted)')
}
