<template>
  <div class="wheel relative shrink-0 overflow-hidden select-none"
    :class="{ 'wheel-disabled': props.disabled, 'wheel-dragging': dragging }"
    :style="{ width: `${WHEEL_WIDTH}px`, height: `${WHEEL_HEIGHT}px` }"
    role="slider"
    :tabindex="props.disabled ? undefined : 0"
    :aria-label="props.ariaLabel"
    :aria-valuemin="0"
    :aria-valuemax="valueMax"
    :aria-valuenow="Math.round(valueMax * position)"
    :aria-valuetext="props.ariaValueText"
    :aria-disabled="props.disabled || undefined"
    aria-orientation="horizontal"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
    @lostpointercapture="onPointerUp"
    @wheel="onWheel"
    @keydown="onKeyDown"
    @dblclick="onDoubleClick"
  >
    <svg class="wheel-scale absolute inset-0 w-full h-full" :viewBox="`0 0 ${INNER_WIDTH} ${INNER_HEIGHT}`" aria-hidden="true">
      <g class="wheel-ticks">
        <line v-for="tick in ticks" :key="tick.index"
          :class="{ 'wheel-tick-major': tick.major, 'wheel-tick-end': tick.end }"
          :x1="tick.x" :y1="TICKS_MIDDLE - tick.halfLength" :x2="tick.x" :y2="TICKS_MIDDLE + tick.halfLength"
        />
      </g>
      <rect class="wheel-marker"
        :x="WHEEL_RADIUS - 0.5 * MARKER_WIDTH" :y="MARKER_TOP"
        :width="MARKER_WIDTH" :height="MARKER_BOTTOM - MARKER_TOP"
        :rx="0.5 * MARKER_WIDTH"
      />
    </svg>
    <div class="wheel-position absolute overflow-hidden" aria-hidden="true">
      <div class="wheel-position-fill h-full" :style="{ width: `${100 * displayedPosition}%` }"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
// A horizontal wheel (like a thumbwheel or a jog wheel), which can be used to set a value, i.e. a position between 0
// (start of our wheel) and 1 (end of our wheel), which can then be mapped to whatever is needed (e.g., a delay that
// grows exponentially, see SimulationExperimentStandardView.vue).
// Note #1: our wheel looks like a PrimeVue form field (i.e. it uses the same design tokens, e.g., for its background,
//          border, and shadow, as well as those of a PrimeVue slider for its position bar). It is drawn as a ruler
//          dial, i.e. as a scale on a cylinder seen from above (so its ticks get closer to one another and fade out
//          towards the sides of our wheel), with a marker in the middle of our wheel. Our scale goes from left to right
//          (like our position bar) and has a tick for each of our steps (if any, see Note #3), so that our marker is
//          always on a tick, with a longer tick for each major step (if any, every few steps otherwise) and a stop tick
//          at each end of our scale. Nothing is drawn beyond our stop ticks, so that one side of our wheel is empty
//          when we are at the start or end of our wheel. Our scale follows the mouse pointer when our wheel is dragged
//          (in the middle of our wheel), like the surface of a physical wheel, i.e. dragging our wheel left brings the
//          ticks on the right (i.e. higher values) under our marker, and dragging it right those on the left (i.e.
//          lower values).
// Note #2: our position can be changed by dragging our wheel left/right, by scrolling it (sideways or up/down), using
//          the keyboard (arrow, Page Up/Down, Home, and End keys), and reset by double-clicking our wheel.
// Note #3: our wheel can have a number of steps, in which case our position snaps to multiples of 1/steps (e.g., to
//          map our position to a list of values, see SimulationExperimentStandardView.vue), our arrow keys move it by
//          one step, and our Page Up/Down keys by several steps. Our wheel still rotates in steps, but dragging and
//          scrolling it are accumulated (in rawPosition), so that small drags and scrolls eventually move it by a step.
// Note #4: our wheel turns smoothly to its new position (e.g., from one step to the next), unless reduced motion is
//          requested, in which case it gets there straightaway.
// Note #5: our wheel is exposed to assistive technologies as a slider, the value of which is our position as a
//          percentage (or as a number of steps, if any), unless some value text is provided (e.g., "1 ms"), in which
//          case that is what gets announced.

import * as vue from 'vue';

import type { IWheelProps } from '../../common/vueCommon';

const props = defineProps<IWheelProps>();

