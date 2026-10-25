import { computed, type ComputedRef } from 'vue';
import { useData } from 'vitepress';

export type PlaygroundLocale = 'en' | 'zh';

export interface PlaygroundMessages {
  kicker: string;
  title: string;
  subtitle: string;
  statusCompiling: string;
  statusReady: string;
  pluginActive: string;
  parseIssues: string;
  noParseIssues: string;
  parseIssueSingular: string;
  exampleLabel: string;
  metrics: {
    label: string;
    parse: string;
    html: string;
    nodes: string;
    parseDetail: string;
    htmlDetail: string;
    sections: string;
  };
  editor: {
    label: string;
    preset: string;
    loadPreset: string;
    copy: string;
    copied: string;
    reset: string;
    ready: string;
    lines: string;
    chars: string;
    cursor: string;
    spaces: string;
    toolbar: Record<EditorToolKey, string>;
  };
  views: {
    html: string;
    ast: string;
    preview: string;
    source: string;
    copyHtml: string;
    copyAst: string;
    outline: string;
    onThisPage: string;
    transformed: string;
    astHint: string;
    outputLabel: string;
    viewsLabel: string;
    untitled: string;
    footerHtml: string;
    footerAst: string;
    allowHtml: string;
    allowHtmlHint: string;
    rawHtmlWarning: string;
  };
  notices: {
    presetLoaded: string;
    presetReset: string;
    htmlCopied: string;
    astCopied: string;
    copyFailed: string;
    linkFailed: string;
    taskCompleted: string;
    taskReopened: string;
    compileFailed: string;
  };
}

export type EditorToolKey =
  | 'heading'
  | 'subheading'
  | 'bold'
  | 'italic'
  | 'mark'
  | 'inlineCode'
  | 'link'
  | 'task'
  | 'list'
  | 'callout'
  | 'codeBlock'
  | 'table'
  | 'timeline';

const en: PlaygroundMessages = {
  kicker: 'Live compiler',
  title: 'Playground',
  subtitle:
    'Write FluxMark once, then inspect semantic HTML and the transformed AST with the same compiler.',
  statusCompiling: 'Compiling',
  statusReady: 'Compiled locally',
  pluginActive: 'Plugin enabled',
  parseIssues: 'parse issues',
  noParseIssues: 'No parse issues',
  parseIssueSingular: 'parse issue',
  exampleLabel: 'Live result',
  metrics: {
    label: 'Compiler metrics',
    parse: 'AST parse',
    html: 'HTML render',
    nodes: 'AST nodes',
    parseDetail: 'parse + transform',
    htmlDetail: 'semantic output',
    sections: 'sections',
  },
  editor: {
    label: 'FluxMark source editor',
    preset: 'Preset',
    loadPreset: 'Load a preset',
    copy: 'Copy source',
    copied: 'Copied',
    reset: 'Restore preset',
    ready: 'Ready',
    lines: 'lines',
    chars: 'chars',
    cursor: 'Ln {line}, Col {column}',
    spaces: 'Spaces: 2',
    toolbar: {
      heading: 'Heading',
      subheading: 'Subheading',
      bold: 'Bold (Ctrl/Cmd+B)',
      italic: 'Italic (Ctrl/Cmd+I)',
      mark: 'Highlight',
      inlineCode: 'Inline code',
      link: 'Pipe link',
      task: 'Task item',
      list: 'List item',
      callout: 'Callout',
      codeBlock: 'Code block',
      table: 'Key-value table',
      timeline: 'Custom timeline block',
    },
  },
  views: {
    html: 'HTML',
    ast: 'AST',
    preview: 'Preview',
    source: 'Source',
    copyHtml: 'Copy formatted HTML',
    copyAst: 'Copy AST JSON',
    outline: 'Outline',
    onThisPage: 'On this page',
    transformed: 'Transformed AST',
    astHint: 'Slugs, callout metadata and custom blocks are visible in the transformed tree.',
    outputLabel: 'Compiler output',
    viewsLabel: 'Output views',
    untitled: 'Untitled section',
    footerHtml: 'HTML with safe escaping',
    footerAst: 'Post-transform AST',
    allowHtml: 'Raw HTML',
    allowHtmlHint: 'Render !html blocks and !<tag> inline nodes as trusted HTML',
    rawHtmlWarning: 'Raw HTML enabled — trusted input only',
  },
  notices: {
    presetLoaded: 'Loaded {name}',
    presetReset: 'Preset restored',
    htmlCopied: 'Formatted HTML copied',
    astCopied: 'AST JSON copied',
    copyFailed: 'Clipboard permission denied',
    linkFailed: 'This link cannot be opened',
    taskCompleted: 'Line {line} task completed and source updated',
    taskReopened: 'Line {line} task reopened and source updated',
    compileFailed: 'The document could not be compiled',
  },
};

