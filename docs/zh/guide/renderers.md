# HTML 渲染器

FluxMark 将解析与渲染分离。同一份 `FluxDocument` 可以直接从源码渲染，也可以通过配置好的 `FluxHtmlRenderer` 复用，或在插件 Transform 之后输出。

## 入口选择

| 场景 | 入口 |
| --- | --- |
| 直接从源码生成 HTML | `renderToHTML(source, options)` |
| 渲染已有 AST | `toHTML(ast, options)` |
| 复用渲染配置 | `new FluxHtmlRenderer(options).render(ast)` |
| 共享插件、Transform 与覆盖 | `flux.renderToHTML(input, options)` |

```ts
import { FluxHtmlRenderer, parseFluxMark, renderToHTML, toHTML } from 'fluxmark'

const source = '# 渲染器\n  一棵 AST，输出语义化结果。'
const ast = parseFluxMark(source)

const fromSource = renderToHTML(source)
const fromAst = toHTML(ast)
const reusable = new FluxHtmlRenderer({ documentWrapper: false })
const withoutWrapper = reusable.render(ast)

console.log(fromSource, fromAst, withoutWrapper)
```

`FluxMark.renderToHTML` 同时接受源码与 AST。顶层 `renderToHTML` 会解析源码并执行插件 Transform。

## HTML 选项

```ts
const renderer = new FluxHtmlRenderer({
  classPrefix: 'fx',
  documentWrapper: true,
  overrides: {},
})
```

| 选项 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `classPrefix` | `string` | `'fx'` | 输出类名前缀，会被规范化为安全类名 |
| `documentWrapper` | `boolean` | `true` | 使用 `<article class="fx-document">` 包裹文档 |
| `overrides` | `FluxHtmlRendererOverrides` | `{}` | 块节点与 `InlineToken` 覆盖 |

默认样式使用 `fx` 前缀。通过 `import 'fluxmark/styles.css'` 或注入一次 `getFluxDefaultStyles()` 加载。修改前缀时，需要自行提供匹配的样式选择器。

## 默认语义结构

| AST 节点 | 默认 HTML |
| --- | --- |
| `Document` | `<article class="fx-document">` |
| `Section` | `<section>` 与 `<h1>` 至 `<h6>` 标题 |
| `Paragraph` | `<p>`；`break` token 输出 `<br />` |
| `Callout` | `quote` 为 `<blockquote>`，其他变体为 `<aside>` |
| `CodeBlock` | 语言信息、`<pre>` 与 `<code>` |
| `DataTable` | `<figure>`、可选 `<figcaption>` 与语义化表格 |
| `List` | 需要时保留 `start` 的 `<ul>` 或 `<ol>` |
| `ListItem` | `<li>` 与源码元数据；任务项包含复选框 |
| `HorizontalRule` | `<hr />` |
| `CustomBlock` | 带 `data-name` 的容器，内容默认转义 |

行内样式使用 `<strong>`、`<em>`、`<u>`、`<s>`、`<mark>`、`<code>` 等语义元素。自定义修饰符 `kbd`、`badge` 与 `spoiler` 也有内置 HTML 结构和默认样式。

## 安全与 URL 策略

默认渲染器会：

- 转义文本、代码、表头、tooltip 属性与自定义块内容。
- 转义所有动态属性和 CSS 类片段。
- 允许相对 URL 以及 `http:`、`https:`、`mailto:`、`tel:` 协议。
- 拒绝危险协议、控制字符、协议相对 URL 和前导反斜杠。
- 为 HTTP(S) 链接添加 `target="_blank"` 与 `rel="noopener noreferrer nofollow"`。
- 将行内颜色限制为三位或六位十六进制格式。

```ts
import { safeFluxUrl } from 'fluxmark'

safeFluxUrl('/zh/guide/getting-started') // '/zh/guide/getting-started'
safeFluxUrl('https://example.com') // 'https://example.com'
safeFluxUrl('javascript:alert(1)') // null
```

渲染器无法清理自定义覆盖返回的任意 HTML。只加载可信插件，并使用 helper 转义所有不可信内容。

