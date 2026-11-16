<template>
  <canvas v-show="visible && plotRect" ref="canvasRef" class="absolute z-1 pointer-events-none"
    :style="plotRect && {
      left: `${plotRect.left}px`,
      top: `${plotRect.top}px`,
      width: `${plotRect.width}px`,
      height: `${plotRect.height}px`
    }"
  />
</template>

<script setup lang="ts">
import * as vue from 'vue';

import * as colors from '../../common/colors';

// The last point of the visible traces of a graph panel when its data is live (e.g., while a simulation is running),
// so that their latest value can easily be identified (see GraphPanelWidget.vue). The last point of a trace is shown as
// a target, i.e. (from the inside out) a disc of its colour, a gap of the background colour, a ring of the text colour
// (i.e. near black in light mode and near white in dark mode), and a halo of the background colour. Being a
// high-contrast shape that is not otherwise found in our plots, it stands out even where a trace overlaps itself (e.g.,
// in a phase plot), while its disc still shows which trace it belongs to.
// Note #1: we are an overlay, so that we can be shown and hidden without our graph panel having to be redrawn.
// Note #2: we are a canvas (rather than, say, an SVG element) and our points are not a property but are drawn using
//          setPoints(). Indeed, our points are updated whenever our graph panel gets drawn (e.g., many times a second
//          while a simulation is running), and both updating some SVG elements and re-rendering the (big) template of
//          our graph panel take about a millisecond, while drawing a few circles on a canvas takes next to nothing.
// Note #3: a target is drawn as a disc and three annuli, so that each pixel is only painted once, which matters if its
//          trace is faded (i.e. if another trace is highlighted).

export interface IGraphPanelLivePoint {
  x: number;
  y: number;
  color: string;
  alpha: number;
}

const props = defineProps<{
  plotRect?: { left: number; top: number; width: number; height: number };
  backgroundColor: string;
  textColor: string;
}>();

const RADIUS = 3; // Radius of the disc of a target.
const GAP = 1.5; // Gap between the disc of a target and its ring.
const RING_WIDTH = 1.5; // Width of the ring of a target.
const HALO_WIDTH = 1; // Width of the halo around the ring of a target.

const canvasRef = vue.useTemplateRef<HTMLCanvasElement>('canvasRef');
const visible = vue.ref<boolean>(false);

const setPoints = (points: IGraphPanelLivePoint[]): void => {
  // Draw the given points, if any.

  const canvas = canvasRef.value;
  const plotRect = props.plotRect;

  visible.value = points.length > 0;

  if (!canvas || !plotRect || !points.length) {
    return;
  }

  // Get our canvas context.

  const context = canvas.getContext('2d');

  if (!context) {
    return;
  }

  // Draw our targets, after making sure that our canvas has the size of our plotting area (in device pixels), which
  // also clears it, or clearing it.

  const pxRatio = window.devicePixelRatio || 1;
  const width = Math.round(plotRect.width * pxRatio);
  const height = Math.round(plotRect.height * pxRatio);

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  } else {
    context.clearRect(0, 0, width, height);
  }

  const discRadius = RADIUS * pxRatio;
  const gapRadius = discRadius + GAP * pxRatio;
  const ringRadius = gapRadius + RING_WIDTH * pxRatio;
  const haloRadius = ringRadius + HALO_WIDTH * pxRatio;
  const backgroundColor = colors.cssColor(props.backgroundColor);
  const textColor = colors.cssColor(props.textColor);

  for (const point of points) {
    const x = point.x * pxRatio;
    const y = point.y * pxRatio;

    context.globalAlpha = point.alpha;

    for (const [innerRadius, outerRadius, color] of [
      [0, discRadius, point.color],
      [discRadius, gapRadius, backgroundColor],
      [gapRadius, ringRadius, textColor],
      [ringRadius, haloRadius, backgroundColor]
    ] as const) {
      context.fillStyle = colors.cssColor(color);
      context.beginPath();
      context.arc(x, y, outerRadius, 0, 2 * Math.PI);

      if (innerRadius > 0) {
        context.moveTo(x + innerRadius, y);
        context.arc(x, y, innerRadius, 0, 2 * Math.PI);
      }

      context.fill('evenodd');
    }
  }

  context.globalAlpha = 1;
};

defineExpose({ setPoints });
</script>
