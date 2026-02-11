import { AsyncEntry } from '@napi-rs/keyring';

import electron from 'electron';

export const clearGitHubCache = async (): Promise<void> => {
  await Promise.all(
    ['https://github.com', 'https://api.github.com', 'https://opencorapp.firebaseapp.com'].map(async (origin) => {
      try {
        await electron.session.defaultSession.clearStorageData({ origin });
      } catch (error: unknown) {
        console.warn(`Failed to clear storage data for ${origin}:`, error);
      }
    })
  );
};

let storeAvailable = true;

const gitHubAccessTokenError = (operation: string, error: unknown): void => {
  if (storeAvailable) {
    console.warn(
      `Failed to ${operation} the GitHub access token using the system credential store. Subsequent attempts will be skipped.`,
      error
    );
  }

  storeAvailable = false;
};

const gitHubAccessTokenEntry = (): AsyncEntry | null => {
  if (!storeAvailable) {
    return null;
  }

  try {
    return new AsyncEntry('OpenCOR', 'GitHub access token');
  } catch (error: unknown) {
    gitHubAccessTokenError('initialise', error);

    return null;
  }
};

export const deleteGitHubAccessToken = async (): Promise<boolean> => {
  const entry = gitHubAccessTokenEntry();

  if (!entry) {
    return false;
  }

  try {
    return await entry.deleteCredential();
  } catch (error: unknown) {
    gitHubAccessTokenError('delete', error);

    return false;
  }
};

export const loadGitHubAccessToken = async (): Promise<string | null> => {
  const entry = gitHubAccessTokenEntry();

  if (!entry) {
    return null;
  }

  try {
    const password = await entry.getPassword();

    return password ?? null;
  } catch (error: unknown) {
    gitHubAccessTokenError('load', error);

    return null;
  }
};

export const saveGitHubAccessToken = async (token: string): Promise<boolean> => {
  if (!token.trim()) {
    console.warn('Ignoring request to store an empty GitHub access token.');

    return false;
  }

  const entry = gitHubAccessTokenEntry();

  if (!entry) {
    return false;
  }

  try {
    await entry.setPassword(token);

    return true;
  } catch (error: unknown) {
    gitHubAccessTokenError('store', error);

    return false;
  }
};
