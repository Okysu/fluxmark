# Language syntax

FluxMark organizes block structure with physical indentation and expresses inline properties with pipe modifiers. It is not a Markdown compatibility layer: code blocks, data tables, tasks, and links have their own syntax.

Examples marked as **Live result** compile in your browser. Each one switches between rendered output, formatted HTML and the transformed AST, with parsing and rendering timings shown at the bottom.

## Complete example

```text live
# Product weekly
  This week we shipped [FluxMark 0.1|b,#3451b2]. See the [release notes|https://example.com/releases,?Open in a new window].

  > [tip] Review note
    Table fields and code content must be indented relative to their parent block.

  @ Release status
    - Module: Parser | Owner: Lin | Status: Complete
    - Module: Renderer | Owner: Chen | Status: In progress

  $ ts
    const ready = true
    console.log(ready)

  * [x] Type check
  * [ ] Publish documentation
  ---
```

Blank lines separate paragraphs and other structures. Block nesting is determined by physical indentation, not by closing markers.

## Indentation and nesting

A child block must be indented at least one column beyond its parent. A space counts as one indentation column; a tab always counts as two. The parser records both the indentation width and the number of source characters used by the indentation.

```text live
# Parent section
  A paragraph that still belongs to the parent section.
  > [note] A sibling callout
    This paragraph belongs to the callout.
Content after the parent section
```

Sibling blocks normally use the same indentation. When indentation returns to the parent level or becomes shallower, the current container ends. Avoid mixing tabs and spaces for visual alignment; consistent spaces are easier to maintain.

## Block syntax

### Sections

Use one to six `#` characters followed by whitespace and a title:

```text
# Level one
## Level two
### Level three
```

The actual level also depends on nesting depth. It is the current section depth plus the number of `#` characters, capped at six. Section titles are parsed as inline tokens; the body becomes `Section.children`.

```text
# Outer
  # Inner
    The inner section uses the outer section depth plus its own hash count.
```

### Callouts

`>` starts a callout. The default variant is `quote`, and a variant name can be given explicitly before the title:

```text live
> A plain quotation
> [note] A note
> [tip] A tip
> [warn] A warning
> [danger] Dangerous operation
  This paragraph belongs to the danger callout.
```

The built-in variants are `quote`, `note`, `tip`, `warn`, and `danger`. Variant names are case-insensitive and are stored lowercase in the AST. An unregistered `[name]` is not treated as a variant and remains part of the default quote title. Register additional names through parser options or a plugin's `calloutVariants`.

### Code blocks

A line containing `$`, optionally followed by a language identifier, starts a code block. The indented lines that follow are code, and there is no closing fence:

```text live
$ ts
  function greet(name: string): string {
    return `Hello ${name}`
  }
```

Use `$` alone when no language is needed. The parser removes the smallest common indentation of the non-blank code lines while preserving their relative indentation and blank lines. The block ends when indentation returns to the `$` line's level or becomes shallower. Code content is not parsed as inline markup.

### Data tables

`@` starts a data table, optionally followed by a title. Each record starts with `- ` and contains fields written as `key: value`. Multiple fields on one record are separated by `|`:

```text live
@ Project status
  - Module: Parser | Status: Stable | Coverage: 95%
  - Module: Renderer | Status: Beta | Coverage: 88%
```

Additional fields can follow a record on subsequent lines inside the table scope. These continuation lines may use exactly the record's indentation or be indented further:

```text
@ Contact
  - Name: Ada
  Role: Maintainer
    Site: [Home page|https://example.com]
```

A continuation line must be indented deeper than the `@` line. It may match the `- ` record's indentation or be indented further; a line at the `@` line's indentation or shallower closes the table. Blank lines are skipped while the table remains open.

Columns are stored in `DataTable.columns` in first-appearance order. Each record becomes an entry in `DataTable.rows`, and cells are looked up by column name. Missing fields stay missing; the parser does not infer a value from another column.

Only a `|` outside backticks and square brackets separates fields. Each field must have a non-empty column name, a colon, and an optional value. A malformed field produces a parse warning and is ignored. This is not a Markdown pipe table: there is no header separator row and no horizontal field syntax beyond the record format.

### Lists

Unordered lists use `-` or `*`. Additional hyphens create deeper outline levels:

```text
- First item
-- Nested item
--- Deeper item
* Another first-level item
```

Ordered lists use numbers followed by a period. Segmented numbers express nesting levels:

```text
1. Prepare
2. Build
2.1. Compile SDK
2.2. Build documentation
3. Publish
```

`List.start` is the final ordinal segment of the first item. `ListItem.ordinal` stores the complete sequence, for example `[2, 1]`. Additional blocks under a list item can be indented past the marker line.

### Task items

Tasks use an asterisk list marker and a state box. The state character can be a space, `x`, or `X`:

```text live
* [ ] Pending
* [x] Done
* [X] Also done
```

