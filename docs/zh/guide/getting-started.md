# 快速上手

FluxMark 是一个 TypeScript 包，用于把结构化文本解析为类型化 AST，并将同一棵 AST 渲染为语义化 HTML。SDK 没有运行时依赖。

## 安装

::: code-group

```bash [pnpm]
pnpm add fluxmark
```

```bash [npm]
npm install fluxmark
```

```bash [yarn]
yarn add fluxmark
```

:::

解析器和 HTML 渲染器可在 Node.js 18 及以上版本以及现代浏览器中运行。仓库自身的开发环境使用 Node.js 20.19 及以上版本，并通过 `packageManager` 字段固定 pnpm 版本。

## 解析并渲染 HTML

```ts
import { parseFluxMark, renderToHTML } from 'fluxmark'
import 'fluxmark/styles.css'

const source = `# Hello FluxMark
  将 [结构化文本|b] 解析为类型化 AST。
  > [tip] 复用同一个编译器
    插件和渲染器可以共享同一棵 AST。
  * [x] 安装
  * [ ] 渲染
`

const ast = parseFluxMark(source)
const html = renderToHTML(source)

console.log(ast.type, ast.issues)
console.log(html)
```

`parseFluxMark` 返回 `FluxDocument`，其中包含块级 `children`、解析 `issues` 与源码位置。`renderToHTML` 会解析源码、执行插件的 AST 转换，并默认返回以 `<article class="fx-document">` 包裹的语义化 HTML。

在浏览器中，可以渲染并挂载结果：

```ts
import { renderToHTML } from 'fluxmark'

const html = renderToHTML('# Hello browser\n  使用 renderToHTML 挂载。')
const app = document.querySelector<HTMLElement>('#app')
if (app === null) throw new Error('Missing #app container')

app.innerHTML = html
```

如果已有 AST，不需要再次解析，可使用 `FluxHtmlRenderer` 或 `toHTML`：

```ts
import { FluxHtmlRenderer, parseFluxMark, toHTML } from 'fluxmark'

const ast = parseFluxMark('# 渲染器\n  同一棵 AST，两种 HTML 入口。')
const withWrapper = new FluxHtmlRenderer().render(ast)
const withoutWrapper = toHTML(ast, { documentWrapper: false })

console.log(withWrapper, withoutWrapper)
```

## 主要入口

主入口同时提供编译器、分阶段组件和函数式便捷 API：

```ts
import {
  FluxMark,
  FluxMarkParser,
  FluxHtmlRenderer,
  walkAST,
  parseFluxMark,
  renderToHTML,
} from 'fluxmark'
```

- `FluxMark`：组合解析选项、插件和渲染覆盖，适合长期复用。
- `FluxMarkParser`：只负责源码到 AST 的解析，不执行 `FluxMark` 的 AST 转换。
- `FluxHtmlRenderer`：把已有 `FluxDocument` 渲染为 HTML。
- `walkAST`：原地遍历和修改 AST。
- `parseFluxMark`：单次解析，支持插件。
- `renderToHTML`：从源文本直接生成 HTML。

包使用命名导出。请从 `fluxmark` 导入类与函数，不要依赖默认导出。

## 复用编译器实例

当解析和渲染需要共享插件与选项时，创建一个编译器实例：

```ts
import { FluxMark } from 'fluxmark'
import type { FluxPluginDefinition } from 'fluxmark'

const sectionIds: FluxPluginDefinition = {
  name: 'section-ids',
  astTransforms: [
    (document) => {
      for (const node of document.children) {
        if (node.type === 'Section') node.id = `section-${node.line}`
      }
    },
  ],
}

const flux = new FluxMark({
  plugins: [sectionIds],
  onIssue(issue) {
    console.warn(`${issue.severity} at ${issue.line}:${issue.column}: ${issue.message}`)
  },
})

const ast = flux.parse('# 简介\n  可复用的配置')
const html = flux.renderToHTML(ast)
const renderer = flux.createHtmlRenderer({ classPrefix: 'fx' })

console.log(html, renderer.render(ast))
```

`flux.use(plugin)` 会在实例上追加插件定义并返回实例本身。插件工厂通过 `flux.use(factory, options)` 接收强类型选项。`createHtmlRenderer` 会合并插件渲染覆盖与调用处选项；调用处覆盖优先。

`flux.parse` 会执行已注册的 AST 转换。如果只需要相同的块规则、管道修饰符、提示变体和诊断回调，而不执行转换，可使用 `flux.createParser().parse(source)`。

## 默认样式

打包器项目可以直接引入发布包中的 CSS：

```ts
import 'fluxmark/styles.css'
```

该子路径对应发布包中的 `dist/fluxmark.css`，默认使用 `fx` 类前缀。在无法直接导入 CSS 的环境中，可以获取同一份 CSS 字符串：

```ts
import { getFluxDefaultStyles } from 'fluxmark'

const style = document.createElement('style')
style.textContent = getFluxDefaultStyles()
document.head.append(style)
```

`getFluxDefaultStyles()` 不接收参数。若修改 `classPrefix`，默认 CSS 中的选择器不会随之改名，需要同步提供匹配的样式。

## 切换任务状态

`toggleTaskInSource(source, line, checked?)` 只修改指定任务行的状态字符。行号从 1 开始；省略 `checked` 时取反。目标不是任务行时返回原字符串，其他内容不会重排。

```ts
import { toggleTaskInSource } from 'fluxmark'

let source = `# 任务
  * [ ] 编写文档
`

source = toggleTaskInSource(source, 2, true)
console.log(source)
```

HTML 任务复选框带有 `data-flux-task`、`data-flux-line` 和 `data-flux-offset`。监听容器的 `change` 事件，将交互写回源文本后重新渲染：

```ts
import { renderToHTML, toggleTaskInSource } from 'fluxmark'

const container = document.querySelector<HTMLElement>('#app')
if (container === null) throw new Error('Missing #app container')

let source = `# 任务
  * [ ] 编写文档
  * [x] 测试解析器
`

const render = (): void => {
  container.innerHTML = renderToHTML(source)
}

container.addEventListener('change', (event) => {
  const target = event.target
  if (!(target instanceof HTMLInputElement)) return
  if (!target.matches('[data-flux-task]')) return

  const line = Number(target.dataset.fluxLine)
  if (!Number.isInteger(line)) return

  source = toggleTaskInSource(source, line, target.checked)
  render()
})

render()
```

`data-flux-offset` 是任务状态字符的绝对源码偏移，对应 AST 中的 `taskMarkerOffset`。需要按偏移更新时可以使用它，但应始终校验目标字符仍是任务状态字符。

## 下一步

- 学习[语言语法](/zh/guide/syntax)，理解缩进与管道修饰符。
- 使用[插件系统](/zh/guide/plugins)扩展解析和渲染。
- 通过[AST 遍历](/zh/guide/walker)实现文档转换。
- 查阅[渲染器](/zh/guide/renderers)和 [API 参考](/zh/api/)。
- 在[工作台](/zh/playground)中直接试用示例。
