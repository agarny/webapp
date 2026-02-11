import electron from 'electron';

export const isPackaged = (): boolean => {
  return electron.app.isPackaged;
};

export const isWindows = (): boolean => {
  return process.platform === 'win32';
};

export const isLinux = (): boolean => {
  return process.platform === 'linux';
};

export const isMacOs = (): boolean => {
  return process.platform === 'darwin';
};
