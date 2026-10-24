# API reference

This page documents the public exports of the `fluxmark` package. Every API is typed. The complete union types and helper interfaces are defined in [`packages/fluxmark/src/types.ts`](https://github.com/Okysu/fluxmark/blob/main/packages/fluxmark/src/types.ts).

The package exposes named exports from `fluxmark`; it does not provide a default export.

## Compiler

### `FluxMark`

`FluxMark` combines parser options, plugins, and renderer overrides in a reusable compiler instance.

```ts
import { FluxMark } from 'fluxmark'

const flux = new FluxMark()
const ast = flux.parse('Hello')
const html = flux.renderToHTML(ast)

console.log(html)
```

| Member | Type or signature | Description |
| --- | --- | --- |
| `constructor` | `new FluxMark(options?: FluxMarkOptions)` | Create a compiler and register initial plugins |
| `use` | `use(plugin): this` | Register a plugin definition or a zero-option factory |
| `use` | `use(pluginFactory, options): this` | Register a plugin factory with typed options |
| `plugins` | `readonly FluxPluginDefinition[]` | Registered definitions in registration order |
| `createParser` | `(): FluxMarkParser` | Create a parser with the current block rules, modifiers, variants, and issue handler |
| `parse` | `(source: string): FluxDocument` | Parse source and run AST transforms in order |
| `createHtmlRenderer` | `(options?: FluxHtmlRendererOptions): FluxHtmlRenderer` | Merge plugin and call-site HTML overrides |
| `renderToHTML` | `(input: string \| FluxDocument, options?: FluxHtmlRendererOptions): string` | Render source or an existing AST |

`createParser` does not include plugins' `astTransforms` or renderer overrides. Use `parse` when the full compiler pipeline is required. `renderToHTML` applies the compiler's transforms only when its input is a string.

### Convenience functions

| Export | Signature | Description |
| --- | --- | --- |
| `parseFluxMark` | `(source: string, options?: FluxMarkOptions): FluxDocument` | Create a temporary compiler and parse with plugins |
| `renderToHTML` | `(source: string, options?: FluxRenderToHtmlOptions): string` | Parse with plugins and render semantic HTML |

`renderToHTML` accepts parser settings in `parser`, plugin definitions in `plugins`, and passes the remaining fields to the HTML renderer:

```ts
import { renderToHTML } from 'fluxmark'

const source = '# Hello\n  World'
const html = renderToHTML(source, {
  parser: {
    onIssue(issue) {
      console.warn(issue.message)
    },
  },
  plugins: [],
  classPrefix: 'fx',
  documentWrapper: true,
})

console.log(html)
```

## Parser

| Export | Signature or member | Description |
| --- | --- | --- |
| `FluxMarkParser` | `new FluxMarkParser(options?: FluxParserOptions)` | Standalone block and inline parser |
| `parse` | `(source: string): FluxDocument` | Parse new source and reset per-parse diagnostics |
| `registeredCalloutVariants` | `ReadonlySet<string>` | Built-in and custom callout variants, stored lowercase |
| `parseFluxMarkDocument` | `(source: string, options?: FluxParserOptions): FluxDocument` | Parse without constructing a `FluxMark` or running transforms |
| `tokenizeFluxLines` | `(source: string): FluxSourceLine[]` | Split physical lines and compute indentation and offsets |
| `createFluxNodeBase` | `(line: FluxSourceLine): FluxNodeBase` | Create standard position fields for extension nodes |
| `toggleTaskInSource` | `(source: string, line: number, checked?: boolean): string` | Change one task state character without reformatting source |

`FluxMarkParser` and `parseFluxMarkDocument` do not run `astTransforms` from `FluxMark` plugins. Use `parseFluxMark` or `FluxMark.parse` for the complete plugin pipeline.

`toggleTaskInSource` uses one-based line numbers. When `checked` is omitted, it inverts the current state. It returns the original string when the target line is not a task item.

### `FluxParserOptions`

| Field | Type | Description |
| --- | --- | --- |
| `blockRules` | `FluxBlockRule[]` | Custom block rules |
| `pipeModifiers` | `Record<string, FluxPipeModifier>` | Pipe modifier handlers |
| `calloutVariants` | `string[]` | Additional callout variant names |
| `onIssue` | `(issue: FluxParseIssue) => void` | Diagnostic callback |

`FluxMarkOptions` extends these fields with `plugins?: FluxPluginDefinition[]`.

### Diagnostics

```ts
interface FluxParseIssue {
  severity: 'warning' | 'error'
  message: string
  line: number
  column: number
}
```

Diagnostics are also stored in `FluxDocument.issues`. When `onIssue` is provided, it is called synchronously as each issue is recorded.

## AST types

`FluxNode` is `FluxDocument | FluxBlockNode`. The block node union contains:

| `type` | Key fields |
| --- | --- |
| `Section` | `level`, `title`, `children`, optional `id` |
| `Paragraph` | `tokens` |
| `Callout` | `variant`, `title`, `children` |
| `CodeBlock` | `language`, `code`, `lines` |
| `DataTable` | `title`, `columns`, `rows` |
| `List` | `ordered`, `start`, `children: FluxListItem[]` |
| `ListItem` | `marker`, `ordinal`, `checked`, `taskMarkerOffset`, `children` |
| `HorizontalRule` | Common position fields only |
| `CustomBlock` | `name`, `content`, `attributes`, `children` |

`FluxDocument` additionally contains `children: FluxBlockNode[]` and `issues: FluxParseIssue[]`.

Every node has `line`, `column`, `indent`, and `range`. Lines and columns are one-based. `range` is a zero-based, end-exclusive `{ start, end }` offset pair. `FluxNodeType`, `FluxNodeByType<T>`, and `FluxParentNode` support generic AST utilities.

Source lines returned by `tokenizeFluxLines` include:

| Field | Meaning |
| --- | --- |
| `number` | One-based line number |
| `raw` | Raw line without its terminator |
| `content` | Content after physical indentation |
| `offset` | Zero-based offset of the first character |
| `indent` | Indentation width; a tab counts as two columns |
| `indentLength` | Number of source characters occupied by indentation |

### Inline tokens

`FluxInlineToken.type` is `'text' | 'style' | 'code' | 'break'`. Each token contains `content: string`, `style: FluxInlineStyle`, and `attributes: Record<string, string>`.

```ts
interface FluxInlineStyle {
  bold: boolean
  italic: boolean
  underline: boolean
  strike: boolean
  mark: boolean
  code: boolean
  color: string | null
  href: string | null
  tooltip: string | null
  customModifiers: string[]
}
```

## AST walking

| Export | Signature | Description |
| --- | --- | --- |
| `walkAST` | `(ast: FluxDocument, visitor: FluxVisitor): FluxDocument` | In-place depth-first traversal; returns the document root |
| `FluxASTWalker` | `new FluxASTWalker(visitor)` | Reusable visitor wrapper with `.walk(ast)` |
| `countASTNodes` | `(ast: FluxDocument): number` | Count every visited node, including the `Document` root |
| `isFluxContainer` | `(node: FluxNode): node is FluxParentNode` | Test whether a node has `children` |
| `isFluxBlockNode` | `(node: FluxNode): node is FluxBlockNode` | Exclude the `Document` root |

`FluxVisitor` registers `{ enter?, leave? }` hooks by node type or with `'*'`. The callback's `FluxWalkContext` exposes readonly `path` plus `skip()`, `remove()`, and `replace(node)`. See the [AST walker guide](/guide/walker).

## HTML rendering

| Export | Signature | Description |
| --- | --- | --- |
| `FluxHtmlRenderer` | `new FluxHtmlRenderer(options?: FluxHtmlRendererOptions)` | Create a reusable HTML renderer |
| `render` | `(document: FluxDocument): string` | Render a complete document |
| `renderInline` | `(tokens: FluxInlineToken[]): string` | Render an inline token array |
| `toHTML` | `(document: FluxDocument, options?: FluxHtmlRendererOptions): string` | Render an existing AST |
| `escapeHtml` | `(value: string): string` | Escape text and common HTML special characters |
| `escapeAttribute` | `(value: string): string` | Escape an attribute value and handle backticks |
| `safeFluxUrl` | `(value: string): string \| null` | Validate relative URLs or allowlisted protocols |

### `FluxHtmlRendererOptions`

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `overrides` | `FluxHtmlRendererOverrides` | `{}` | Node and `InlineToken` overrides |
| `classPrefix` | `string` | `'fx'` | Output CSS class prefix, normalized to a safe token |
| `documentWrapper` | `boolean` | `true` | Wrap output in an `<article>` document container |
| `allowHtml` | `boolean` | `false` | Emit raw HTML blocks and inline HTML tokens without escaping; trusted content only |

`FluxRenderToHtmlOptions` extends these fields with `parser?: FluxParserOptions` and `plugins?: FluxPluginDefinition[]`.

Node overrides have the shape `(node, childrenHtml, helper) => string`. The helper exposes `escapeHtml`, `escapeAttribute`, `safeUrl`, `renderInline`, `renderChildren`, and `defaultRender()`. An `InlineToken` override receives `(token, defaultRender, helper)`, where `defaultRender(token?)` renders the current or a supplied token. See the [renderer guide](/guide/renderers#node-overrides-and-defaultrender).

## Inline parsing and construction

| Export | Signature | Description |
| --- | --- | --- |
| `FluxInlineParser` | `new FluxInlineParser(modifiers?)` | Create a standalone inline parser |
| `parseFluxInline` | `(input: string, modifiers?): FluxInlineToken[]` | Parse one inline text string |
| `createFluxInlineStyle` | `(): FluxInlineStyle` | Create a style object with every flag disabled |
| `createFluxInlineToken` | `(type, content, style?, attributes?): FluxInlineToken` | Create an inline token |

Block-level `walkAST` does not visit inline tokens separately. Process tokens in the callback of the node that owns them.

## Default styles

| Export | Signature | Description |
| --- | --- | --- |
| `getFluxDefaultStyles` | `(): string` | Return the standalone default CSS for the `fx` class prefix |

The package also exports `fluxmark/styles.css`. Both sources provide the same default styles; loading both duplicates the CSS.

## Plugin types

| Type | Purpose |
| --- | --- |
| `FluxPluginDefinition` | Plugin object with four extension points plus optional name and callout variants |
| `FluxPluginFactory<Options>` | Function that accepts options and returns a plugin definition |
| `FluxPlugin<Options>` | Union of a plugin definition and a plugin factory |
| `FluxBlockRule` | Block rule with `parse(context)` |
| `FluxPipeModifier` | Pipe modifier handler |
| `FluxASTTransform` | Document transform function |
| `FluxHtmlRendererOverrides` | HTML node and inline token overrides |

See the [plugin guide](/guide/plugins) for lifecycle and composition examples.
