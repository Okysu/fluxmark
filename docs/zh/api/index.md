# API 参考

本页列出 `fluxmark` 包的主要公开导出。所有 API 都提供 TypeScript 类型；完整联合类型与辅助接口见[类型源码](https://github.com/Okysu/fluxmark/blob/main/packages/fluxmark/src/types.ts)。

包从 `fluxmark` 提供命名导出，不提供默认导出。

## 编译器

### `FluxMark`

`FluxMark` 组合解析选项、插件与渲染覆盖，形成可复用的编译器实例。

```ts
import { FluxMark } from 'fluxmark'

const flux = new FluxMark()
const ast = flux.parse('Hello')
const html = flux.renderToHTML(ast)

console.log(html)
```

| 成员 | 类型或签名 | 说明 |
| --- | --- | --- |
| `constructor` | `new FluxMark(options?: FluxMarkOptions)` | 创建编译器并注册初始插件 |
| `use` | `use(plugin): this` | 注册插件定义或无参数工厂 |
| `use` | `use(pluginFactory, options): this` | 使用强类型选项注册插件工厂 |
| `plugins` | `readonly FluxPluginDefinition[]` | 按注册顺序暴露定义数组 |
| `createParser` | `(): FluxMarkParser` | 创建包含当前块规则、修饰符、提示变体和诊断回调的解析器 |
| `parse` | `(source: string): FluxDocument` | 解析源码并按顺序执行 AST 转换 |
| `createHtmlRenderer` | `(options?: FluxHtmlRendererOptions): FluxHtmlRenderer` | 合并插件与调用处的 HTML 覆盖 |
| `renderToHTML` | `(input: string \| FluxDocument, options?: FluxHtmlRendererOptions): string` | 渲染源码或已有 AST |

`createParser` 不包含插件的 `astTransforms` 或渲染覆盖。需要完整编译管线时使用 `parse`。`renderToHTML` 只在输入为字符串时执行编译器注册的转换。

### 便捷函数

| 导出 | 签名 | 说明 |
| --- | --- | --- |
| `parseFluxMark` | `(source: string, options?: FluxMarkOptions): FluxDocument` | 创建临时编译器并解析，支持插件 |
| `renderToHTML` | `(source: string, options?: FluxRenderToHtmlOptions): string` | 完成插件解析并生成语义化 HTML |

`renderToHTML` 的 `parser` 接收解析器设置，`plugins` 接收插件定义，其余字段传给 HTML 渲染器：

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

## 解析器

| 导出 | 签名或成员 | 说明 |
| --- | --- | --- |
| `FluxMarkParser` | `new FluxMarkParser(options?: FluxParserOptions)` | 独立块级与行内解析器 |
| `parse` | `(source: string): FluxDocument` | 解析新源码并重置本次诊断 |
| `registeredCalloutVariants` | `ReadonlySet<string>` | 内置和自定义提示变体，保存为小写 |
| `parseFluxMarkDocument` | `(source: string, options?: FluxParserOptions): FluxDocument` | 不创建 `FluxMark`、不执行转换的解析便捷函数 |
| `tokenizeFluxLines` | `(source: string): FluxSourceLine[]` | 切分物理行并计算缩进和偏移 |
| `createFluxNodeBase` | `(line: FluxSourceLine): FluxNodeBase` | 为扩展节点创建标准位置字段 |
| `toggleTaskInSource` | `(source: string, line: number, checked?: boolean): string` | 切换任务状态字符，不重排源码 |

`FluxMarkParser` 和 `parseFluxMarkDocument` 不执行 `FluxMark` 插件中的 `astTransforms`。需要完整插件管线时使用 `parseFluxMark` 或 `FluxMark.parse`。

`toggleTaskInSource` 的行号从 1 开始。省略 `checked` 时取反；目标不是任务行时返回原字符串。

### `FluxParserOptions`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `blockRules` | `FluxBlockRule[]` | 自定义块级规则 |
| `pipeModifiers` | `Record<string, FluxPipeModifier>` | 管道修饰符处理器 |
| `calloutVariants` | `string[]` | 额外提示块变体 |
| `onIssue` | `(issue: FluxParseIssue) => void` | 诊断回调 |

`FluxMarkOptions` 继承这些字段，并增加 `plugins?: FluxPluginDefinition[]`。

### 诊断

```ts
interface FluxParseIssue {
  severity: 'warning' | 'error'
  message: string
  line: number
  column: number
}
```

诊断同时进入 `FluxDocument.issues`；提供 `onIssue` 时，每记录一条诊断都会同步调用回调。

## AST 类型

`FluxNode` 是 `FluxDocument | FluxBlockNode`。`FluxBlockNode` 包含以下节点：

| `type` | 关键字段 |
| --- | --- |
| `Section` | `level`、`title`、`children`、可选 `id` |
| `Paragraph` | `tokens` |
| `Callout` | `variant`、`title`、`children` |
| `CodeBlock` | `language`、`code`、`lines` |
| `DataTable` | `title`、`columns`、`rows` |
| `List` | `ordered`、`start`、`children: FluxListItem[]` |
| `ListItem` | `marker`、`ordinal`、`checked`、`taskMarkerOffset`、`children` |
| `HorizontalRule` | 仅通用位置字段 |
| `CustomBlock` | `name`、`content`、`attributes`、`children` |

`FluxDocument` 另含 `children: FluxBlockNode[]` 和 `issues: FluxParseIssue[]`。

所有节点都有 `line`、`column`、`indent` 和 `range`。行列位置从 1 开始；`range` 是零基、末端不包含的 `{ start, end }`。`FluxNodeType`、`FluxNodeByType<T>` 和 `FluxParentNode` 可用于编写泛型 AST 工具。

`tokenizeFluxLines` 返回的源码行包含：

| 字段 | 含义 |
| --- | --- |
| `number` | 一基行号 |
| `raw` | 不含行终止符的原始行 |
| `content` | 移除物理缩进后的内容 |
| `offset` | 行首字符的零基偏移 |
| `indent` | 缩进宽度；制表符按两列计算 |
| `indentLength` | 缩进占用的源码字符数 |

### 行内 token

`FluxInlineToken.type` 为 `'text' | 'style' | 'code' | 'break'`。每个 token 包含 `content: string`、`style: FluxInlineStyle` 和 `attributes: Record<string, string>`。

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

## AST 遍历

| 导出 | 签名 | 说明 |
| --- | --- | --- |
| `walkAST` | `(ast: FluxDocument, visitor: FluxVisitor): FluxDocument` | 原地深度优先遍历并返回文档根 |
| `FluxASTWalker` | `new FluxASTWalker(visitor)` | 封装可复用 visitor，调用 `.walk(ast)` |
| `countASTNodes` | `(ast: FluxDocument): number` | 统计所有被访问节点，包括 `Document` 根 |
| `isFluxContainer` | `(node: FluxNode): node is FluxParentNode` | 判断节点是否含 `children` |
| `isFluxBlockNode` | `(node: FluxNode): node is FluxBlockNode` | 排除 `Document` 根 |

`FluxVisitor` 按节点类型或 `'*'` 注册 `{ enter?, leave? }`。回调中的 `FluxWalkContext` 提供只读 `path` 以及 `skip()`、`remove()`、`replace(node)`。详见 [AST 遍历](/zh/guide/walker)。

## HTML 渲染

| 导出 | 签名 | 说明 |
| --- | --- | --- |
| `FluxHtmlRenderer` | `new FluxHtmlRenderer(options?: FluxHtmlRendererOptions)` | 创建可复用 HTML 渲染器 |
| `render` | `(document: FluxDocument): string` | 渲染完整文档 |
| `renderInline` | `(tokens: FluxInlineToken[]): string` | 渲染行内 token 数组 |
| `toHTML` | `(document: FluxDocument, options?: FluxHtmlRendererOptions): string` | 渲染已有 AST |
| `escapeHtml` | `(value: string): string` | 转义文本和常用 HTML 特殊字符 |
| `escapeAttribute` | `(value: string): string` | 在 HTML 转义之上处理反引号 |
| `safeFluxUrl` | `(value: string): string \| null` | 验证相对 URL 或协议白名单 |

### `FluxHtmlRendererOptions`

| 字段 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `overrides` | `FluxHtmlRendererOverrides` | `{}` | 节点或 `InlineToken` 覆盖 |
| `classPrefix` | `string` | `'fx'` | 输出 CSS 类前缀，会规范化为安全类名 |
| `documentWrapper` | `boolean` | `true` | 是否输出 `<article>` 文档容器 |

`FluxRenderToHtmlOptions` 继承这些字段，并增加 `parser?: FluxParserOptions` 与 `plugins?: FluxPluginDefinition[]`。

节点覆盖的形态为 `(node, childrenHtml, helper) => string`。helper 提供 `escapeHtml`、`escapeAttribute`、`safeUrl`、`renderInline`、`renderChildren` 和 `defaultRender()`。`InlineToken` 覆盖接收 `(token, defaultRender, helper)`，其中 `defaultRender(token?)` 可渲染当前或指定 token。详见[渲染器](/zh/guide/renderers#节点覆盖与-defaultrender)。

## 行内解析与构造

| 导出 | 签名 | 说明 |
| --- | --- | --- |
| `FluxInlineParser` | `new FluxInlineParser(modifiers?)` | 创建独立行内解析器 |
| `parseFluxInline` | `(input: string, modifiers?): FluxInlineToken[]` | 解析一段行内文本 |
| `createFluxInlineStyle` | `(): FluxInlineStyle` | 创建默认关闭的样式对象 |
| `createFluxInlineToken` | `(type, content, style?, attributes?): FluxInlineToken` | 创建行内 token |

块级 `walkAST` 不会单独访问行内 token；需要处理 token 时，遍历包含它们的节点。

## 默认样式

| 导出 | 签名 | 说明 |
| --- | --- | --- |
| `getFluxDefaultStyles` | `(): string` | 返回 `fx` 前缀的独立默认 CSS 字符串 |

也可以使用包导出 `fluxmark/styles.css`。两种方式提供同一份默认样式，不需要同时重复加载。

## 插件类型

| 类型 | 用途 |
| --- | --- |
| `FluxPluginDefinition` | 插件对象，含四类扩展点和可选名称、提示变体 |
| `FluxPluginFactory<Options>` | 接收选项并返回插件定义 |
| `FluxPlugin<Options>` | 插件定义或工厂的联合类型 |
| `FluxBlockRule` | 块规则及 `parse(context)` |
| `FluxPipeModifier` | 管道修饰符处理器 |
| `FluxASTTransform` | 文档转换函数 |
| `FluxHtmlRendererOverrides` | HTML 节点和行内覆盖 |

插件定义与生命周期示例见[插件系统](/zh/guide/plugins)。
