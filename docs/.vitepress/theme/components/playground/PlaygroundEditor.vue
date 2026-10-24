<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { usePlaygroundI18n } from './lib/i18n';
import type { PlaygroundIconName } from './lib/icons';
import PlaygroundIcon from './PlaygroundIcon.vue';
import type { PlaygroundPreset } from './data/presets';
import { copyPlaygroundText } from './lib/clipboard';

const props = defineProps<{
  source: string;
  preset: PlaygroundPreset;
  presets: PlaygroundPreset[];
}>();

const emit = defineEmits<{
  'update:source': [value: string];
  'select-preset': [id: string];
  reset: [];
}>();

const { t, locale } = usePlaygroundI18n();
const textarea = ref<HTMLTextAreaElement | null>(null);
const gutter = ref<HTMLElement | null>(null);
const cursorLine = ref(1);
const cursorColumn = ref(1);
const copied = ref(false);
let copiedTimer: ReturnType<typeof setTimeout> | undefined;

const lineCount = computed(() => props.source.split('\n').length);
const lineNumbers = computed(() => Array.from({ length: lineCount.value }, (_, index) => index + 1));
const characterCount = computed(() => props.source.length.toLocaleString());

interface EditorTool {
  id: string;
  label: string;
  icon: PlaygroundIconName;
  run: () => void;
  divider?: boolean;
}

function updateSource(value: string): void {
  emit('update:source', value);
}

function updateCursor(target: HTMLTextAreaElement): void {
  const before = target.value.slice(0, target.selectionStart);
  const lastBreak = before.lastIndexOf('\n');
  cursorLine.value = (before.match(/\n/g)?.length ?? 0) + 1;
  cursorColumn.value = target.selectionStart - lastBreak;
}

function handleInput(event: Event): void {
  const target = event.target as HTMLTextAreaElement;
  updateSource(target.value);
  updateCursor(target);
}

function syncGutter(): void {
  if (gutter.value !== null && textarea.value !== null) {
    gutter.value.scrollTop = textarea.value.scrollTop;
  }
}

async function replaceRange(
  start: number,
  end: number,
  replacement: string,
  selectionStart: number,
  selectionEnd = selectionStart,
): Promise<void> {
  updateSource(`${props.source.slice(0, start)}${replacement}${props.source.slice(end)}`);
  await nextTick();
  const target = textarea.value;
  if (target === null) return;
  target.focus();
  target.setSelectionRange(selectionStart, selectionEnd);
  updateCursor(target);
}

function selectionBounds(target: HTMLTextAreaElement): {
  start: number;
  end: number;
  blockStart: number;
  blockEnd: number;
} {
  const { selectionStart: start, selectionEnd: end } = target;
  const blockStart = target.value.lastIndexOf('\n', Math.max(0, start - 1)) + 1;
  const effectiveEnd = end > start && target.value[end - 1] === '\n' ? end - 1 : end;
  const nextBreak = target.value.indexOf('\n', effectiveEnd);
  return {
    start,
    end,
    blockStart,
    blockEnd: nextBreak < 0 ? target.value.length : nextBreak,
  };
}

function wrapSelection(before: string, after: string, fallback: string): void {
  const target = textarea.value;
  if (target === null) return;
  const start = target.selectionStart;
  const end = target.selectionEnd;
  const content = target.value.slice(start, end) || fallback;
  void replaceRange(
    start,
    end,
    `${before}${content}${after}`,
    start + before.length,
    start + before.length + content.length,
  );
}

function insertLink(): void {
  const target = textarea.value;
  if (target === null) return;
  const start = target.selectionStart;
  const end = target.selectionEnd;
  const content = target.value.slice(start, end) || (locale.value === 'zh' ? '链接文本' : 'link label');
  const url = 'https://';
  const urlStart = start + content.length + 2;
  void replaceRange(start, end, `[${content}|${url}]`, urlStart, urlStart + url.length);
}

function prefixLines(prefix: string): void {
  const target = textarea.value;
  if (target === null) return;
  const { blockStart, blockEnd } = selectionBounds(target);
  const block = target.value.slice(blockStart, blockEnd);
  const replacement = block
    .split('\n')
    .map((line) => `${prefix}${line}`)
    .join('\n');
  void replaceRange(blockStart, blockEnd, replacement, blockStart, blockStart + replacement.length);
}