const WHEEL_WIDTH = 120;
const WHEEL_HEIGHT = 28;
const BORDER_WIDTH = 1; // Must match the width of our border (see .wheel).
const INNER_WIDTH = WHEEL_WIDTH - 2 * BORDER_WIDTH; // Our ticks and our marker are drawn within our border.
const INNER_HEIGHT = WHEEL_HEIGHT - 2 * BORDER_WIDTH;
const WHEEL_RADIUS = 0.5 * INNER_WIDTH;
const TICK_SPACING = 10; // Ideal spacing between two ticks, in degrees.
const MAJOR_TICK_EVERY = 5; // Every how many ticks there is a major tick, if no major steps are given.
const POSITION_AREA_HEIGHT = 7; // Height of our position bar and of the space below it (see .wheel-position).
const MARKER_GAP = 2; // Space between our marker and our position bar.
const MARKER_WIDTH = 2;
const MARKER_TOP = 2;
const MARKER_BOTTOM = INNER_HEIGHT - POSITION_AREA_HEIGHT - MARKER_GAP;
const TICKS_MIDDLE = 0.5 * (MARKER_TOP + MARKER_BOTTOM); // Vertical middle of our ticks (and of our marker).
const END_TICK_WIDTH = 2; // Must match the stroke width of our stop ticks (see .wheel-tick-end).
const END_TICK_HALF_LENGTH = 0.5 * (MARKER_BOTTOM - MARKER_TOP - END_TICK_WIDTH) - 0.5; // So that our marker covers it.
const MAJOR_TICK_HALF_LENGTH = END_TICK_HALF_LENGTH - 1.5;
const MINOR_TICK_HALF_LENGTH = END_TICK_HALF_LENGTH - 3.5;
const TURN_DURATION = 120; // How long our wheel takes to turn to its new position (in milliseconds).
const DEFAULT_DRAG_RANGE = 2 * WHEEL_WIDTH; // How much our wheel must be dragged to go from one end to the other.
const SCROLL_RANGE = 1500; // How much our wheel must be scrolled (in pixels) to go from one end to the other.
const LINE_HEIGHT = 16; // Height of a line (in pixels), for scrolls that are expressed in lines (e.g., in Firefox).
const KEY_STEP = 0.02;
const PAGE_KEY_STEP = 0.1;

const position = defineModel<number>({ required: true });

// Our number of steps, if any, which must be a whole number that is at least one (e.g., not 0 or 2.5).

const steps = vue.computed<number | undefined>(() => {
  const propsSteps = props.steps;

  return propsSteps !== undefined && Number.isFinite(propsSteps) && propsSteps >= 1
    ? Math.round(propsSteps)
    : undefined;
});

const valueMax = vue.computed<number>(() => steps.value ?? 100);

// Our scale (see Note #1 above), i.e. its number of ticks (minus one), the spacing between two ticks (in degrees), and
// how much our wheel must be dragged (in pixels) to go from one end to the other (i.e. the arc length of our scale).
// Note: without steps, our scale spans DEFAULT_DRAG_RANGE and its ticks are spaced as close to TICK_SPACING as possible
//       while dividing our scale evenly.

const DEGREES_TO_RADIANS = Math.PI / 180;

const scale = vue.computed<{ tickCount: number; tickSpacing: number; dragRange: number }>(() => {
  if (steps.value) {
    return {
      tickCount: steps.value,
      tickSpacing: TICK_SPACING,
      dragRange: steps.value * WHEEL_RADIUS * TICK_SPACING * DEGREES_TO_RADIANS
    };
  }

  const scaleAngle = DEFAULT_DRAG_RANGE / WHEEL_RADIUS / DEGREES_TO_RADIANS;
  const tickCount = Math.max(1, Math.round(scaleAngle / TICK_SPACING));

  return {
    tickCount,
    tickSpacing: scaleAngle / tickCount,
    dragRange: DEFAULT_DRAG_RANGE
  };
});

const snappedPosition = (newPosition: number): number => {
  const clampedPosition = Math.min(Math.max(newPosition, 0), 1);

  return steps.value ? Math.round(clampedPosition * steps.value) / steps.value : clampedPosition;
};

// Our unsnapped position (see Note #3 above), which we resynchronise with our position if the latter was changed by
// someone else (e.g., to reset our wheel).

let rawPosition = position.value;

const currentRawPosition = (): number => {
  if (snappedPosition(rawPosition) !== position.value) {
    rawPosition = position.value;
  }

  return rawPosition;
};

const setPosition = (newPosition: number): void => {
  rawPosition = Math.min(Math.max(newPosition, 0), 1);
  position.value = snappedPosition(rawPosition);
};

// Our displayed position, which follows our position smoothly (see Note #4 above).

