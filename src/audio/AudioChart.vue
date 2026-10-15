<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch, nextTick } from 'vue';
import MiniChart from '../audio/kernel/chart-util.js';

interface Series {
  values: (number | null)[];
  color: string;
  type?: 'line' | 'bar';
  width?: number;
  dash?: number[];
  points?: boolean;
  radius?: number;
}

interface HBand {
  from: number;
  to: number;
  color?: string;
}

const props = withDefaults(
  defineProps<{
    x: number[];
    series: Series[];
    xLog?: boolean;
    yMin?: number | null;
    yMax?: number | null;
    yTicks?: number;
    yDigits?: number;
    hBands?: HBand[];
    height?: number;
    xLabelFmt?: (v: number) => string;
    emptyText?: string;
  }>(),
  { height: 300 }
);

const el = ref<HTMLCanvasElement | null>(null);
let ro: ResizeObserver | null = null;

function render() {
  if (!el.value) return;
  el.value.setAttribute('height', String(props.height));
  MiniChart.draw(el.value, {
    x: props.x,
    series: props.series,
    xLog: props.xLog,
    yMin: props.yMin == null ? undefined : props.yMin,
    yMax: props.yMax == null ? undefined : props.yMax,
    yTicks: props.yTicks,
    yDigits: props.yDigits,
    hBands: props.hBands,
    xLabelFmt: props.xLabelFmt,
    emptyText: props.emptyText,
  });
}

onMounted(async () => {
  await nextTick();
  render();
  if (el.value && typeof ResizeObserver !== 'undefined') {
    ro = new ResizeObserver(() => render());
    ro.observe(el.value);
  }
  window.addEventListener('resize', render);
});

onBeforeUnmount(() => {
  ro?.disconnect();
  window.removeEventListener('resize', render);
});

watch(
  () => [props.x, props.series, props.hBands, props.height],
  () => render(),
  { deep: true }
);
</script>

<template>
  <canvas ref="el" class="audio-chart" />
</template>

<style scoped>
.audio-chart {
  display: block;
  width: 100%;
  max-width: 100%;
}
</style>
