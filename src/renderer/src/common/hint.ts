import type * as vue from 'vue';

import { HINT_DELAY } from './constants';

// A directive that shows a hint for an element (e.g., v-hint="'Close'"), i.e. a replacement for the native tooltip of
// an element (which we can't style and which is shown after a long delay), which looks like the tooltip of our toolbar
// buttons (see ToolbarButtonWidget.vue).
// Note #1: our hint is shown, without any animation, after a short delay when our element is hovered, and straightaway
//          when our element is focused using the keyboard. It is hidden as soon as our element is left, pressed, or
//          blurred.
// Note #2: our hint is shown below our element (or above it if there is not enough room below it) and is kept within
//          the window. It has a fixed position and is appended to our OpenCOR instance (rather than to our element) so
//          that it doesn't get clipped by an ancestor of our element (e.g., a scroll panel), while still being styled
//          like the rest of our OpenCOR instance (see .opencor-hint in app.css).
// Note #3: only one hint is shown at any given time.
// Note #4: like a native tooltip, our hint isn't shown for an element that ignores pointer events (e.g., the reset
//          button of one of our input widgets when it is disabled).
// Note #5: our hint can contain some HTML (e.g., v-hint.html="'<em>Some</em> help'"), in which case it is a "rich" hint
//          (e.g., some help about an input field or a table of values). A rich hint is wider and, unlike a plain hint,
//          it isn't hidden when our element is pressed (so that, for instance, some help about an input field remains
//          visible while the user types in it).

const HINT_OFFSET = 6; // Distance between our element and our hint.
const HINT_MARGIN = 4; // Minimum distance between our hint and the edges of the window.

interface IHintState {
  text: string;
  html: boolean;
  timer: number | undefined;
  onPointerEnter: () => void;
  onFocus: () => void;
  onHide: () => void;
}

const states = new WeakMap<HTMLElement, IHintState>();

let hintElement: HTMLElement | null = null;
let hintOwner: HTMLElement | null = null;

// The text of our hint as it is displayed.
// Note: our hint may be the path or URL of a file, so we let it break after a path separator (by inserting a zero-width
//       space after it), so that it doesn't get broken in the middle of a file name, if possible.

const displayedText = (text: string): string => {
  return text.replace(/[/\\]/g, '$&\u200b');
};

const hideHint = (): void => {
  hintElement?.remove();

  hintElement = null;
  hintOwner = null;
};

const showHint = (element: HTMLElement, text: string, html: boolean): void => {
  // Make sure that we have something to show and that our element is still in the DOM.

  hideHint();

  if (!text || !element.isConnected) {
    return;
  }

  // Create our hint and position it.

  hintElement = document.createElement('div');

  if (html) {
    hintElement.className = 'opencor-hint opencor-hint-rich';
    hintElement.innerHTML = text;
  } else {
    hintElement.className = 'opencor-hint';
    hintElement.textContent = displayedText(text);
  }

  (element.closest('.opencor') ?? document.body).appendChild(hintElement);

  hintOwner = element;

  const elementRect = element.getBoundingClientRect();
  const hintRect = hintElement.getBoundingClientRect();
  let left = elementRect.left;
  let top = elementRect.bottom + HINT_OFFSET;

  if (left + hintRect.width > window.innerWidth - HINT_MARGIN) {
    left = window.innerWidth - HINT_MARGIN - hintRect.width;
  }

  if (top + hintRect.height > window.innerHeight - HINT_MARGIN) {
    top = elementRect.top - HINT_OFFSET - hintRect.height;
  }

  hintElement.style.left = `${Math.max(left, HINT_MARGIN)}px`;
  hintElement.style.top = `${Math.max(top, HINT_MARGIN)}px`;
};

export const vHint: vue.Directive<HTMLElement, string | undefined> = {
  mounted(element, binding) {
    const state: IHintState = {
      text: binding.value ?? '',
      html: !!binding.modifiers.html,
      timer: undefined,
      onPointerEnter: () => {
        window.clearTimeout(state.timer);

        state.timer = window.setTimeout(() => {
          showHint(element, state.text, state.html);
        }, HINT_DELAY);
      },
      onFocus: () => {
        if (element.matches(':focus-visible')) {
          window.clearTimeout(state.timer);

          showHint(element, state.text, state.html);
        }
      },
      onHide: () => {
        window.clearTimeout(state.timer);

        if (hintOwner === element) {
          hideHint();
        }
      }
    };

    states.set(element, state);

    element.addEventListener('pointerenter', state.onPointerEnter);
    element.addEventListener('pointerleave', state.onHide);

    if (!state.html) {
      element.addEventListener('pointerdown', state.onHide);
    }

    element.addEventListener('focus', state.onFocus);
    element.addEventListener('blur', state.onHide);
  },
  updated(element, binding) {
    const state = states.get(element);

    if (state) {
      state.text = binding.value ?? '';

      if (hintOwner === element && hintElement) {
        if (state.text && state.html) {
          hintElement.innerHTML = state.text;
        } else if (state.text) {
          hintElement.textContent = displayedText(state.text);
        } else {
          hideHint();
        }
      }
    }
  },
  beforeUnmount(element) {
    const state = states.get(element);

    if (state) {
      state.onHide();

      element.removeEventListener('pointerenter', state.onPointerEnter);
      element.removeEventListener('pointerleave', state.onHide);
      element.removeEventListener('pointerdown', state.onHide);
      element.removeEventListener('focus', state.onFocus);
      element.removeEventListener('blur', state.onHide);

      states.delete(element);
    }
  }
};