A regular `- [ ]` item is an unordered list item, not a task. In the AST, `ListItem.checked` is `null` for a regular item and `false` or `true` for a task. `taskMarkerOffset` points at the state character in the source, which allows an editor to update the task without reformatting the document. See [task toggling](/guide/getting-started#toggle-task-state).

### Horizontal rules

A line with at least three hyphens and no other non-whitespace content creates a horizontal rule:

```text
---
-----
```

### Paragraphs

Content that does not start another block becomes a paragraph. Consecutive physical lines in the same paragraph are joined with newlines, which the inline parser turns into `break` tokens. The HTML renderer emits them as line breaks.

```text
First line
Second line still belongs to the same paragraph.

A blank line starts a new paragraph.
```

## Inline syntax

### Basic styles

| Syntax | Effect | Style field |
| --- | --- | --- |
| `*text*` or `**text**` | Bold | `bold` |
| `_text_` | Italic | `italic` |
| `=text=` | Highlight | `mark` |
| `~text~` | Strikethrough | `strike` |
| `` `text` `` | Inline code | `code` |

Unpaired delimiters are treated as literal text. Content inside backticks is not interpreted as other inline styles. Underline is not created by an underscore delimiter; enable it with the pipe modifier `u` or `underline`.

A delimiter pair forms only when the opening delimiter is followed by non-whitespace and the closing delimiter is preceded by non-whitespace. Underscores surrounded by word characters are left as text.

### Pipe modifiers

The general form is `[content|modifier,modifier]`. Whitespace after commas is allowed, and modifiers are applied from left to right:

```text live
[Important|b,u]
[Italic|i]
[Marked|m]
[Strike|s]
[Code|c]
[Brand color|#3451b2]
[Short color|#fff]
```

Built-in style aliases:

| Category | Modifiers |
| --- | --- |
| Bold | `b`, `bold` |
| Italic | `i`, `italic` |
| Underline | `u`, `underline` |
| Strikethrough | `s`, `strike` |
| Highlight | `m`, `mark` |
| Code | `c`, `code` |
| Color | Three- or six-digit hexadecimal colors such as `#fff` or `#3451b2` |

Aliases are case-insensitive. Colors are normalized to lowercase. Other custom modifiers are recorded in `FluxInlineStyle.customModifiers`; plugins can also write metadata to a token's `attributes`.

The default renderers give special styling to the custom modifiers `kbd`, `badge`, and `spoiler`. A plugin can handle other names or add behavior around them.

### Links and tooltips

A URL modifier appears directly on the right side of the pipe:

```text
[FluxMark|https://github.com/Okysu/fluxmark]
[Send email|mailto:maintainers@example.com]
```

Inline URL recognition supports `http://`, `https://`, and `mailto:` prefixes case-insensitively. HTML rendering still applies the URL safety check, and plugin code should not bypass `safeUrl`.

A modifier starting with `?` sets a tooltip. The tooltip modifier absorbs all remaining modifier text, so it must come last:

```text live
[API|b,?Application Programming Interface]
[Docs|https://example.com/docs,?Open the documentation]
```

Content inside a pipe expression is raw text and is not recursively parsed as another set of inline tokens. FluxMark does not use Markdown `[label](url)` links or raw HTML.

### Images

Images reuse the same bracket grammar, with the source first and an optional alternative description after the pipe:

```text live
![https://okysu.github.io/fluxmark/logo.svg|FluxMark logo]
![https://okysu.github.io/fluxmark/logo.svg]
```

`![src]` is a valid decorative image with empty `alt`; `![src|alt]` adds an accessible description. The HTML renderer validates the source against the same URL policy, escapes the alternative text, and emits `loading="lazy" decoding="async"`. Invalid sources render as escaped fallback text instead of an image element. Markdown's `![alt](url)` syntax is not accepted.

## Diagnostics and source locations

`parseFluxMark` and `FluxMarkParser.parse` return a `FluxDocument`. Besides `children`, the document contains `issues`. The current built-in parser checks emit `warning` diagnostics for malformed table fields and invalid custom block-rule results; the issue type also permits `error`.

```ts
import { parseFluxMark } from 'fluxmark'

const source = `# Diagnostics
  @ Table
    - Name: Ada | Broken field
`

const ast = parseFluxMark(source, {
  onIssue(issue) {
    console.warn(`${issue.severity} at ${issue.line}:${issue.column}: ${issue.message}`)
  },
})

for (const issue of ast.issues) {
  console.log(issue)
}
```

Every block node has:

- `line` and `column`: one-based source positions.
- `indent`: physical indentation width.
- `range.start` and `range.end`: zero-based, end-exclusive source offsets.

An editor can use these fields to locate diagnostics, synchronize a preview selection, or update task state while preserving the original formatting.

## Complexity boundaries

Inline scanning precomputes code spans, bracket pairs, and delimiter pairs. Each input character participates in a constant number of linear passes, and a failed match does not restart a scan over the remaining suffix. Block parsing advances through physical lines, and AST walking visits nodes depth first.

Plugins can add their own regular expressions, recursive scans, repeated AST walks, and HTML serialization; those costs are separate. Untrusted plugins should not be treated as sandboxed code.
