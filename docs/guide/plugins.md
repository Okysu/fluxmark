# Plugins

A FluxMark plugin is a plain TypeScript object that combines extensions into one compiler instance. A plugin is not an isolated script: it shares the process, permissions, and data of the host application.

## Four stages, four extension points

| Stage | Extension point | Responsibility |
| --- | --- | --- |
| Block parsing | `blockRules` | Match physical lines and return `FluxBlockNode` values |
| Inline parsing | `pipeModifiers` | Handle modifiers inside a pipe expression |
| AST transformation | `astTransforms` | Mutate or replace the complete `FluxDocument` |
| Rendering | `htmlRenderers` | Override HTML block or inline token output |

`calloutVariants` is an additional registration field that teaches the parser new callout variant names.

## A complete plugin

The following plugin adds a `! math ...` block, `badge` modifier metadata, section ids, and matching HTML output:

```ts
import { FluxMark, createFluxNodeBase, walkAST } from 'fluxmark'
import type { FluxBlockRule, FluxPluginDefinition } from 'fluxmark'

const mathRule: FluxBlockRule = {
  name: 'math',
  priority: 120,
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
}

const mathPlugin: FluxPluginDefinition = {
  name: 'math',
  calloutVariants: ['proof'],
  blockRules: [mathRule],
  pipeModifiers: {
    badge(modifier, { attributes }) {
      attributes.kind = modifier
      return true
    },
  },
  astTransforms: [
    (document) => {
      walkAST(document, {
        Section: {
          enter(node) {
            node.id = node.title
              .map((token) => token.content)
              .join('-')
              .toLowerCase()
          },
        },
      })
    },
  ],
  htmlRenderers: {
    CustomBlock(node, _childrenHtml, helper) {
      if (node.name !== 'math') return helper.defaultRender()
      return `<output data-kind="math">${helper.escapeHtml(node.content)}</output>`
    },
    InlineToken(token, defaultRender) {
      return token.attributes.kind === 'badge'
        ? `<data value="badge">${defaultRender()}</data>`
        : defaultRender()
    },
  },
}

const flux = new FluxMark({ plugins: [mathPlugin] })
const source = `# Result
  [Stable|badge]
  > [proof] Induction
  ! math x^2
`

console.log(flux.renderToHTML(source))
```

The default HTML renderer already styles the `badge` custom modifier. The pipe handler adds `attributes.kind`, and the inline override wraps the default output in a `<data>` element. This split avoids reimplementing style rendering inside the override.

## Registration

The constructor accepts an array of plugin definitions:

```ts
const flux = new FluxMark({ plugins: [mathPlugin] })
```

Use `use` to append a definition, or pass options to a typed plugin factory:

```ts
interface CalloutOptions {
  variant: string
}

const calloutPlugin = (options: CalloutOptions): FluxPluginDefinition => ({
  name: `callout-${options.variant}`,
  calloutVariants: [options.variant],
})

const flux = new FluxMark()
  .use(mathPlugin)
  .use(calloutPlugin, { variant: 'success' })
```

`use` returns the same instance. The `plugins` getter exposes the registered definitions as a readonly array.

## Block rules

`FluxBlockRule` has the following shape:

```ts
import type { FluxBlockRule } from 'fluxmark'

const rule: FluxBlockRule = {
  name: 'example',
  priority: 100,
  parse(context) {
    console.log(
      context.index,
      context.line.number,
      context.parentIndent,
      context.sectionDepth,
    )
    return null
  },
}
```

The parse context provides:

| Field | Meaning |
| --- | --- |
| `source` | Complete source text |
| `lines` | All physical lines as a readonly array |
| `index` | Index of the current line |
| `line` | Current `FluxSourceLine` |
| `parentIndent` | Indentation boundary of the parent block |
| `sectionDepth` | Current section nesting depth |
| `parseInline(text)` | Parse inline text with the active modifier configuration |

Custom rules are tried before built-in block rules. A larger `priority` runs earlier; custom rules default to `100`. Return `null` when a rule does not match, or `{ node, consumed? }` when it does.

`consumed` is the number of physical lines consumed, including the current line. It defaults to `1` and must be a positive integer. An invalid value produces a warning and advances one line; the parser also prevents a faulty rule from leaving the source cursor stalled. Rules should still reject non-matching lines quickly and avoid expensive scans on every block.

Extension nodes can use `createFluxNodeBase(line)` to produce standard `line`, `column`, `indent`, and initial `range` fields. Multi-line rules should extend `range.end` through the last consumed line and return an accurate `consumed` count.

## Pipe modifiers

`pipeModifiers` is a map keyed by modifier name. Lookup first uses the original spelling and then the lowercase spelling, so registering a lowercase key handles case variants.

```ts
const plugin: FluxPluginDefinition = {
  pipeModifiers: {
    badge(modifier, context) {
      context.attributes.kind = modifier
      context.attributes.content = context.content
      return true
    },
  },
}
```

A handler can read the current `content`, `modifier`, and `style` and can mutate `attributes`. Its return value controls what happens next:

| Return value | Behavior |
| --- | --- |
| `false` | Do not consume; continue with built-in modifier handling |
| `true` | Consume the modifier |
| `undefined` | Consume the modifier |
| `Partial<FluxInlineStyle>` | Merge the style fields and consume |

Unrecognized modifiers are added to `style.customModifiers` before the plugin is called, so a handler usually does not need to add them again. If a handler returns `false`, built-in aliases, colors, URLs, and tooltip syntax still have a chance to handle the modifier.

## AST transforms

`astTransforms` run after parsing in registration order. Each transform receives the document and `{ source }`. It can mutate in place and return `undefined`, or return a new `FluxDocument`:

```ts
import type { FluxASTTransform, FluxPluginDefinition } from 'fluxmark'

const removeRules: FluxASTTransform = (document, context) => {
  console.log(context.source.length, document.issues.length)
  document.children = document.children.filter((node) => node.type !== 'HorizontalRule')
}

const plugin: FluxPluginDefinition = {
  astTransforms: [removeRules],
}
```

Transforms must preserve the `Document` root and the list child constraints. For more involved traversal, use [`walkAST`](/guide/walker), and avoid scanning the whole tree repeatedly in separate transforms by accident.

## Renderer overrides

An HTML node override receives `(node, childrenHtml, helper)`. An inline override receives `(token, defaultRender, helper)`. See [renderers](/guide/renderers) for the full signatures and examples.

A plugin can implement only one stage; it does not need to cover every extension point. A section-id plugin with only `astTransforms`, for example, is still a complete plugin.

### Merge order

- Block rules are sorted by priority.
- A later registration of the same pipe modifier replaces an earlier one.
- All AST transforms run in registration order.
- Renderer overrides from later plugins win for the same block type.
- Overrides passed to `createHtmlRenderer` or an instance render call win over plugin overrides.
- `calloutVariants` are merged and registered as lowercase variants.

## Security and performance

Plugins execute arbitrary host code and must come from trusted sources. When an HTML override interpolates untrusted values, use `helper.escapeHtml`, `helper.escapeAttribute`, and `helper.safeUrl`. Returning raw source text bypasses the default safety boundary.

Keep parse extensions cheap on the failure path. Avoid catastrophic regular expressions and repeated scans of the same suffix. Document the complexity of AST and rendering extensions, and avoid traversing the entire tree again inside a per-node callback.
