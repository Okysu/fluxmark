---
layout: home

hero:
  name: FluxMark
  text: 结构化内容的编译工具链
  tagline: 零回溯行内扫描、类型化 AST、分阶段插件与语义化 HTML 渲染。
  image:
    src: /logo.svg
    alt: FluxMark
  actions:
    - theme: brand
      text: 快速上手
      link: /zh/guide/getting-started
    - theme: alt
      text: 语言语法
      link: /zh/guide/syntax
    - theme: alt
      text: 工作台
      link: /zh/playground
    - theme: alt
      text: API 参考
      link: /zh/api/

features:
  - title: 确定的解析过程
    details: 以物理缩进组织块级结构；行内扫描预先计算定界符与方括号配对，不因失败匹配重新扫描。
  - title: 完整源码位置
    details: AST 节点保留一基行号、列号与零基源码范围；任务项还记录状态字符的精确偏移。
  - title: 可变的类型化 AST
    details: walkAST 提供 enter、leave、skip、remove 与 replace，并保持文档根和列表结构约束。
  - title: 语义化 HTML 输出
    details: 将 AST 编译为安全、无障碍的语义化标记，支持严格转义、URL 白名单、渲染覆写与独立样式表。
  - title: 分阶段插件
    details: 块规则、管道修饰符、AST 转换与渲染覆盖各有明确契约和组合顺序。
  - title: 安全的默认输出
    details: 默认 HTML 会转义文本与属性并过滤不安全 URL；自定义渲染器和插件仍属于可信应用代码。
---

## 从源码到渲染结果

```ts
import { parseFluxMark, renderToHTML } from 'fluxmark'
import 'fluxmark/styles.css'

const source = `# 版本说明
  FluxMark 将 [结构化内容|b] 渲染为语义化 HTML。
  * [x] 解析文档
  * [ ] 发布软件包
`

const ast = parseFluxMark(source)
const html = renderToHTML(source)

console.log(ast.children.length, ast.issues, html)
```

[安装并运行第一个示例](/zh/guide/getting-started)，或直接查看[语言语法](/zh/guide/syntax)。

## 在浏览器中试用

工作台在浏览器内运行编译器，并为同一份源码展示语义化 HTML 与转换后的 AST。

[![FluxMark 工作台](/playground-zh.png)](/zh/playground)

打开[工作台](/zh/playground)即可编辑源码并检查各类输出。

## 文档地图

- [快速上手](/zh/guide/getting-started)：安装、解析、样式与任务交互。
- [语言语法](/zh/guide/syntax)：缩进、块级结构、数据表、行内样式与诊断。
- [插件系统](/zh/guide/plugins)：块规则、管道修饰符、AST 转换与渲染覆盖。
- [AST 遍历](/zh/guide/walker)：类型化 visitor、调用顺序与原地修改。
- [HTML 渲染器](/zh/guide/renderers)：HTML 输出、覆写、任务交互与安全边界。
- [API 参考](/zh/api/)：主要导出、选项和返回类型。
