/** A zero-based, end-exclusive source offset range. */
export interface FluxSourceRange {
  start: number;
  end: number;
}

export interface FluxSourceLine {
  /** One-based source line number. */
  number: number;
  /** Raw line without its line terminator. */
  raw: string;
  /** Content after the physical indentation. */
  content: string;
  /** Zero-based offset of the first character in the raw line. */
  offset: number;
  /** Indentation width. A tab is exactly two columns. */
  indent: number;
  /** Number of source characters occupied by the indentation. */
  indentLength: number;
}

export interface FluxNodeBase {
  line: number;
  column: number;
  indent: number;
  range: FluxSourceRange;
}

export interface FluxDocument extends FluxNodeBase {
  type: 'Document';
  children: FluxBlockNode[];
  issues: FluxParseIssue[];
}

export interface FluxSection extends FluxNodeBase {
  type: 'Section';
  level: 1 | 2 | 3 | 4 | 5 | 6;
  title: FluxInlineToken[];
  children: FluxBlockNode[];
  /** Optional anchor populated by an AST transform. */
  id?: string;
}

export interface FluxParagraph extends FluxNodeBase {
  type: 'Paragraph';
  tokens: FluxInlineToken[];
}

export type FluxBuiltInCalloutVariant = 'quote' | 'note' | 'tip' | 'warn' | 'danger';

export interface FluxCallout extends FluxNodeBase {
  type: 'Callout';
  variant: FluxBuiltInCalloutVariant | (string & {});
  title: FluxInlineToken[];
  children: FluxBlockNode[];
}

export interface FluxCodeBlock extends FluxNodeBase {
  type: 'CodeBlock';
  language: string;
  code: string;
  lines: string[];
}

export interface FluxDataTable extends FluxNodeBase {
  type: 'DataTable';
  title: FluxInlineToken[];
  columns: string[];
  rows: FluxDataTableRow[];
}

export interface FluxDataTableRow {
  line: number;
  cells: Record<string, FluxDataTableCell>;
}

export interface FluxDataTableCell {
  line: number;
  tokens: FluxInlineToken[];
}

export interface FluxList extends FluxNodeBase {
  type: 'List';
  ordered: boolean;
  start: number;
  children: FluxListItem[];
}

export interface FluxListItem extends FluxNodeBase {
  type: 'ListItem';
  marker: string;
  /** Outline segments for ordered lists, for example [1, 2, 1]. */
  ordinal: number[] | null;
  /** Null for a regular item, false for [ ], true for [x]. */
  checked: boolean | null;
  /** Absolute offset of the task state character, when this is a task item. */
  taskMarkerOffset: number | null;
  children: FluxBlockNode[];
}

export interface FluxHorizontalRule extends FluxNodeBase {
  type: 'HorizontalRule';
}

export interface FluxCustomBlock extends FluxNodeBase {
  type: 'CustomBlock';
  name: string;
  content: string;
  attributes: Record<string, string>;
  children: FluxBlockNode[];
}

export type FluxBlockNode =
  | FluxSection
  | FluxParagraph
  | FluxCallout
  | FluxCodeBlock
  | FluxDataTable
  | FluxList
  | FluxListItem
  | FluxHorizontalRule
  | FluxCustomBlock;

export type FluxNode = FluxDocument | FluxBlockNode;
export type FluxNodeType = FluxNode['type'];
export type FluxNodeByType<T extends FluxNodeType> = Extract<FluxNode, { type: T }>;
export type FluxParentNode = Extract<FluxNode, { children: unknown[] }>;

export type FluxInlineTokenType = 'text' | 'style' | 'code' | 'image' | 'break';

export interface FluxInlineStyle {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  mark: boolean;
  code: boolean;
  color: string | null;
  href: string | null;
  tooltip: string | null;
  customModifiers: string[];
}

export interface FluxInlineToken {
  type: FluxInlineTokenType;
  content: string;
  style: FluxInlineStyle;
  /** Extension metadata produced by pipe modifier plugins. */
  attributes: Record<string, string>;
}

export type FluxParseIssueSeverity = 'warning' | 'error';

export interface FluxParseIssue {
  severity: FluxParseIssueSeverity;
  message: string;
  line: number;
  column: number;
}

export interface FluxWalkContext {
  /** Ancestors from the root to the current parent. */
  readonly path: readonly FluxNode[];
  skip(): void;
  remove(): void;
  replace(node: FluxNode): void;
}

