import type { ToastMessageOptions } from 'primevue/toast';
import * as vue from 'vue';

type OpenCORAddToast = (options: ToastMessageOptions) => void;

const OpenCORToastKey = Symbol('OpenCORToast');

export const provideOpenCORToast = (addToast: OpenCORAddToast): void => {
  vue.provide(OpenCORToastKey, addToast);
};

export const useOpenCORToast = (): OpenCORAddToast => {
  const addToast = vue.inject<OpenCORAddToast | undefined>(OpenCORToastKey, undefined);

  if (!addToast) {
    throw new Error(
      'useOpenCORToast() must be called within a component that has provideOpenCORToast() in its ancestor tree.'
    );
  }

  return addToast;
};
