import { electronApi } from '../common/electronApi.ts';

import { _cppLocApi, _wasmLocApi } from './locApi.ts';

// Some general methods.

export const cppVersion = (): boolean => {
  return electronApi !== undefined;
};

export const wasmVersion = (): boolean => {
  return !cppVersion();
};

export const version = (): string => {
  return cppVersion() ? _cppLocApi.version() : _wasmLocApi.versionString();
};
