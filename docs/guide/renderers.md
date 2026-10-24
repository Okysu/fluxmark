# HTML renderer

FluxMark separates parsing from rendering. The same `FluxDocument` can be rendered directly from source, reused through a configured `FluxHtmlRenderer`, or transformed by plugins before output.

## Entry points

| Use case | Entry point |
| --- | --- |
| Render source directly | `renderToHTML(source, options)` |
| Render an existing AST | `toHTML(ast, options)` |
| Reuse renderer configuration | `new FluxHtmlRenderer(options).render(ast)` |
| Share plugins, transforms and overrides | `flux.renderToHTML(input, options)` |

```ts
import { FluxHtmlRenderer, parseFluxMark, renderToHTML, toHTML } from 'fluxmark'

const source = '# Renderers\n  One AST, semantic output.'
const ast = parseFluxMark(source)

const fromSource = renderToHTML(source)
const fromAst = toHTML(ast)
const reusable = new FluxHtmlRenderer({ documentWrapper: false })
const withoutWrapper = reusable.render(ast)

console.log(fromSource, fromAst, withoutWrapper)
```

`FluxMark.renderToHTML` accepts source or an AST. The top-level `renderToHTML` function parses source and runs plugin transforms.

## HTML options

```ts
const renderer = new FluxHtmlRenderer({
  classPrefix: 'fx',
  documentWrapper: true,
  overrides: {},
})
```

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `classPrefix` | `string` | `'fx'` | Output class prefix, normalized to a safe class token |
| `documentWrapper` | `boolean` | `true` | Wrap the document in `<article class="fx-document">` |
| `allowHtml` | `boolean` | `false` | Emit raw HTML blocks and inline HTML tokens without escaping; trusted content only |
| `overrides` | `FluxHtmlRendererOverrides` | `{}` | Block-node and `InlineToken` overrides |

The default stylesheet uses the `fx` prefix. Load it with `import 'fluxmark/styles.css'` or inject `getFluxDefaultStyles()` once. When you change the prefix, provide matching selectors yourself.

## Default semantic output

| AST node | Default HTML |
| --- | --- |
| `Document` | `<article class="fx-document">` |
| `Section` | `<section>` with a heading from `<h1>` through `<h6>` |
| `Paragraph` | `<p>`; a `break` token becomes `<br />` |
| `Callout` | `<blockquote>` for `quote`, otherwise `<aside>` |
| `CodeBlock` | Language metadata, `<pre>` and `<code>` |
| `DataTable` | `<figure>`, optional `<figcaption>` and a semantic table |
| `List` | `<ul>` or `<ol>` with a preserved `start` when needed |
| `ListItem` | `<li>` with source metadata; tasks include a checkbox |
| `HorizontalRule` | `<hr />` |
| `CustomBlock` | A `data-name` container with escaped content |

Inline style output uses semantic elements such as `<strong>`, `<em>`, `<u>`, `<s>`, `<mark>` and `<code>`. The custom modifiers `kbd`, `badge` and `spoiler` have built-in HTML structures and default styles.

## Safety and URL policy

The default renderer:

- Escapes text content, code, table labels, tooltip attributes and custom-block content.
- Escapes every dynamic attribute and CSS class fragment.
- Allows relative URLs plus `http:`, `https:`, `mailto:` and `tel:` protocols.
- Rejects dangerous protocols, control characters, protocol-relative URLs and a leading backslash.
- Adds `target="_blank"` and `rel="noopener noreferrer nofollow"` to HTTP(S) links.
- Restricts inline color values to three- or six-digit hexadecimal colors.

```ts
import { safeFluxUrl } from 'fluxmark'

safeFluxUrl('/guide/getting-started') // '/guide/getting-started'
safeFluxUrl('https://example.com') // 'https://example.com'
safeFluxUrl('javascript:alert(1)') // null
```

The renderer cannot sanitize arbitrary HTML returned by a custom override. Only load trusted plugins and escape every untrusted value with the provided helpers.

## Node overrides and `defaultRender`

A node override receives `(node, childrenHtml, helper)`. Call `helper.defaultRender()` to keep the default structure and wrap it:

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

`defaultRender()` renders the current node once. It does not call the override recursively. `childrenHtml` already contains the output of child overrides, so default rendering and custom wrappers compose cleanly.

Node helpers provide:

| Helper | Purpose |
| --- | --- |
| `escapeHtml(value)` | Escape text and HTML special characters |
| `escapeAttribute(value)` | Escape an attribute value and backticks |
| `safeUrl(value)` | Return an allowed URL or `null` |
| `renderInline(tokens)` | Render tokens with inline overrides |
| `renderChildren(blocks)` | Render a block array |
| `defaultRender()` | Execute the default output for the current node |

## Inline token overrides

`InlineToken` receives the token, `defaultRender(token?)` and a helper without the node-level `defaultRender`:

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

Passing another token to `defaultRender(replacement)` renders that token with the default inline logic. Escape manually whenever an override interpolates raw content or attributes.

## Plugin and call-site precedence

When a renderer is created through `FluxMark`, plugin HTML overrides are merged first. An `overrides` object passed to `createHtmlRenderer` or `renderToHTML` is merged afterward, so the call site wins for the same node type or `InlineToken`.

```ts
const html = flux.renderToHTML(source, {
  overrides: {
    Paragraph(_node, _childrenHtml, helper) {
      return `<p class="article-copy">${helper.defaultRender()}</p>`
    },
  },
})
```

## Task interaction

Task checkboxes include:

- `data-flux-task`: identifies an interactive task.
- `data-flux-line`: one-based source line.
- `data-flux-offset`: absolute offset of the task state character.

Listen for `change`, call `toggleTaskInSource`, then render again. The renderer itself never mutates source text.

```ts
import { renderToHTML, toggleTaskInSource } from 'fluxmark'

let source = '# Tasks\n  * [ ] Write docs\n'
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

## Security and trusted overrides

The default renderer creates a strict boundary for compiler-controlled content. Plugins and overrides are trusted application code and can bypass that boundary if they interpolate unescaped values. Apply your own content security policy and input limits when accepting untrusted source or plugins.

## Performance

HTML rendering is a linear traversal of the AST. Unlike parsing, output size directly affects allocation and string construction. Cache renderer instances, avoid reparsing unchanged source, and debounce rendering in interactive editors. Very large tables and deeply nested sections still produce proportionally large HTML.