const displayedPosition = vue.ref<number>(position.value);
let turnAnimationFrame = 0;

const turnTo = (newPosition: number): void => {
  cancelAnimationFrame(turnAnimationFrame);

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    displayedPosition.value = newPosition;

    return;
  }

  const startPosition = displayedPosition.value;
  const startTime = performance.now();
  const turn = (time: number): void => {
    const progress = Math.min((time - startTime) / TURN_DURATION, 1);
    const easedProgress = 1 - (1 - progress) ** 3; // Ease out.

    displayedPosition.value = startPosition + (newPosition - startPosition) * easedProgress;

    if (progress < 1) {
      turnAnimationFrame = requestAnimationFrame(turn);
    }
  };

  turnAnimationFrame = requestAnimationFrame(turn);
};

vue.watch(position, (newPosition: number) => {
  turnTo(newPosition);
});

vue.onBeforeUnmount(() => {
  cancelAnimationFrame(turnAnimationFrame);
});

// Our ticks (see Note #1 above), i.e. those that are on the visible half of our cylinder.
// Note: a tick is identified by its index on our scale, so that it keeps its identity as our wheel rotates. Our ticks
//       fade out towards the sides of our wheel through a mask (see .wheel-scale).

const ticks = vue.computed<{ index: number; x: number; halfLength: number; major: boolean; end: boolean }[]>(() => {
  const { tickCount, tickSpacing } = scale.value;
  const rotation = displayedPosition.value * tickCount * tickSpacing;
  const firstIndex = Math.max(0, Math.ceil((rotation - 90) / tickSpacing));
  const lastIndex = Math.min(tickCount, Math.floor((rotation + 90) / tickSpacing));
  const res: { index: number; x: number; halfLength: number; major: boolean; end: boolean }[] = [];

  for (let index = firstIndex; index <= lastIndex; ++index) {
    const angle = index * tickSpacing - rotation;
    const end = index === 0 || index === tickCount;
    const major = props.majorSteps ? props.majorSteps.includes(index) : index % MAJOR_TICK_EVERY === 0;

    res.push({
      index,
      x: WHEEL_RADIUS * (1 + Math.sin(angle * DEGREES_TO_RADIANS)),
      halfLength: end ? END_TICK_HALF_LENGTH : major ? MAJOR_TICK_HALF_LENGTH : MINOR_TICK_HALF_LENGTH,
      major,
      end
    });
  }

  return res;
});

// Drag our wheel left/right to increase/decrease our position (see Note #1 above).
// Note: we only track the pointer that started our drag (e.g., so that a second finger on a touch screen doesn't
//       restart our drag), and we stop our drag if we get disabled while being dragged.

let dragPointerId: number | null = null;
let dragStartX = 0;
let dragStartPosition = 0;

const dragging = vue.ref<boolean>(false);

