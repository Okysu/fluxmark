<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { FluxMark, countASTNodes } from 'fluxmark';
import { formatFluxHtml } from './lib/html-formatter';
import { usePlaygroundI18n } from './lib/i18n';

const props = defineProps<{ source: string }>();
const { t } = usePlaygroundI18n();
const decodedSource = computed(() => decodeURIComponent(props.source));
const activeView = ref<'preview' | 'html' | 'ast'>('preview');
const metrics = ref({ parseMs: 0, htmlMs: 0 });
const parser = new FluxMark();

const compiled = computed(() => {
  const parseStart = performance.now();
  const document = parser.parse(decodedSource.value);
  const parseMs = performance.now() - parseStart;
  const htmlStart = performance.now();
  const html = parser.createHtmlRenderer().render(document);
  const htmlMs = performance.now() - htmlStart;
  return { document, html, parseMs, htmlMs };
});
const formattedHtml = ref('');
const astJson = computed(() => JSON.stringify(compiled.value.document, null, 2));
const nodeCount = computed(() => countASTNodes(compiled.value.document));

onMounted(() => {
  formattedHtml.value = formatFluxHtml(compiled.value.html);
  metrics.value = {
    parseMs: compiled.value.parseMs,
    htmlMs: compiled.value.htmlMs,
  };
});
</script>

<template>
  <section class="fe-shell">
    <header class="fe-header">
      <span class="fe-label">{{ t.exampleLabel }}</span>
      <div class="fe-tabs" role="tablist" :aria-label="t.views.viewsLabel">
        <button
          type="button"
          role="tab"
          :class="{ 'is-active': activeView === 'preview' }"
          :aria-selected="activeView === 'preview'"
          @click="activeView = 'preview'"
        >
          {{ t.views.preview }}
        </button>
        <button
          type="button"
          role="tab"
          :class="{ 'is-active': activeView === 'html' }"
          :aria-selected="activeView === 'html'"
          @click="activeView = 'html'"
        >
          {{ t.views.html }}
        </button>
        <button
          type="button"
          role="tab"
          :class="{ 'is-active': activeView === 'ast' }"
          :aria-selected="activeView === 'ast'"
          @click="activeView = 'ast'"
        >
          {{ t.views.ast }}
        </button>
      </div>
    </header>
    <div class="fe-body">
      <div v-show="activeView === 'preview'" class="fe-preview flux-preview" role="tabpanel" v-html="compiled.html" />
      <pre v-show="activeView === 'html'" class="fe-code" role="tabpanel"><code>{{ formattedHtml }}</code></pre>
      <pre v-show="activeView === 'ast'" class="fe-code" role="tabpanel"><code>{{ astJson }}</code></pre>
    </div>
    <footer class="fe-metrics">
      <span>{{ t.metrics.parse }} <strong>{{ metrics.parseMs.toFixed(2) }} ms</strong></span>
      <span>{{ t.metrics.html }} <strong>{{ metrics.htmlMs.toFixed(2) }} ms</strong></span>
      <span>{{ t.metrics.nodes }} <strong>{{ nodeCount }}</strong></span>
    </footer>
  </section>
</template>
