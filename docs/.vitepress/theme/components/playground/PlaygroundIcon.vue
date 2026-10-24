<script setup lang="ts">
import type { PlaygroundIconName } from './lib/icons';

withDefaults(
  defineProps<{
    name: PlaygroundIconName;
    size?: number;
  }>(),
  { size: 16 },
);

const paths: Record<PlaygroundIconName, string[]> = {
  copy: ['M9 9h11v11H9z', 'M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1'],
  check: ['M20 6 9 17l-5-5'],
  reset: ['M3 12a9 9 0 1 0 3-6.7', 'M3 3v6h6'],
  download: ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'm7 10 5 5 5-5', 'M12 15V3'],
  'zoom-in': ['M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z', 'm21 21-4.35-4.35', 'M11 8v6', 'M8 11h6'],
  'zoom-out': ['M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z', 'm21 21-4.35-4.35', 'M8 11h6'],
  monitor: ['M2 3h20v14H2z', 'M8 21h8', 'M12 17v4'],
  braces: ['m16 18 6-6-6-6', 'm8 6-6 6 6 6'],
  outline: ['M8 6h13', 'M8 12h13', 'M8 18h13', 'M3 6h.01', 'M3 12h.01', 'M3 18h.01'],
  chevron: ['m9 18 6-6-6-6'],
  external: ['M15 3h6v6', 'm10 14 11-11', 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6'],
  plugin: ['M12 22v-5', 'M9 8V2', 'M15 8V2', 'M18 8v3a6 6 0 0 1-12 0V8Z', 'M5 8h14'],
  alert: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z', 'M12 8v4', 'M12 16h.01'],
  heading: ['M4 5v14', 'M12 5v14', 'M4 12h8', 'M17 20v-8l-2 1'],
  subheading: ['M4 5v14', 'M12 5v14', 'M4 12h8', 'M17 16l2-1v5'],
  bold: ['M6 4h8a4 4 0 0 1 0 8H6z', 'M6 12h9a4 4 0 0 1 0 8H6z'],
  italic: ['M19 4h-9', 'M14 20H5', 'M15 4 9 20'],
  mark: ['m12 3 3 3-8 8H4v-3z', 'M3 21h18'],
  code: ['m16 18 6-6-6-6', 'm8 6-6 6 6 6'],
  link: ['M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7', 'M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7'],
  task: ['M4 4h16v16H4z', 'm8 12 3 3 5-6'],
  list: ['M9 6h12', 'M9 12h12', 'M9 18h12', 'M4 6h.01', 'M4 12h.01', 'M4 18h.01'],
  quote: ['M3 21c3 0 7-1 7-8V5H3v8h4c0 2-1 4-4 5', 'M14 21c3 0 7-1 7-8V5h-7v8h4c0 2-1 4-4 5'],
  table: ['M3 3h18v18H3z', 'M3 9h18', 'M3 15h18', 'M9 3v18', 'M15 3v18'],
  timeline: ['M5 3v18', 'M5 8h4', 'M5 16h7', 'M13 8h6', 'M16 16h4', 'M9 5v6', 'M12 13v6'],
};
</script>

<template>
  <svg
    class="pg-icon"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path v-for="(path, index) in paths[name]" :key="index" :d="path" />
  </svg>
</template>

<style scoped>
.pg-icon {
  display: inline-block;
  flex: none;
  vertical-align: -0.15em;
}
</style>
