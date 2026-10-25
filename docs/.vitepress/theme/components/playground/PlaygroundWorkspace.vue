<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  ref,
  shallowRef,
  watch,
} from 'vue';
import {
  FluxMark,
  countASTNodes,
  toggleTaskInSource,
  walkAST,
} from 'fluxmark';
import type { FluxDocument, FluxSection } from 'fluxmark';
import PlaygroundEditor from './PlaygroundEditor.vue';
import PlaygroundIcon from './PlaygroundIcon.vue';
import { getDefaultPreset, getPlaygroundPresets } from './data/presets';
import type { PlaygroundPreset } from './data/presets';
import { copyPlaygroundText } from './lib/clipboard';
import { createPlaygroundPlugin } from './lib/flux-plugin';
import { formatFluxHtml } from './lib/html-formatter';
import { fillMessage, usePlaygroundI18n } from './lib/i18n';

interface CompilationResult {
  document: FluxDocument;
  html: string;
  parseMs: number;
  htmlMs: number;
}

interface TocEntry {
  id: string;
  title: string;
  level: number;
  line: number;
}

type OutputView = 'html' | 'ast';
type HtmlMode = 'preview' | 'source';

const { locale, t } = usePlaygroundI18n();
const presets = getPlaygroundPresets(locale.value);
const defaultPreset = getDefaultPreset(locale.value);
const plugin = createPlaygroundPlugin(locale.value);
const flux = new FluxMark().use(plugin);
const allowHtml = ref(false);
const safeHtmlRenderer = flux.createHtmlRenderer();
const rawHtmlRenderer = flux.createHtmlRenderer({ allowHtml: true });

function compileSource(value: string): CompilationResult {
  const parseStart = performance.now();
  const document = flux.parse(value);
  const parseMs = performance.now() - parseStart;
  const htmlStart = performance.now();
  const html = (allowHtml.value ? rawHtmlRenderer : safeHtmlRenderer).render(document);
  const htmlMs = performance.now() - htmlStart;
  return { document, html, parseMs, htmlMs };
}

const initial = compileSource(defaultPreset.source);
const source = ref(defaultPreset.source);
const selectedPresetId = ref(defaultPreset.id);
const ast = shallowRef<FluxDocument>(initial.document);
const renderedHtml = ref(initial.html);
const activeView = ref<OutputView>('html');
const htmlMode = ref<HtmlMode>('preview');
const outlineOpen = ref(true);
const isCompiling = ref(false);
const compileError = ref('');
const notice = ref('');
const copiedArtifact = ref<'html' | 'ast' | ''>('');
const htmlPreview = ref<HTMLElement | null>(null);
const telemetry = ref({
  parseMs: initial.parseMs,
  htmlMs: initial.htmlMs,
});
let compileTimer: ReturnType<typeof setTimeout> | undefined;
let noticeTimer: ReturnType<typeof setTimeout> | undefined;
let copyTimer: ReturnType<typeof setTimeout> | undefined;

const currentPreset = computed<PlaygroundPreset>(
  () => presets.find((preset) => preset.id === selectedPresetId.value) ?? defaultPreset,
);
const nodeCount = computed(() => countASTNodes(ast.value));
const formattedHtml = computed(() => formatFluxHtml(renderedHtml.value));
const astJson = computed(() => JSON.stringify(ast.value, null, 2));
const parseValue = computed(() => `${telemetry.value.parseMs.toFixed(2)} ms`);
const htmlValue = computed(() => `${telemetry.value.htmlMs.toFixed(2)} ms`);
const nodeValue = computed(() => nodeCount.value.toLocaleString());
const issueLabel = computed(() => {
  const count = ast.value.issues.length;
  if (count === 0) return t.value.noParseIssues;
  return count === 1
    ? `1 ${t.value.parseIssueSingular}`
    : `${count} ${t.value.parseIssues}`;
});