export type FluxVisitFunction<N extends FluxNode = FluxNode> = (
  node: N,
  parent: FluxParentNode | null,
  index: number,
  context: FluxWalkContext,
) => void;

export interface FluxVisitorHooks<N extends FluxNode = FluxNode> {
  enter?: FluxVisitFunction<N>;
  leave?: FluxVisitFunction<N>;
}

export type FluxVisitor = {
  [K in FluxNodeType]?: FluxVisitorHooks<FluxNodeByType<K>>;
} & {
  '*'?: FluxVisitorHooks<FluxNode>;
};

export interface FluxBlockRuleContext {
  readonly source: string;
  readonly lines: readonly FluxSourceLine[];
  readonly index: number;
  readonly line: FluxSourceLine;
  readonly parentIndent: number;
  readonly sectionDepth: number;
  parseInline(text: string): FluxInlineToken[];
}

export interface FluxBlockRuleResult {
  node: FluxBlockNode;
  /** Number of physical source lines consumed, including the current line. */
  consumed?: number;
}

export interface FluxBlockRule {
  name: string;
  /** Larger values run earlier. Custom rules default to 100. */
  priority?: number;
  parse(context: FluxBlockRuleContext): FluxBlockRuleResult | null;
}

export interface FluxPipeModifierContext {
  readonly content: string;
  readonly modifier: string;
  readonly style: FluxInlineStyle;
  readonly attributes: Record<string, string>;
}

/** Return false to leave a modifier unhandled, true to consume it, or style fields to merge. */
export type FluxPipeModifierResult = boolean | Partial<FluxInlineStyle> | void;
export type FluxPipeModifier = (
  modifier: string,
  context: FluxPipeModifierContext,
) => FluxPipeModifierResult;

export interface FluxASTTransformContext {
  readonly source: string;
}

export type FluxASTTransform = (
  document: FluxDocument,
  context: FluxASTTransformContext,
) => FluxDocument | void;

export interface FluxHtmlRenderHelper {
  escapeHtml(value: string): string;
  escapeAttribute(value: string): string;
  safeUrl(value: string): string | null;
  renderInline(tokens: FluxInlineToken[]): string;
  renderChildren(children: FluxBlockNode[]): string;
  defaultRender(): string;
}

export type FluxHtmlNodeOverride<N extends FluxNode = FluxNode> = (
  node: N,
  childrenHtml: string,
  helper: FluxHtmlRenderHelper,
) => string;

export type FluxInlineTokenOverride = (
  token: FluxInlineToken,
  defaultRender: (token?: FluxInlineToken) => string,
  helper: Omit<FluxHtmlRenderHelper, 'defaultRender'>,
) => string;

export type FluxHtmlRendererOverrides = {
  [K in FluxNodeType]?: FluxHtmlNodeOverride<FluxNodeByType<K>>;
} & {
  InlineToken?: FluxInlineTokenOverride;
};

export interface FluxPluginDefinition {
  name?: string;
  /** Register additional callout variant names for documentation and tooling. */
  calloutVariants?: string[];
  blockRules?: FluxBlockRule[];
  pipeModifiers?: Record<string, FluxPipeModifier>;
  astTransforms?: FluxASTTransform[];
  htmlRenderers?: FluxHtmlRendererOverrides;
}

export type FluxPluginFactory<Options> = (options: Options) => FluxPluginDefinition;
export type FluxPlugin<Options = void> = FluxPluginDefinition | FluxPluginFactory<Options>;

export interface FluxParserOptions {
  blockRules?: FluxBlockRule[];
  pipeModifiers?: Record<string, FluxPipeModifier>;
  calloutVariants?: string[];
  onIssue?: (issue: FluxParseIssue) => void;
}

export interface FluxMarkOptions extends FluxParserOptions {
  plugins?: FluxPluginDefinition[];
}

export interface FluxHtmlRendererOptions {
  overrides?: FluxHtmlRendererOverrides;
  /** Defaults to "fx". */
  classPrefix?: string;
  /** Wrap the document in an article element. Defaults to true. */
  documentWrapper?: boolean;
}

export interface FluxRenderToHtmlOptions extends FluxHtmlRendererOptions {
  parser?: FluxParserOptions;
  plugins?: FluxPluginDefinition[];
}
