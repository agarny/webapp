const importMetaEnv = (import.meta as unknown as { env: Record<string, string | undefined> }).env;
const firebaseConfig = {
  apiKey: importMetaEnv.VITE_FIREBASE_API_KEY,
  authDomain: 'opencorapp.firebaseapp.com',
  projectId: 'opencorapp',
  storageBucket: 'opencorapp.appspot.com',
  messagingSenderId: importMetaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: importMetaEnv.VITE_FIREBASE_APP_ID,
  measurementId: importMetaEnv.VITE_FIREBASE_MEASUREMENT_ID
};

const firebaseEnvVarMap = {
  apiKey: 'VITE_FIREBASE_API_KEY',
  messagingSenderId: 'VITE_FIREBASE_MESSAGING_SENDER_ID',
  appId: 'VITE_FIREBASE_APP_ID',
  measurementId: 'VITE_FIREBASE_MEASUREMENT_ID'
} as const;

export const missingFirebaseKeys = (): string[] => {
  const missingFirebaseKey = (firebaseValue: unknown): boolean => {
    return !firebaseValue;
  };

  return (Object.entries(firebaseEnvVarMap) as Array<[keyof typeof firebaseEnvVarMap, string]>)
    .filter(([prop]) => missingFirebaseKey((firebaseConfig as Record<string, unknown>)[prop as string]))
    .map(([, envName]) => envName);
};

interface IFirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId: string;
}

export default missingFirebaseKeys().length === 0 ? (firebaseConfig as IFirebaseConfig) : undefined;