const toc = computed<TocEntry[]>(() => {
  const entries: TocEntry[] = [];
  walkAST(ast.value, {
    Section: {
      enter(section: FluxSection) {
        entries.push({
          id: section.id ?? `section-${section.line}`,
          title: section.title
            .map((token) => (token.type === 'break' ? ' ' : token.content))
            .join(''),
          level: section.level,
          line: section.line,
        });
      },
    },
  });
  return entries;
});

function announce(message: string): void {
  notice.value = message;
  if (noticeTimer !== undefined) clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => {
    notice.value = '';
  }, 2400);
}

function compileNow(): void {
  if (compileTimer !== undefined) clearTimeout(compileTimer);
  compileTimer = undefined;
  try {
    const result = compileSource(source.value);
    ast.value = result.document;
    renderedHtml.value = result.html;
    telemetry.value.parseMs = result.parseMs;
    telemetry.value.htmlMs = result.htmlMs;
    compileError.value = '';
  } catch (error: unknown) {
    compileError.value =
      error instanceof Error ? error.message : t.value.notices.compileFailed;
  } finally {
    isCompiling.value = false;
  }
}

watch(allowHtml, () => {
  compileNow();
});

watch(source, () => {
  isCompiling.value = true;
  if (compileTimer !== undefined) clearTimeout(compileTimer);
  compileTimer = setTimeout(compileNow, 110);
});

function selectPreset(id: string): void {
  const preset = presets.find((item) => item.id === id);
  if (preset === undefined) return;
  selectedPresetId.value = preset.id;
  source.value = preset.source;
  htmlMode.value = 'preview';
  announce(fillMessage(t.value.notices.presetLoaded, { name: preset.name }));
}

function resetPreset(): void {
  source.value = currentPreset.value.source;
  announce(t.value.notices.presetReset);
}

function applyTaskToggle(line: number, checked: boolean): void {
  const updated = toggleTaskInSource(source.value, line, checked);
  if (updated === source.value) return;
  source.value = updated;
  announce(
    fillMessage(
      checked ? t.value.notices.taskCompleted : t.value.notices.taskReopened,
      { line },
    ),
  );
}

function handleHtmlClick(event: MouseEvent): void {
  const target = event.target as HTMLElement;
  const checkbox = target.closest<HTMLInputElement>(
    'input[data-flux-task][data-flux-line]',
  );
  if (checkbox !== null) {
    event.preventDefault();
    const line = Number(checkbox.dataset.fluxLine);
    if (Number.isInteger(line) && line > 0) applyTaskToggle(line, checkbox.checked);
    return;
  }

  const spoiler = target.closest<HTMLElement>('.fx-spoiler');
  if (spoiler !== null) {
    event.preventDefault();
    const revealed = spoiler.classList.toggle('is-revealed');
    spoiler.setAttribute('aria-pressed', String(revealed));
    return;
  }

  const anchor = target.closest<HTMLAnchorElement>('a[href^="#"]');
  if (anchor !== null) {
    const id = decodeURIComponent(anchor.getAttribute('href')?.slice(1) ?? '');
    if (id.length > 0) {
      event.preventDefault();
      navigateToSection(id);
    }
  }
}

function handleHtmlKeydown(event: KeyboardEvent): void {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  const target = event.target as HTMLElement;
  const spoiler = target.closest<HTMLElement>('.fx-spoiler');
  if (spoiler === null) return;
  event.preventDefault();
  const revealed = spoiler.classList.toggle('is-revealed');
  spoiler.setAttribute('aria-pressed', String(revealed));
}

function navigateToSection(id: string): void {
  activeView.value = 'html';
  htmlMode.value = 'preview';
  void nextTick(() => {
    const container = htmlPreview.value;
    const element = container?.querySelector<HTMLElement>(`#${CSS.escape(id)}`);
    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    element?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
  });
}

