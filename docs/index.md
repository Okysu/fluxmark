---
layout: home

hero:
  name: FluxMark
  text: A compiler for structured content
  tagline: Zero-backtracking inline scanning, a typed AST, staged plugins, and semantic HTML rendering.
  image:
    src: /logo.svg
    alt: FluxMark
  actions:
    - theme: brand
      text: Get started
      link: /guide/getting-started
    - theme: alt
      text: Language syntax
      link: /guide/syntax
    - theme: alt
      text: Playground
      link: /playground
    - theme: alt
      text: API reference
      link: /api/

features:
  - title: Deterministic parsing
    details: Physical indentation defines block structure, and inline scanning precomputes delimiter and bracket pairs instead of rescanning failed matches.
  - title: Complete source locations
    details: AST nodes keep one-based lines and columns plus zero-based source ranges. Task items also record the exact offset of their state character.
  - title: A mutable typed AST
    details: walkAST provides enter, leave, skip, remove, and replace while enforcing the structural rules of lists and the document root.
  - title: Semantic HTML output
    details: Compile the AST to accessible semantic markup with strict escaping, URL allowlisting, renderer overrides, and a standalone stylesheet.
  - title: Staged plugins
    details: Block rules, pipe modifiers, AST transforms, and renderer overrides each have a defined contract and composition order.
  - title: Safe defaults
    details: HTML output escapes text and attributes and filters unsafe URLs. Custom renderers and plugins remain trusted application code.
---

## From source to output

```ts
import { parseFluxMark, renderToHTML } from 'fluxmark'
import 'fluxmark/styles.css'

const source = `# Release notes
  FluxMark renders [structured content|b] to semantic HTML.
  * [x] Parse the document
  * [ ] Publish the package
`

const ast = parseFluxMark(source)
const html = renderToHTML(source)

console.log(ast.children.length, ast.issues, html)
```

[Install FluxMark and run the first example](/guide/getting-started), or read the [language syntax](/guide/syntax).

## Try it in the browser

The Playground runs the compiler in the browser and shows semantic HTML and the transformed AST for the same source.

[![FluxMark Playground](/playground.png)](/playground)

Open the [Playground](/playground) to edit the source and inspect each output.

## Documentation map

- [Getting started](/guide/getting-started): install the package, parse and render a document, load styles, and update tasks.
- [Language syntax](/guide/syntax): indentation, blocks, tables, inline styles, links, and diagnostics.
- [Plugins](/guide/plugins): block rules, pipe modifiers, AST transforms, and renderer overrides.
- [AST walker](/guide/walker): typed visitors, traversal order, and mutation.
- [HTML renderer](/guide/renderers): HTML output, overrides, task interaction, and security.
- [API reference](/api/): exports, options, and return types.
