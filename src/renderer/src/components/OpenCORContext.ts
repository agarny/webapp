import * as vueusecore from '@vueuse/core';

import * as vue from 'vue';

import * as common from '../common/common';

// Context of an instance of OpenCOR, i.e. the information that its components need to know about it.
// Note: this uses Vue's provide()/inject() methods to ensure that each OpenCOR instance has its own context and that we
//       don't have to pass that information down from component to component using props.

export interface OpenCORContext {
  isActiveApp: vue.ComputedRef<boolean>;
  uiEnabled: vue.ComputedRef<boolean>;
  simulationOnly: vue.ComputedRef<boolean>;
  themeCanBeChanged: boolean;
}

const OpenCORContextKey = Symbol('OpenCORContext');

export const provideOpenCORContext = (context: OpenCORContext): void => {
  vue.provide(OpenCORContextKey, context);
};

export const useOpenCORContext = (): OpenCORContext => {
  const context = vue.inject<OpenCORContext | undefined>(OpenCORContextKey, undefined);

  if (!context) {
    throw new Error(
      'useOpenCORContext() must be called within a component that has provideOpenCORContext() in its ancestor tree.'
    );
  }

  return context;
};

// Handle keyboard shortcuts on the desktop, but only if our instance of OpenCOR is active and its UI is enabled.

export const useOpenCORKeyStroke = (handler: (event: KeyboardEvent) => void): void => {
  const { isActiveApp, uiEnabled } = useOpenCORContext();

  if (!common.isDesktop()) {
    return;
  }

  vueusecore.onKeyStroke((event: KeyboardEvent) => {
    if (!isActiveApp.value || !uiEnabled.value) {
      return;
    }

    handler(event);
  });
};