async function copyArtifact(kind: 'html' | 'ast'): Promise<void> {
  const value = kind === 'html' ? formattedHtml.value : astJson.value;
  if (!(await copyPlaygroundText(value))) {
    announce(t.value.notices.copyFailed);
    return;
  }
  copiedArtifact.value = kind;
  if (copyTimer !== undefined) clearTimeout(copyTimer);
  copyTimer = setTimeout(() => {
    copiedArtifact.value = '';
  }, 1600);
  announce(kind === 'html' ? t.value.notices.htmlCopied : t.value.notices.astCopied);
}

onBeforeUnmount(() => {
  if (compileTimer !== undefined) clearTimeout(compileTimer);
  if (noticeTimer !== undefined) clearTimeout(noticeTimer);
  if (copyTimer !== undefined) clearTimeout(copyTimer);
});
</script>

<template>
  <div class="pg-shell">
    <header class="pg-intro">
      <div class="pg-intro-copy">
        <p class="pg-kicker">{{ t.kicker }}</p>
        <h1>{{ t.title }}</h1>
        <p>{{ t.subtitle }}</p>
      </div>
      <div class="pg-statuses">
        <span class="pg-status">
          <span class="pg-status-dot" :class="{ 'is-busy': isCompiling }" />
          {{ isCompiling ? t.statusCompiling : t.statusReady }}
        </span>
        <span class="pg-chip">
          <PlaygroundIcon name="plugin" :size="13" />
          {{ t.pluginActive }}
        </span>
      </div>
    </header>

    <div v-if="compileError" class="pg-alert" role="alert">
      <PlaygroundIcon name="alert" :size="15" />
      {{ compileError }}
    </div>

    <div class="pg-grid">
      <PlaygroundEditor
        :source="source"
        :preset="currentPreset"
        :presets="presets"
        @update:source="source = $event"
        @select-preset="selectPreset"
        @reset="resetPreset"
      />

      <section class="pg-panel pg-output" :aria-label="t.views.outputLabel">
        <header class="pg-panel-bar pg-output-header">
          <div class="pg-tabs" role="tablist" :aria-label="t.views.viewsLabel">
            <button
              v-for="view in (['html', 'ast'] as const)"
              :key="view"
              type="button"
              role="tab"
              class="pg-tab"
              :class="{ 'is-active': activeView === view }"
              :aria-selected="activeView === view"
              @click="activeView = view"
            >
              <PlaygroundIcon :name="view === 'html' ? 'monitor' : 'braces'" :size="14" />
              {{ t.views[view] }}
            </button>
          </div>

          <div v-if="activeView === 'html'" class="pg-view-actions">
            <div class="pg-segmented" role="group" :aria-label="t.views.preview">
              <button
                type="button"
                :class="{ 'is-active': htmlMode === 'preview' }"
                @click="htmlMode = 'preview'"
              >
                {{ t.views.preview }}
              </button>
              <button
                type="button"
                :class="{ 'is-active': htmlMode === 'source' }"
                @click="htmlMode = 'source'"
              >
                {{ t.views.source }}
              </button>
            </div>
            <label class="pg-raw-toggle" :title="t.views.allowHtmlHint">
              <input v-model="allowHtml" type="checkbox" />
              <span>{{ t.views.allowHtml }}</span>
            </label>
            <button
              type="button"
              class="pg-icon-button"
              :class="{ 'is-active': outlineOpen }"
              :title="t.views.outline"
              :aria-label="t.views.outline"
              @click="outlineOpen = !outlineOpen"
            >
              <PlaygroundIcon name="outline" />
            </button>
            <button
              v-if="htmlMode === 'source'"
              type="button"
              class="pg-icon-button"
              :title="t.views.copyHtml"
              :aria-label="t.views.copyHtml"
              @click="copyArtifact('html')"
            >
              <PlaygroundIcon :name="copiedArtifact === 'html' ? 'check' : 'copy'" />
            </button>
          </div>

          <div v-else class="pg-view-actions">
            <span class="pg-chip pg-chip-muted">{{ t.views.transformed }}</span>
            <button
              type="button"
              class="pg-icon-button"
              :title="t.views.copyAst"
              :aria-label="t.views.copyAst"
              @click="copyArtifact('ast')"
            >
              <PlaygroundIcon :name="copiedArtifact === 'ast' ? 'check' : 'copy'" />
            </button>
          </div>
        </header>

        <div class="pg-output-body">
          <div v-show="activeView === 'html'" class="pg-html-layout" role="tabpanel">
            <div class="pg-preview-scroll">
              <div
                v-if="htmlMode === 'preview'"
                ref="htmlPreview"
                class="pg-preview flux-preview"
                @click="handleHtmlClick"
                @keydown="handleHtmlKeydown"
                v-html="renderedHtml"
              />
              <pre v-else class="pg-code-source"><code>{{ formattedHtml }}</code></pre>
            </div>
            <aside v-if="outlineOpen && htmlMode === 'preview'" class="pg-outline">
              <header>
                <span>{{ t.views.onThisPage }}</span>
                <span class="pg-count">{{ toc.length }}</span>
              </header>
              <nav>
                <button
                  v-for="entry in toc"
                  :key="entry.id"
                  type="button"
                  :style="{ paddingLeft: `${10 + Math.max(0, entry.level - 1) * 12}px` }"
                  @click="navigateToSection(entry.id)"
                >
                  {{ entry.title || t.views.untitled }}
                </button>
              </nav>
              <footer>{{ issueLabel }}</footer>
            </aside>
          </div>

          <div v-show="activeView === 'ast'" class="pg-ast-layout" role="tabpanel">
            <div class="pg-ast-code">
              <p class="pg-ast-hint">{{ t.views.astHint }}</p>
              <pre><code>{{ astJson }}</code></pre>
            </div>
            <aside class="pg-outline pg-outline-dark">
              <header>
                <span>{{ t.views.outline }}</span>
                <span class="pg-count">{{ toc.length }}</span>
              </header>
              <nav>
                <button
                  v-for="entry in toc"
                  :key="`ast-${entry.id}`"
                  type="button"
                  :style="{ paddingLeft: `${10 + Math.max(0, entry.level - 1) * 12}px` }"
                  @click="navigateToSection(entry.id)"
                >
                  <span>{{ entry.title || t.views.untitled }}</span>
                  <small>L{{ entry.line }} · H{{ entry.level }}</small>
                </button>
              </nav>
              <footer>{{ issueLabel }}</footer>
            </aside>
          </div>
        </div>

        <footer class="pg-output-footer">
          <span class="pg-status-dot" aria-hidden="true" />
          <span>{{ activeView === 'html' ? t.views.footerHtml : t.views.footerAst }}</span>
          <span v-if="allowHtml" class="pg-raw-footer-warning" role="status">
            <PlaygroundIcon name="alert" :size="12" />
            {{ t.views.rawHtmlWarning }}
          </span>
          <span class="pg-bar-spacer" />
          <span>{{ currentPreset.fileName }}</span>
        </footer>
      </section>
    </div>

    <section class="pg-metrics pg-metrics-bottom" :aria-label="t.metrics.label">
      <div class="pg-metric">
        <span>{{ t.metrics.parse }}</span>
        <strong>{{ parseValue }}</strong>
        <small>{{ t.metrics.parseDetail }}</small>
      </div>
      <div class="pg-metric">
        <span>{{ t.metrics.html }}</span>
        <strong>{{ htmlValue }}</strong>
        <small>{{ t.metrics.htmlDetail }}</small>
      </div>
      <div class="pg-metric">
        <span>{{ t.metrics.nodes }}</span>
        <strong>{{ nodeValue }}</strong>
        <small>{{ toc.length }} {{ t.metrics.sections }}</small>
      </div>
    </section>

    <div v-if="notice" class="pg-toast" role="status">{{ notice }}</div>
  </div>
</template>