function insertTemplate(template: string): void {
  const target = textarea.value;
  if (target === null) return;
  const start = target.selectionStart;
  const end = target.selectionEnd;
  const selected = target.value.slice(start, end);
  const body = template.replace('$SELECTION', selected);
  const prefix = start > 0 && target.value[start - 1] !== '\n' ? '\n\n' : '';
  const suffix = end < target.value.length && target.value[end] !== '\n' ? '\n\n' : '';
  const replacement = `${prefix}${body}${suffix}`;
  void replaceRange(start, end, replacement, start + prefix.length + body.length);
}

function indentSelection(outdent: boolean): void {
  const target = textarea.value;
  if (target === null) return;
  const { start, end, blockStart, blockEnd } = selectionBounds(target);
  if (!outdent && start === end) {
    void replaceRange(start, end, '  ', start + 2);
    return;
  }

  const block = target.value.slice(blockStart, blockEnd);
  const lines = block.split('\n');
  let removedOnFirstLine = 0;
  const replacement = lines
    .map((line, index) => {
      if (!outdent) return `  ${line}`;
      const removed = /^ {1,2}/.exec(line)?.[0].length ?? 0;
      if (index === 0) removedOnFirstLine = removed;
      return line.slice(removed);
    })
    .join('\n');

  if (start === end) {
    const cursor = Math.max(blockStart, start - removedOnFirstLine);
    void replaceRange(blockStart, blockEnd, replacement, cursor);
  } else {
    void replaceRange(blockStart, blockEnd, replacement, blockStart, blockStart + replacement.length);
  }
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'Tab') {
    event.preventDefault();
    indentSelection(event.shiftKey);
    return;
  }
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'b') {
    event.preventDefault();
    wrapSelection('*', '*', locale.value === 'zh' ? '粗体文本' : 'bold text');
  }
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'i') {
    event.preventDefault();
    wrapSelection('_', '_', locale.value === 'zh' ? '斜体文本' : 'italic text');
  }
}

const tools = computed<EditorTool[]>(() => {
  const m = t.value.editor.toolbar;
  const tableTitle = locale.value === 'zh' ? '数据表标题' : 'Table title';
  const tableKey = locale.value === 'zh' ? '字段' : 'Column';
  const tableValue = locale.value === 'zh' ? '值' : 'Value';
  const detailKey = locale.value === 'zh' ? '详情' : 'Details';
  const detailValue = locale.value === 'zh' ? '说明' : 'Information';
  const timelineTitle = locale.value === 'zh' ? '路线图' : 'Roadmap';
  const timelineOne = locale.value === 'zh' ? '第一步' : 'First step';
  const timelineTwo = locale.value === 'zh' ? '下一步' : 'Next step';
  return [
    { id: 'heading', label: m.heading, icon: 'heading', run: () => prefixLines('# ') },
    { id: 'subheading', label: m.subheading, icon: 'subheading', run: () => prefixLines('## ') },
    {
      id: 'bold',
      label: m.bold,
      icon: 'bold',
      run: () => wrapSelection('*', '*', locale.value === 'zh' ? '粗体文本' : 'bold text'),
    },
    {
      id: 'italic',
      label: m.italic,
      icon: 'italic',
      run: () => wrapSelection('_', '_', locale.value === 'zh' ? '斜体文本' : 'italic text'),
    },
    {
      id: 'mark',
      label: m.mark,
      icon: 'mark',
      run: () => wrapSelection('=', '=', locale.value === 'zh' ? '高亮文本' : 'marked text'),
    },
    {
      id: 'code',
      label: m.inlineCode,
      icon: 'code',
      run: () => wrapSelection('`', '`', 'code'),
    },
    {
      id: 'link',
      label: m.link,
      icon: 'link',
      run: insertLink,
    },
    { id: 'divider-1', label: '', icon: 'list', run: () => undefined, divider: true },
    { id: 'task', label: m.task, icon: 'task', run: () => prefixLines('* [ ] ') },
    { id: 'list', label: m.list, icon: 'list', run: () => prefixLines('- ') },
    { id: 'callout', label: m.callout, icon: 'quote', run: () => prefixLines('> [note] ') },
    {
      id: 'divider-2',
      label: '',
      icon: 'list',
      run: () => undefined,
      divider: true,
    },
    {
      id: 'code-block',
      label: m.codeBlock,
      icon: 'braces',
      run: () => insertTemplate(`$ ts\n  $SELECTION`),
    },
    {
      id: 'table',
      label: m.table,
      icon: 'table',
      run: () =>
        insertTemplate(
          `@ ${tableTitle}\n  - ${tableKey}: ${tableValue}\n    ${detailKey}: ${detailValue}`,
        ),
    },
    {
      id: 'timeline',
      label: m.timeline,
      icon: 'timeline',
      run: () =>
        insertTemplate(
          `:::timeline ${timelineTitle}\n  ${timelineOne} | planned\n  ${timelineTwo} | planned\n:::`,
        ),
    },
  ];
});