const onPointerDown = (event: PointerEvent): void => {
  if (props.disabled || event.button !== 0 || dragPointerId !== null) {
    return;
  }

  dragPointerId = event.pointerId;
  dragStartX = event.clientX;
  dragStartPosition = position.value;
  dragging.value = true;

  (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
};

const onPointerMove = (event: PointerEvent): void => {
  if (event.pointerId === dragPointerId) {
    setPosition(dragStartPosition - (event.clientX - dragStartX) / scale.value.dragRange);
  }
};

const stopDragging = (): void => {
  dragPointerId = null;
  dragging.value = false;
};

const onPointerUp = (event: PointerEvent): void => {
  if (event.pointerId === dragPointerId) {
    stopDragging();
  }
};

vue.watch(
  () => props.disabled,
  (disabled: boolean | undefined) => {
    if (disabled) {
      stopDragging();
    }
  }
);

// Scroll our wheel (sideways or up/down) to increase/decrease our position.
// Note: a scroll may be expressed in lines (e.g., in Firefox) or in pages rather than in pixels, hence we convert it to
//       pixels. Also, a scroll with the Ctrl key pressed is a zoom (e.g., a pinch on a macOS trackpad), which we leave
//       alone.

const onWheel = (event: WheelEvent): void => {
  if (props.disabled || event.ctrlKey) {
    return;
  }

  event.preventDefault();

  const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : -event.deltaY;
  const pixelDelta =
    event.deltaMode === WheelEvent.DOM_DELTA_LINE
      ? LINE_HEIGHT * delta
      : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
        ? PAGE_KEY_STEP * SCROLL_RANGE * delta
        : delta;

  setPosition(currentRawPosition() + pixelDelta / SCROLL_RANGE);
};

// Use the arrow, Page Up/Down, Home, and End keys to change our position.
// Note: we leave alone those keys when used with the Ctrl, Alt, or Meta key, since they may then be keyboard shortcuts
//       (e.g., Cmd+Left to go back on macOS).

const onKeyDown = (event: KeyboardEvent): void => {
  if (props.disabled || event.altKey || event.ctrlKey || event.metaKey) {
    return;
  }

  const keyStep = steps.value ? 1 / steps.value : KEY_STEP;
  const pageKeyStep = steps.value ? Math.max(1, Math.round(PAGE_KEY_STEP * steps.value)) / steps.value : PAGE_KEY_STEP;
  const positions: Record<string, number> = {
    ArrowUp: position.value + keyStep,
    ArrowRight: position.value + keyStep,
    ArrowDown: position.value - keyStep,
    ArrowLeft: position.value - keyStep,
    PageUp: position.value + pageKeyStep,
    PageDown: position.value - pageKeyStep,
    Home: 0,
    End: 1
  };
  const newPosition = positions[event.key];

  if (newPosition !== undefined) {
    event.preventDefault();

    setPosition(newPosition);
  }
};

// Double-click our wheel to reset our position.

const onDoubleClick = (): void => {
  if (!props.disabled) {
    setPosition(0);
  }
};
</script>

<style scoped>
/**
 * Wheel, which looks like a PrimeVue form field (e.g., an input text), i.e. with the same background, border, border
 * radius, and shadow, and with a border that changes when hovered, focused, or dragged, with its ticks, its marker, and
 * its position bar.
 */

.wheel {
  border: 1px solid var(--p-form-field-border-color); /* See BORDER_WIDTH. */
  border-radius: var(--p-form-field-border-radius);
  background-color: var(--p-form-field-background);
  box-shadow: var(--p-form-field-shadow);
  cursor: grab;
  touch-action: none;
  transition:
    background-color var(--p-form-field-transition-duration),
    border-color var(--p-form-field-transition-duration);
}

.wheel:not(.wheel-disabled):hover {
  border-color: var(--p-form-field-hover-border-color);
}

/**
 * Note: like a PrimeVue form field, our focus ring is our (focus-coloured) border, rather than our usual focus ring
 *       (see app.css), which PrimeVue form fields don't have either.
 */

.wheel:not(.wheel-disabled):focus-visible,
.wheel-dragging {
  border-color: var(--p-form-field-focus-border-color);
}

.wheel:focus-visible {
  outline: none;
}

.wheel-dragging {
  cursor: grabbing;
}

.wheel-disabled {
  background-color: var(--p-form-field-disabled-background);
  opacity: var(--p-disabled-opacity);
  cursor: default;
}

/**
 * Ticks, which fade out towards the sides of our wheel (through a mask on our scale, i.e. on our whole SVG, so that it
 * spans our whole wheel whatever ticks are shown, e.g., only those on one side of our marker at the start or end of our
 * wheel, and which doesn't affect our marker since it is in the middle of our wheel), with the major ones being longer
 * and more visible, and our stop ticks (at each end of our scale) being the longest and most visible.
 */

.wheel-scale {
  mask-image: linear-gradient(to right, transparent, #000 30%, #000 70%, transparent);
}

.wheel-ticks line {
  stroke: var(--p-text-muted-color);
  stroke-linecap: round;
  stroke-width: 1;
  opacity: 0.7;
}

.wheel-ticks line.wheel-tick-major {
  stroke: var(--p-text-color);
  stroke-width: 1.25;
  opacity: 0.85;
}

.wheel-ticks line.wheel-tick-end {
  stroke: var(--p-text-color);
  stroke-width: 2; /* See END_TICK_WIDTH. */
  opacity: 1;
}

/**
 * Marker, in the middle of our wheel (and above our position bar, with a gap between them), which is drawn in the same
 * SVG as our ticks, so that it is exactly aligned with the tick it is on, and which is at least as wide and taller than
 * our ticks, so that it fully covers that tick (e.g., a stop tick).
 */

.wheel-marker {
  fill: var(--p-primary-color);
}

/**
 * Position bar, which looks like the track (and range) of a PrimeVue slider, and which is inset within our wheel.
 */

.wheel-position {
  right: 8px;
  bottom: 4px; /* See POSITION_AREA_HEIGHT. */
  left: 8px;
  height: var(--p-slider-track-size);
  border-radius: var(--p-slider-track-border-radius);
  background: var(--p-slider-track-background);
}

.wheel-position-fill {
  border-radius: var(--p-slider-track-border-radius);
  background: var(--p-slider-range-background);
}
</style>