## 节点覆盖与 `defaultRender`

节点覆盖接收 `(node, childrenHtml, helper)`。调用 `helper.defaultRender()` 可以保留默认结构并在外层包装：

```ts
import { FluxHtmlRenderer } from 'fluxmark'

const renderer = new FluxHtmlRenderer({
  overrides: {
    Section(node, _childrenHtml, helper) {
      return `<div class="section-shell" data-level="${node.level}">${helper.defaultRender()}</div>`
    },
    CustomBlock(node, _childrenHtml, helper) {
      if (node.name !== 'math') return helper.defaultRender()
      return `<output data-kind="math">${helper.escapeHtml(node.content)}</output>`
    },
  },
})
```

`defaultRender()` 只执行当前节点的默认渲染，不会递归调用当前覆盖。`childrenHtml` 已经包含子节点覆盖后的输出，因此默认结构与自定义包装可以自然组合。

节点 helper：

| Helper | 用途 |
| --- | --- |
| `escapeHtml(value)` | 转义文本与 HTML 特殊字符 |
| `escapeAttribute(value)` | 转义属性值并处理反引号 |
| `safeUrl(value)` | 返回允许的 URL 或 `null` |
| `renderInline(tokens)` | 使用行内覆盖渲染 token |
| `renderChildren(blocks)` | 渲染块节点数组 |
| `defaultRender()` | 执行当前节点的默认输出 |

## 行内 Token 覆盖

`InlineToken` 接收 token、`defaultRender(token?)` 和一个不包含节点级 `defaultRender` 的 helper：

```ts
const renderer = new FluxHtmlRenderer({
  overrides: {
    InlineToken(token, defaultRender, helper) {
      if (token.attributes.kind === 'badge') {
        return `<data value="${helper.escapeAttribute(token.attributes.kind)}">${defaultRender()}</data>`
      }
      return defaultRender()
    },
  },
})
```

向 `defaultRender(replacement)` 传入其他 token 时，会使用默认行内逻辑渲染该 token。覆盖中插入任何原始内容或属性时，必须自行转义。

## 插件与调用处优先级

通过 `FluxMark` 创建渲染器时，先合并插件的 HTML 覆盖；随后合并传给 `createHtmlRenderer` 或 `renderToHTML` 的 `overrides`。因此同一节点类型或 `InlineToken` 以调用处配置为准。

```ts
const html = flux.renderToHTML(source, {
  overrides: {
    Paragraph(_node, _childrenHtml, helper) {
      return `<p class="article-copy">${helper.defaultRender()}</p>`
    },
  },
})
```

## 任务交互

任务复选框包含：

- `data-flux-task`：标识可交互任务。
- `data-flux-line`：一基源码行号。
- `data-flux-offset`：任务状态字符的绝对偏移。

监听 `change`，调用 `toggleTaskInSource`，然后重新渲染。渲染器本身不会修改源文本。

```ts
import { renderToHTML, toggleTaskInSource } from 'fluxmark'

let source = '# 任务\n  * [ ] 编写文档\n'
const app = document.querySelector<HTMLElement>('#app')!
app.innerHTML = renderToHTML(source)

app.addEventListener('change', (event) => {
  const target = event.target
  if (!(target instanceof HTMLInputElement)) return
  if (!target.matches('[data-flux-task]')) return
  source = toggleTaskInSource(source, Number(target.dataset.fluxLine), target.checked)
  app.innerHTML = renderToHTML(source)
})
```

## 安全边界与可信覆盖

默认渲染器为编译器可控内容提供严格边界。插件与覆盖属于可信应用代码；如果插入未转义值，就会绕过该边界。接收不可信源码或插件时，应配置内容安全策略和输入限制。

## 性能

HTML 渲染是 AST 的线性遍历。与解析不同，输出体积会直接影响内存分配和字符串构建。复用渲染器实例，避免重解析未变化的源码，并在交互式编辑器中合并或防抖渲染。超大表格和深层层级仍会产生等比例的大体积 HTML。