async function copySource(): Promise<void> {
  if (!(await copyPlaygroundText(props.source))) return;
  copied.value = true;
  if (copiedTimer !== undefined) clearTimeout(copiedTimer);
  copiedTimer = setTimeout(() => {
    copied.value = false;
  }, 1600);
}

function selectPreset(event: Event): void {
  const target = event.target as HTMLSelectElement;
  emit('select-preset', target.value);
}

watch(
  () => props.source,
  async () => {
    await nextTick();
    const target = textarea.value;
    if (target !== null) {
      if (target.selectionStart > target.value.length) target.setSelectionRange(0, 0);
      updateCursor(target);
      syncGutter();
    }
  },
);

onBeforeUnmount(() => {
  if (copiedTimer !== undefined) clearTimeout(copiedTimer);
});
</script>

<template>
  <section class="pg-panel pg-editor" :aria-label="t.editor.label">
    <header class="pg-panel-bar pg-editor-header">
      <label class="pg-preset">
        <span class="pg-sr-only">{{ t.editor.preset }}</span>
        <select :value="preset.id" :aria-label="t.editor.loadPreset" @change="selectPreset">
          <option v-for="item in presets" :key="item.id" :value="item.id">
            {{ item.name }}
          </option>
        </select>
        <PlaygroundIcon name="chevron" :size="13" class="pg-select-chevron" />
      </label>
      <span class="pg-file-name">{{ preset.fileName }}</span>
      <span class="pg-bar-spacer" />
      <button
        type="button"
        class="pg-icon-button"
        :title="t.editor.copy"
        :aria-label="t.editor.copy"
        @click="copySource"
      >
        <PlaygroundIcon :name="copied ? 'check' : 'copy'" />
      </button>
      <button
        type="button"
        class="pg-icon-button"
        :title="t.editor.reset"
        :aria-label="t.editor.reset"
        @click="emit('reset')"
      >
        <PlaygroundIcon name="reset" />
      </button>
    </header>

    <div class="pg-toolbar" role="toolbar" :aria-label="t.editor.label">
      <template v-for="tool in tools" :key="tool.id">
        <span v-if="tool.divider" class="pg-toolbar-divider" aria-hidden="true" />
        <button
          v-else
          type="button"
          class="pg-icon-button"
          :title="tool.label"
          :aria-label="tool.label"
          @click="tool.run"
        >
          <PlaygroundIcon :name="tool.icon" :size="15" />
        </button>
      </template>
    </div>

    <div class="pg-editor-main">
      <div ref="gutter" class="pg-gutter" aria-hidden="true">
        <div
          v-for="number in lineNumbers"
          :key="number"
          class="pg-line-number"
          :class="{ 'is-current': number === cursorLine }"
        >
          {{ number }}
        </div>
      </div>
      <textarea
        ref="textarea"
        :value="source"
        :aria-label="t.editor.label"
        wrap="off"
        class="pg-textarea"
        autocapitalize="off"
        autocomplete="off"
        autocorrect="off"
        spellcheck="false"
        @input="handleInput"
        @keydown="handleKeydown"
        @scroll="syncGutter"
        @click="textarea && updateCursor(textarea)"
        @keyup="textarea && updateCursor(textarea)"
        @select="textarea && updateCursor(textarea)"
      />
    </div>

    <footer class="pg-editor-footer">
      <span class="pg-status-dot" aria-hidden="true" />
      <span>{{ t.editor.ready }}</span>
      <span class="pg-editor-stats">{{ lineCount }} {{ t.editor.lines }} · {{ characterCount }} {{ t.editor.chars }}</span>
      <span class="pg-bar-spacer" />
      <span>{{ t.editor.cursor.replace('{line}', String(cursorLine)).replace('{column}', String(cursorColumn)) }}</span>
      <span class="pg-editor-stats">{{ t.editor.spaces }}</span>
    </footer>
  </section>
</template>
