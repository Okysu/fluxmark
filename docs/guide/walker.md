# AST walker

`walkAST` performs a typed, mutable, depth-first traversal of a `FluxDocument`. It edits the input document in place and returns the same document root for convenient chaining.

```ts
import { parseFluxMark, walkAST } from 'fluxmark'

const ast = parseFluxMark('# Guide\n  Hello FluxMark')

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

## Visitor structure

A visitor registers `enter` and `leave` hooks by node type, or uses `'*'` to handle every node:

```ts
import { parseFluxMark, walkAST } from 'fluxmark'
import type { FluxVisitor } from 'fluxmark'

const ast = parseFluxMark('# Tasks\n  * [ ] Draft\n  * [x] Review')

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

The supported block node types are `Document`, `Section`, `Paragraph`, `Callout`, `CodeBlock`, `DataTable`, `List`, `ListItem`, `HorizontalRule`, and `CustomBlock`. Typed hooks narrow `node` according to the visitor key; no assertion to a broad node type is required.

Each callback receives four arguments:

| Argument | Type or meaning |
| --- | --- |
| `node` | Current node, narrowed by the visitor key |
| `parent` | Parent node with children, or `null` for the root |
| `index` | Current index in the parent's `children` array; `0` for the root |
| `context` | Traversal context with `path`, `skip()`, `remove()`, and `replace()` |

`context.path` is a readonly array of ancestors ordered from the document root to the current parent. It does not include the current node.

## Call order

For a given node, the wildcard `enter` hook runs before the typed `enter` hook. On the way out, the typed `leave` hook runs before the wildcard `leave` hook. Children are processed between `enter` and `leave`.

```text
wildcard enter
  typed enter
    children
  typed leave
wildcard leave
```

If the wildcard `enter` replaces or removes the node, the typed `enter` is skipped for that pass. Removal during `enter` also prevents the node's children and leave hooks from running.

## Skipping a subtree

Call `context.skip()` during `enter` to skip the current node's children without skipping its leave hook:

```ts
import { parseFluxMark, walkAST } from 'fluxmark'

const ast = parseFluxMark('> [note] Summary\n  Hidden paragraph\n\nVisible paragraph')

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

This is useful for transforms that only handle the container itself and want to reduce traversal cost. `skip` does not remove the node. Calling it during `leave` has no additional subtree to skip.

## Removing nodes

Call `context.remove()` to remove the current node from its parent's `children` array. The walker adjusts the following index safely:

```ts
import { parseFluxMark, walkAST } from 'fluxmark'

const ast = parseFluxMark('[hr]\n\nKeep this paragraph')

walkAST(ast, {
  Paragraph: {
    enter(node, _parent, _index, context) {
      if (node.tokens[0]?.content === '[hr]') context.remove()
    },
  },
})
```

Removing during `enter` prevents the node's children and leave hook from running. Removing during `leave` happens after its children have been processed. The document root cannot be removed; attempting to remove it throws.

## Replacing nodes

`context.replace(node)` replaces the current node. The replacement should carry correct position and structural information:

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

When replacement happens during `enter`, the walker visits the replacement's children but does not run `enter` hooks for the replacement again. Leave hooks receive the replacement. When replacement happens during `leave`, it takes effect after the children have been processed.

The walker enforces AST structure during mutation:

- The document root can only be replaced by another `Document`.
- A `Document` cannot be inserted as a child node.
- A `List` may only contain direct `ListItem` children.
- A `ListItem` may only be inserted as a direct child of a `List`.

Violating these constraints throws an error instead of leaving a tree that renderers cannot handle.

## Mutation and pure transforms

`walkAST` is not an immutable reducer. If the caller still needs the original AST, clone it at the application's data boundary before traversal. Nodes contain plain objects and arrays, so a runtime structured clone works and the result remains ordinary typed data.

```ts
import { parseFluxMark, walkAST } from 'fluxmark'

const ast = parseFluxMark('# Title\n  Body')
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

An `astTransforms` function in a plugin usually mutates the document that was just parsed. A standalone tool that receives a shared AST should state clearly whether it modifies its input.

## Classes and helpers

Use `FluxASTWalker` when a fixed visitor should be reused:

```ts
import { FluxASTWalker, countASTNodes, parseFluxMark } from 'fluxmark'

const ast = parseFluxMark('# Title\n  Body')
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

The SDK also provides `countASTNodes(ast)`, which counts every visited node including the `Document` root, plus the type guards `isFluxContainer(node)` and `isFluxBlockNode(node)`. Inline tokens live inside paragraphs, section titles, callout titles, and table cells; they are not block AST nodes and are not visited as separate nodes by `walkAST`. Process tokens in the callback of the node that owns them.
