# AST 遍历

`walkAST` 对 `FluxDocument` 执行类型化、可变、深度优先的遍历。它原地修改输入文档，并返回同一个文档根，便于链式处理。

```ts
import { parseFluxMark, walkAST } from 'fluxmark'

const ast = parseFluxMark('# 指南\n  你好，FluxMark')

walkAST(ast, {
  Section: {
    enter(node) {
      node.id = node.title.map((token) => token.content).join('-').toLowerCase()
    },
  },
  Paragraph: {
    enter(node, parent, index, context) {
      console.log(node.line, parent?.type, index, context.path.length)
    },
  },
})
```

## Visitor 结构

visitor 可以按节点类型注册 `enter` 和 `leave`，也可以用 `'*'` 处理所有节点：

```ts
import { parseFluxMark, walkAST } from 'fluxmark'
import type { FluxVisitor } from 'fluxmark'

const ast = parseFluxMark('# 任务\n  * [ ] 草稿\n  * [x] 评审')

const visitor: FluxVisitor = {
  '*': {
    enter(node) {
      console.log('enter', node.type)
    },
    leave(node) {
      console.log('leave', node.type)
    },
  },
  ListItem: {
    enter(node) {
      if (node.checked !== null) console.log(node.taskMarkerOffset)
    },
  },
}

walkAST(ast, visitor)
```

支持的块节点类型为 `Document`、`Section`、`Paragraph`、`Callout`、`CodeBlock`、`DataTable`、`List`、`ListItem`、`HorizontalRule` 和 `CustomBlock`。类型化钩子会根据键收窄 `node`，无需把节点断言为宽泛类型。

每个回调接收四个参数：

| 参数 | 类型或含义 |
| --- | --- |
| `node` | 当前节点；按 visitor 键自动收窄 |
| `parent` | 可包含子节点的父节点；根节点时为 `null` |
| `index` | 当前节点在父节点 `children` 中的索引；根节点为 `0` |
| `context` | 遍历上下文，含 `path`、`skip()`、`remove()`、`replace()` |

`context.path` 是只读祖先数组，顺序从文档根到当前父节点，不包含当前节点。

## 调用顺序

对同一节点，进入阶段先执行通配 `enter`，再执行类型化 `enter`；离开阶段先执行类型化 `leave`，再执行通配 `leave`。子节点位于 `enter` 与 `leave` 之间。

```text
wildcard enter
  typed enter
    children
  typed leave
wildcard leave
```

如果通配 `enter` 替换或删除了节点，本轮不会再执行类型化 `enter`。在 `enter` 中删除节点还会阻止其子节点和离开钩子执行。

## 跳过子树

在 `enter` 中调用 `context.skip()`，只跳过当前节点的子节点，不跳过当前节点的离开钩子：

```ts
import { parseFluxMark, walkAST } from 'fluxmark'

const ast = parseFluxMark('> [note] 摘要\n  被隐藏的段落\n\n可见段落')

walkAST(ast, {
  Callout: {
    enter(_node, _parent, _index, context) {
      context.skip()
    },
    leave(node) {
      console.log(`Skipped children of ${node.variant}`)
    },
  },
})
```

这对只处理容器本身、希望降低遍历成本的转换很有用。`skip` 不会删除节点；在 `leave` 中调用时已经没有额外的子树可跳过。

## 删除节点

调用 `context.remove()` 会从父节点的 `children` 中移除当前节点。遍历器会安全调整后续索引：

```ts
import { parseFluxMark, walkAST } from 'fluxmark'

const ast = parseFluxMark('[hr]\n\n保留这个段落')

walkAST(ast, {
  Paragraph: {
    enter(node, _parent, _index, context) {
      if (node.tokens[0]?.content === '[hr]') context.remove()
    },
  },
})
```

在进入阶段删除后，不再遍历其子节点，也不执行该节点的离开钩子。在离开阶段删除则发生在子节点处理之后。文档根不能删除；尝试删除根会抛出错误。

## 替换节点

`context.replace(node)` 用新节点替换当前节点。替换应保留正确的位置与结构信息：

```ts
import { parseFluxMark, walkAST } from 'fluxmark'

const ast = parseFluxMark('[hr]')

walkAST(ast, {
  Paragraph: {
    enter(node, _parent, _index, context) {
      if (node.tokens[0]?.content !== '[hr]') return

      context.replace({
        type: 'HorizontalRule',
        line: node.line,
        column: node.column,
        indent: node.indent,
        range: node.range,
      })
    },
  },
})
```

进入阶段替换后，遍历器处理替换节点的子节点，但不会为替换节点重新执行进入钩子；离开钩子会收到替换后的节点。离开阶段替换则发生在子节点处理之后。

遍历器在修改时强制保持 AST 结构：

- 文档根只能由另一个 `Document` 替换。
- `Document` 不能作为子节点插入。
- `List` 的直接子节点只能是 `ListItem`。
- `ListItem` 只能作为 `List` 的直接子节点。

违反这些约束会抛出错误，而不是留下难以渲染的树。

## 可变转换与纯转换

`walkAST` 不是不可变 reducer。若调用方仍需原始 AST，请先按应用的数据边界复制，再遍历副本。节点包含普通对象和数组，因此可以使用运行时的结构化复制能力；复制后的 AST 仍是普通类型化数据。

```ts
import { parseFluxMark, walkAST } from 'fluxmark'

const ast = parseFluxMark('# 标题\n  正文')
const transformed = structuredClone(ast)

walkAST(transformed, {
  Section: {
    enter(node) {
      node.id = `section-${node.line}`
    },
  },
})

console.log(ast.children[0]?.type, transformed.children[0]?.type)
```

插件中的 `astTransforms` 通常直接修改解析器刚生成的文档。独立工具若接收共享 AST，应在文档中明确它是否会修改输入。

## 类与辅助函数

需要复用固定 visitor 时，可以使用 `FluxASTWalker`：

```ts
import { FluxASTWalker, countASTNodes, parseFluxMark } from 'fluxmark'

const ast = parseFluxMark('# 标题\n  正文')
const walker = new FluxASTWalker({
  Section: {
    enter(node) {
      node.id = `line-${node.line}`
    },
  },
})

const result = walker.walk(ast)
console.log(result === ast, countASTNodes(ast))
```

SDK 还提供 `countASTNodes(ast)`，它统计所有被访问的节点，包括 `Document` 根；另有 `isFluxContainer(node)` 与 `isFluxBlockNode(node)` 两个类型守卫。行内 token 位于段落、章节标题、提示标题和表格单元格中，不属于块 AST 的 `children`，因此 `walkAST` 不会把 token 当作独立节点访问；需要处理 token 时，应在拥有它们的节点回调中完成。