const zh: PlaygroundMessages = {
  kicker: '实时编译',
  title: '工作台',
  subtitle: '编写一次 FluxMark，使用同一套编译器实时检查语义 HTML 与转换后的 AST。',
  statusCompiling: '正在编译',
  statusReady: '本地编译完成',
  pluginActive: '插件已启用',
  parseIssues: '个解析问题',
  noParseIssues: '无解析问题',
  parseIssueSingular: '个解析问题',
  exampleLabel: '实时结果',
  metrics: {
    label: '编译指标',
    parse: 'AST 解析',
    html: 'HTML 编译',
    nodes: 'AST 节点',
    parseDetail: '解析与转换',
    htmlDetail: '语义化输出',
    sections: '个章节',
  },
  editor: {
    label: 'FluxMark 源码编辑器',
    preset: '预设',
    loadPreset: '载入预设文档',
    copy: '复制源码',
    copied: '已复制',
    reset: '恢复当前预设',
    ready: '就绪',
    lines: '行',
    chars: '字符',
    cursor: '行 {line}，列 {column}',
    spaces: '空格：2',
    toolbar: {
      heading: '一级标题',
      subheading: '二级标题',
      bold: '加粗（Ctrl/Cmd+B）',
      italic: '斜体（Ctrl/Cmd+I）',
      mark: '高亮',
      inlineCode: '行内代码',
      link: '管道链接',
      task: '任务项',
      list: '无序列表',
      callout: '提示块',
      codeBlock: '代码块',
      table: '键值数据表',
      timeline: '自定义时间线块',
    },
  },
  views: {
    html: 'HTML',
    ast: 'AST',
    preview: '预览',
    source: '源码',
    copyHtml: '复制格式化 HTML',
    copyAst: '复制 AST JSON',
    outline: '大纲',
    onThisPage: '本页目录',
    transformed: '转换后 AST',
    astHint: '生成后的 slug、容器元数据与自定义块都会出现在转换树中。',
    outputLabel: '编译器输出',
    viewsLabel: '输出视图',
    untitled: '未命名章节',
    footerHtml: '安全转义的 HTML',
    footerAst: '转换后的 AST',
    allowHtml: '原始 HTML',
    allowHtmlHint: '将 !html 块和 !<tag> 行内节点作为可信 HTML 渲染',
    rawHtmlWarning: '原始 HTML 已开启，仅限可信内容',
  },
  notices: {
    presetLoaded: '已载入 {name}',
    presetReset: '已恢复当前预设',
    htmlCopied: '格式化 HTML 已复制',
    astCopied: 'AST JSON 已复制',
    copyFailed: '无法访问剪贴板',
    linkFailed: '无法打开此链接',
    taskCompleted: '第 {line} 行任务已完成，源码已同步',
    taskReopened: '第 {line} 行任务已重开，源码已同步',
    compileFailed: '文档编译失败',
  },
};

export function usePlaygroundI18n(): {
  locale: ComputedRef<PlaygroundLocale>;
  t: ComputedRef<PlaygroundMessages>;
} {
  const { lang } = useData();
  const locale = computed<PlaygroundLocale>(() =>
    lang.value.toLowerCase().startsWith('zh') ? 'zh' : 'en',
  );
  const t = computed(() => (locale.value === 'zh' ? zh : en));
  return { locale, t };
}

export function fillMessage(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    values[key] === undefined ? match : String(values[key]),
  );
}
