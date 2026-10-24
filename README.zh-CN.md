# FluxMark

[English](./README.md) · **简体中文**

[![npm](https://img.shields.io/npm/v/fluxmark.svg)](https://www.npmjs.com/package/fluxmark)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

FluxMark 是一个面向结构化文档的轻量 TypeScript 编译器。它将易读的缩进式源码编译为类型化 AST 与无障碍语义化 HTML，并提供清晰的插件管线。SDK 没有运行时依赖。

[在线文档](https://okysu.github.io/fluxmark/zh/) · [交互工作台](https://okysu.github.io/fluxmark/zh/playground) · [快速上手](https://okysu.github.io/fluxmark/zh/guide/getting-started) · [API](https://okysu.github.io/fluxmark/zh/api/)

![FluxMark 工作台](./docs/public/playground-zh.png)

## 为什么选择 FluxMark

- **更少的结构噪音。** 物理缩进直接表达章节、容器、列表与代码块，不需要维护闭合标签。
- **可预测的解析。** 行内定界符与管道表达式通过预计算线性扫描完成配对，不重复回溯搜索。
- **类型化设计。** 每个节点都保留源码行列与范围，可通过完整的类型安全 Walker 遍历、过滤或替换。
- **每个阶段都可扩展。** 通过统一插件接口注册块级规则、管道修饰符、AST Transform 与 HTML 渲染器。
- **可靠的语义化输出。** 生成干净、无障碍的 HTML，内置严格转义、URL 白名单与完整的默认样式。
- **默认可交互。** 任务复选框与文档内实时示例共享同一套编译器，并可回写原始源码。
- **完整中英双语。** 指南、API 参考与基于 VitePress 的实时工作台均提供中英文版本。

## 更短的源码，更快的渲染

在保持相同文档层级与内容的前提下，FluxMark 能用更少的源码字符表达公开文章，并比成熟 Markdown 工具链更快地编译为 HTML。

| 公开语料 | 源码字符数 | 完整 HTML 渲染对比 markdown-it | 对比 marked |
| --- | ---: | ---: | ---: |
| 6 篇图文/链接密集 README | 减少 2.04% | ~2.0× | ~1.5× |
| 全部 12 篇公开文档 | 减少 0.97% | ~1.3× | ~1.2× |

基准会将公开 Markdown 转换为相同的语义树，再分别序列化为 Markdown 与 FluxMark，统计解析和语义化 HTML 生成时间。由于 FluxMark 目前没有图片节点，图片引用会在两侧统一归一化为链接。完整方法、固定来源与数据见[基准报告](./benchmarks/RESULTS.md)。

## 安装

```bash
npm install fluxmark
```

```bash
pnpm add fluxmark
```

解析与 HTML 渲染支持 Node.js 18 及以上版本。

## 快速开始

```ts
import { FluxMark } from 'fluxmark'
import 'fluxmark/styles.css'

const flux = new FluxMark()
const source = `# 版本说明
  FluxMark 将 [结构化内容|b] 编译为类型化 AST。
  > [tip] 一份源码，清晰输出
    同一份文档可以输出为 HTML 或检查其 JSON。
  * [x] 解析文档
  * [ ] 发布软件包
`

const ast = flux.parse(source)
const html = flux.renderToHTML(ast)

console.log(ast.issues, html)
```

上面的源码会生成章节、带样式的段落、提示容器与可交互任务列表。`parse` 返回 `FluxDocument`，`renderToHTML` 将其编译为语义化标记。

## 小而完整的语言

```text
# 项目状态
  这是包含 *粗体*、_斜体_、=高亮= 与 ~删除线~ 的段落。
  链接使用 [管道修饰符|https://example.com,?可选悬浮说明]。

  > [warn] 嵌套内容
    缩进行会自动归属于容器。

  @ 发布状态
    - 软件包: fluxmark | 状态: 稳定
      负责人: Core team

  $ ts
    const ast = parseFluxMark(source)

  1. 解析
  2. 渲染
  * [ ] 未完成任务
  * [x] 已完成任务
  ---
```

管道修饰符可以在一个表达式中组合样式、颜色、链接与提示：`[文本|b,i,#3451b2,https://example.com,?帮助信息]`。`kbd`、`badge` 与 `spoiler` 等自定义修饰符可直接用于 HTML 渲染器或自定义插件。

## 插件

一个小插件即可同时扩展解析、转换与渲染：

```ts
import { FluxMark, createFluxNodeBase, walkAST } from 'fluxmark'
import type { FluxPluginDefinition } from 'fluxmark'

const mathPlugin: FluxPluginDefinition = {
  name: 'math',
  blockRules: [
    {
      name: 'math',
      parse({ line }) {
        if (!line.content.startsWith('! math ')) return null
        return {
          node: {
            ...createFluxNodeBase(line),
            type: 'CustomBlock',
            name: 'math',
            content: line.content.slice(7),
            attributes: {},
            children: [],
          },
        }
      },
    },
  ],
  astTransforms: [
    (document) => {
      walkAST(document, {
        Section: {
          enter(section) {
            section.id = section.title.map((token) => token.content).join('-')
          },
        },
      })
    },
  ],
  htmlRenderers: {
    CustomBlock(node, _children, helper) {
      if (node.name !== 'math') return helper.defaultRender()
      return `<output data-kind="math">${helper.escapeHtml(node.content)}</output>`
    },
  },
}

const flux = new FluxMark().use(mathPlugin)
```

插件 API 还支持强类型工厂、自定义提示变体、管道修饰符与任意渲染覆写。详见[插件指南](https://okysu.github.io/fluxmark/zh/guide/plugins)。

## 可信赖的语义化 HTML

`FluxHtmlRenderer` 默认转义文本与属性，按明确协议白名单校验 URL，并输出无障碍语义标记。无需重写渲染器即可接管任意块级节点或行内 Token：

```ts
import { FluxHtmlRenderer } from 'fluxmark'

const renderer = new FluxHtmlRenderer({
  overrides: {
    Section(node, _children, helper) {
      return `<div class="section" data-level="${node.level}">${helper.defaultRender()}</div>`
    },
  },
})
```

样式表可通过 `fluxmark/styles.css` 引入，也可以通过 `getFluxDefaultStyles()` 获取字符串。

## 在浏览器中体验

[工作台](https://okysu.github.io/fluxmark/zh/playground)完全在浏览器中运行编译器。编辑文档后，可在语义化 HTML、格式化源码与转换后的 AST 之间切换，底部会显示解析与渲染耗时。

[语言指南](https://okysu.github.io/fluxmark/zh/guide/syntax)在关键语法下直接嵌入可交互示例，无需离开文档即可查看真实输出。

## 文档

- [快速上手](https://okysu.github.io/fluxmark/zh/guide/getting-started)
- [语言语法](https://okysu.github.io/fluxmark/zh/guide/syntax)
- [插件系统](https://okysu.github.io/fluxmark/zh/guide/plugins)
- [AST 遍历](https://okysu.github.io/fluxmark/zh/guide/walker)
- [HTML 渲染器](https://okysu.github.io/fluxmark/zh/guide/renderers)
- [API 参考](https://okysu.github.io/fluxmark/zh/api/)
- [English documentation](https://okysu.github.io/fluxmark/)

## 参与贡献

欢迎提交 Issue 与 Pull Request。本地开发与验证命令见 [CONTRIBUTING.md](./CONTRIBUTING.md)。

## 许可证

[MIT](./LICENSE) © FluxMark contributors
