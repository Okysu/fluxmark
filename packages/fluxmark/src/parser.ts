import { FluxInlineParser } from './inline';
import type {
  FluxBlockNode,
  FluxBlockRule,
  FluxCallout,
  FluxCodeBlock,
  FluxDataTable,
  FluxDataTableCell,
  FluxDataTableRow,
  FluxDocument,
  FluxHorizontalRule,
  FluxList,
  FluxListItem,
  FluxNodeBase,
  FluxParagraph,
  FluxParserOptions,
  FluxParseIssue,
  FluxRawHtml,
  FluxSection,
  FluxSourceLine,
} from './types';

interface ListMarker {
  ordered: boolean;
  depth: number;
  marker: string;
  content: string;
  ordinal: number[] | null;
  checked: boolean | null;
  taskMarkerOffset: number | null;
}

interface TableRecord {
  row: FluxDataTableRow;
  nextColumn: number;
}

const DEFAULT_CALLOUT_VARIANTS = new Set(['quote', 'note', 'tip', 'warn', 'danger']);

export function createFluxNodeBase(line: FluxSourceLine): FluxNodeBase {
  return {
    line: line.number,
    column: line.indent + 1,
    indent: line.indent,
    range: { start: line.offset, end: line.offset + line.raw.length },
  };
}

export function tokenizeFluxLines(source: string): FluxSourceLine[] {
  const lines: FluxSourceLine[] = [];
  let offset = 0;
  let number = 1;

  while (offset <= source.length) {
    let end = offset;
    while (end < source.length && source[end] !== '\n' && source[end] !== '\r') end += 1;
    const raw = source.slice(offset, end);
    let indent = 0;
    let indentLength = 0;
    while (indentLength < raw.length) {
      const character = raw[indentLength];
      if (character === ' ') indent += 1;
      else if (character === '\t') indent += 2;
      else break;
      indentLength += 1;
    }
    lines.push({
      number,
      raw,
      content: raw.slice(indentLength),
      offset,
      indent,
      indentLength,
    });

    if (end >= source.length) break;
    if (source[end] === '\r' && source[end + 1] === '\n') end += 2;
    else end += 1;
    offset = end;
    number += 1;
  }

  return lines;
}

function isBlank(line: FluxSourceLine): boolean {
  return line.content.trim().length === 0;
}

function stripIndent(raw: string, width: number): string {
  let columns = 0;
  let index = 0;
  while (index < raw.length && columns < width) {
    const character = raw[index];
    if (character === ' ') columns += 1;
    else if (character === '\t') columns += 2;
    else break;
    index += 1;
  }
  return raw.slice(index);
}

function isEscapedAt(input: string, index: number): boolean {
  let count = 0;
  for (let cursor = index - 1; cursor >= 0 && input[cursor] === '\\'; cursor -= 1) count += 1;
  return count % 2 === 1;
}

function splitTableRecord(input: string): string[] {
  const segments: string[] = [];
  let start = 0;
  let bracketDepth = 0;
  let inCode = false;
  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    if (character === '`') {
      inCode = !inCode;
    } else if (!inCode && character === '[') {
      bracketDepth += 1;
    } else if (!inCode && character === ']' && bracketDepth > 0) {
      bracketDepth -= 1;
    } else if (!inCode && bracketDepth === 0 && character === '|' && !isEscapedAt(input, index)) {
      segments.push(input.slice(start, index));
      start = index + 1;
    }
  }
  segments.push(input.slice(start));
  return segments;
}

/** Update the state character of a task item without reformatting the source. */
export function toggleTaskInSource(
  source: string,
  line: number,
  checked?: boolean,
): string {
  const lines = tokenizeFluxLines(source);
  const target = lines[line - 1];
  if (target === undefined) return source;
  const match = /^[-+*][ \t]+\[([ xX])\]/.exec(target.content);
  if (match === null) return source;
  const bracket = target.content.indexOf('[', 1);
  if (bracket < 0) return source;
  const stateOffset = target.offset + target.indentLength + bracket + 1;
  const next = checked ?? !/[xX]/.test(match[1] ?? ' ');
  return `${source.slice(0, stateOffset)}${next ? 'x' : ' '}${source.slice(stateOffset + 1)}`;
}

export class FluxMarkParser {
  private readonly customRules: FluxBlockRule[];
  private readonly inlineParser: FluxInlineParser;
  private readonly onIssue: ((issue: FluxParseIssue) => void) | undefined;
  private readonly calloutVariants: Set<string>;
  private readonly maxBlockDepth: number;
  private source = '';
  private lines: FluxSourceLine[] = [];
  private blockDepth = 0;
  private index = 0;
  private issues: FluxParseIssue[] = [];

  public readonly registeredCalloutVariants: ReadonlySet<string>;

  public constructor(options: FluxParserOptions = {}) {
    this.customRules = [...(options.blockRules ?? [])].sort(
      (left, right) => (right.priority ?? 100) - (left.priority ?? 100),
    );
    this.inlineParser = new FluxInlineParser(options.pipeModifiers);
    this.onIssue = options.onIssue;
    this.calloutVariants = new Set([
      ...DEFAULT_CALLOUT_VARIANTS,
      ...(options.calloutVariants ?? []).map((variant) => variant.toLowerCase()),
    ]);
    this.maxBlockDepth = Math.max(16, options.maxBlockDepth ?? 256);
    this.registeredCalloutVariants = this.calloutVariants;
  }

  public parse(source: string): FluxDocument {
    this.source = source;
    this.lines = tokenizeFluxLines(source);
    this.index = 0;
    this.issues = [];
    const children = this.parseBlocks(-1, 0);
    return {
      type: 'Document',
      line: 1,
      column: 1,
      indent: -1,
      range: { start: 0, end: source.length },
      children,
      issues: this.issues,
    };
  }

  private parseBlocks(parentIndent: number, sectionDepth: number): FluxBlockNode[] {
    if (this.blockDepth >= this.maxBlockDepth) {
      const line = this.lines[this.index];
      if (line !== undefined) {
        this.warn(line, 'Maximum block nesting depth exceeded; nested content skipped.');
      }
      while (this.index < this.lines.length) {
        const candidate = this.lines[this.index];
        if (candidate === undefined) break;
        if (!isBlank(candidate) && candidate.indent <= parentIndent) break;
        this.index += 1;
      }
      return [];
    }
    this.blockDepth += 1;
    try {
      return this.parseBlocksInner(parentIndent, sectionDepth);
    } finally {
      this.blockDepth -= 1;
    }
  }

  private parseBlocksInner(parentIndent: number, sectionDepth: number): FluxBlockNode[] {
    const children: FluxBlockNode[] = [];
    while (this.index < this.lines.length) {
      const line = this.lines[this.index];
      if (line === undefined) break;
      if (isBlank(line)) {
        this.index += 1;
        continue;
      }
      if (line.indent <= parentIndent) break;

      const before = this.index;
      const custom = this.parseCustomRule(line, parentIndent, sectionDepth);
      if (custom !== null) {
        children.push(custom);
      } else {
        const node = this.parseBuiltInBlock(line, parentIndent, sectionDepth);
        if (node !== null) children.push(node);
      }

      if (this.index === before) {
        // A malformed extension must never be able to stall the source cursor.
        this.index += 1;
      }
    }
    return children;
  }

  private parseCustomRule(
    line: FluxSourceLine,
    parentIndent: number,
    sectionDepth: number,
  ): FluxBlockNode | null {
    if (this.customRules.length === 0) return null;
    const currentIndex = this.index;
    for (const rule of this.customRules) {
      const result = rule.parse({
        source: this.source,
        lines: this.lines,
        index: currentIndex,
        line,
        parentIndent,
        sectionDepth,
        parseInline: (text) => this.inlineParser.parse(text),
      });
      if (result === null) continue;
      const consumed = result.consumed ?? 1;
      if (!Number.isInteger(consumed) || consumed < 1) {
        this.warn(line, `Block rule "${rule.name}" returned an invalid consumed count.`);
        this.index = currentIndex + 1;
      } else {
        this.index = Math.min(this.lines.length, currentIndex + consumed);
      }
      return result.node;
    }
    return null;
  }

  private parseBuiltInBlock(
    line: FluxSourceLine,
    parentIndent: number,
    sectionDepth: number,
  ): FluxBlockNode | null {
    const content = line.content;
    if (/^#+(?:[ \t]+.*)?$/.test(content)) return this.parseSection(line, sectionDepth);
    if (/^>(?:[ \t]+.*)?$/.test(content)) return this.parseCallout(line, sectionDepth);
    if (/^\$(?:[ \t]+\S+)?[ \t]*$/.test(content)) return this.parseCodeBlock(line);
    if (/^@(?:[ \t]+.*)?$/.test(content)) return this.parseDataTable(line);
    if (/^!html[ \t]*$/.test(content)) return this.parseRawHtml(line);
    if (/^-{3,}[ \t]*$/.test(content)) return this.parseHorizontalRule(line);

    const listMarker = this.matchListMarker(line);
    if (listMarker !== null) {
      return this.parseList(line.indent, listMarker.ordered, listMarker.depth, sectionDepth);
    }

    return this.parseParagraph(line, parentIndent);
  }

  private parseSection(line: FluxSourceLine, sectionDepth: number): FluxSection {
    const match = /^(#+)(?:[ \t]+(.*))?$/.exec(line.content);
    const hashes = match?.[1] ?? '#';
    const level = Math.min(6, sectionDepth + hashes.length) as FluxSection['level'];
    const node: FluxSection = {
      ...createFluxNodeBase(line),
      type: 'Section',
      level,
      title: this.inlineParser.parse(match?.[2]?.trim() ?? ''),
      children: [],
    };
    this.index += 1;
    node.children = this.parseBlocks(line.indent, sectionDepth + 1);
    this.finishRange(node);
    return node;
  }

  private parseCallout(line: FluxSourceLine, sectionDepth: number): FluxCallout {
    const rest = line.content.slice(1).trim();
    let variant = 'quote';
    let title = rest;
    const variantMatch = /^\[([a-zA-Z][\w-]*)\][ \t]*(.*)$/.exec(rest);
    const candidate = variantMatch?.[1]?.toLowerCase();
    if (candidate !== undefined && this.calloutVariants.has(candidate)) {
      variant = candidate;
      title = variantMatch?.[2] ?? '';
    }
    const node: FluxCallout = {
      ...createFluxNodeBase(line),
      type: 'Callout',
      variant,
      title: this.inlineParser.parse(title),
      children: [],
    };
    this.index += 1;
    node.children = this.parseBlocks(line.indent, sectionDepth);
    this.finishRange(node);
    return node;
  }

  private parseCodeBlock(line: FluxSourceLine): FluxCodeBlock {
    const match = /^\$(?:[ \t]+(\S+))?[ \t]*$/.exec(line.content);
    const codeLines: FluxSourceLine[] = [];
    let minimumIndent = Number.POSITIVE_INFINITY;
    this.index += 1;

    while (this.index < this.lines.length) {
      const candidate = this.lines[this.index];
      if (candidate === undefined) break;
      if (!isBlank(candidate) && candidate.indent <= line.indent) break;
      if (!isBlank(candidate)) minimumIndent = Math.min(minimumIndent, candidate.indent);
      codeLines.push(candidate);
      this.index += 1;
    }

    if (!Number.isFinite(minimumIndent)) minimumIndent = line.indent + 1;
    const values = codeLines.map((codeLine) =>
      isBlank(codeLine) && codeLine.raw.trim().length === 0
        ? ''
        : stripIndent(codeLine.raw, minimumIndent),
    );
    const node: FluxCodeBlock = {
      ...createFluxNodeBase(line),
      type: 'CodeBlock',
      language: match?.[1] ?? '',
      lines: values,
      code: values.join('\n'),
    };
    this.finishRange(node);
    return node;
  }

  private parseDataTable(line: FluxSourceLine): FluxDataTable {
    const node: FluxDataTable = {
      ...createFluxNodeBase(line),
      type: 'DataTable',
      title: this.inlineParser.parse(line.content.slice(1).trim()),
      columns: [],
      rows: [],
    };
    const knownColumns = new Set<string>();
    let currentRecord: TableRecord | null = null;
    let positionalColumns: string[] | null = null;
    this.index += 1;

    while (this.index < this.lines.length) {
      const candidate = this.lines[this.index];
      if (candidate === undefined) break;
      if (!isBlank(candidate) && candidate.indent <= line.indent) break;
      this.index += 1;
      if (isBlank(candidate)) continue;

      const content = candidate.content.trim();
      const recordMatch = /^-[ \t]+(.*)$/.exec(content);
      if (recordMatch !== null) {
        const input = recordMatch[1] ?? '';
        const segments = splitTableRecord(input).map((segment) => segment.trim());
        if (
          currentRecord === null &&
          positionalColumns === null &&
          segments.length > 1 &&
          segments.every((segment) => !segment.includes(':'))
        ) {
          positionalColumns = [];
          for (let index = 0; index < segments.length; index += 1) {
            const label = segments[index] || `Column ${index + 1}`;
            let key = label;
            let suffix = 2;
            while (knownColumns.has(key)) {
              key = `${label} ${suffix}`;
              suffix += 1;
            }
            knownColumns.add(key);
            positionalColumns.push(key);
            node.columns.push(key);
          }
          continue;
        }

        const row: FluxDataTableRow = {
          line: candidate.number,
          cells: Object.create(null) as Record<string, FluxDataTableCell>,
        };
        node.rows.push(row);
        currentRecord = { row, nextColumn: 0 };
        if (positionalColumns !== null) {
          currentRecord.nextColumn = this.parsePositionalSegments(
            input,
            candidate,
            currentRecord,
            positionalColumns,
            0,
          );
        } else {
          this.parseTableSegments(input, candidate, currentRecord, node, knownColumns);
        }
      } else if (currentRecord === null) {
        this.warn(candidate, 'A vertical table field must follow a "- key: value" record.');
      } else if (positionalColumns !== null) {
        currentRecord.nextColumn = this.parsePositionalSegments(
          content,
          candidate,
          currentRecord,
          positionalColumns,
          currentRecord.nextColumn,
        );
      } else {
        this.parseTableSegments(content, candidate, currentRecord, node, knownColumns);
      }
    }

    this.finishRange(node);
    return node;
  }

  private parsePositionalSegments(
    input: string,
    line: FluxSourceLine,
    record: TableRecord,
    columns: string[],
    startIndex: number,
  ): number {
    const segments = splitTableRecord(input).map((segment) => segment.trim());
    for (let offset = 0; offset < segments.length; offset += 1) {
      const columnIndex = startIndex + offset;
      if (columnIndex >= columns.length) {
        this.warn(line, `Ignored extra table value "${segments[offset] ?? ''}".`);
        break;
      }
      const key = columns[columnIndex];
      if (key === undefined) continue;
      record.row.cells[key] = {
        line: line.number,
        tokens: this.inlineParser.parse(segments[offset] ?? ''),
      };
    }
    return Math.min(columns.length, startIndex + segments.length);
  }

  private parseTableSegments(
    input: string,
    line: FluxSourceLine,
    record: TableRecord,
    table: FluxDataTable,
    knownColumns: Set<string>,
  ): void {
    for (const rawSegment of splitTableRecord(input)) {
      const segment = rawSegment.trim();
      const colon = segment.indexOf(':');
      if (colon <= 0) {
        this.warn(line, `Ignored malformed table field "${segment || '(empty)'}".`);
        continue;
      }
      const key = segment.slice(0, colon).trim();
      const value = segment.slice(colon + 1).trim();
      if (key.length === 0) {
        this.warn(line, 'Table column names cannot be empty.');
        continue;
      }
      if (!knownColumns.has(key)) {
        knownColumns.add(key);
        table.columns.push(key);
      }
      const cell: FluxDataTableCell = {
        line: line.number,
        tokens: this.inlineParser.parse(value),
      };
      record.row.cells[key] = cell;
    }
  }

  private parseRawHtml(line: FluxSourceLine): FluxRawHtml {
    const contentLines: FluxSourceLine[] = [];
    let minimumIndent = Number.POSITIVE_INFINITY;
    this.index += 1;

    while (this.index < this.lines.length) {
      const candidate = this.lines[this.index];
      if (candidate === undefined) break;
      if (!isBlank(candidate) && candidate.indent <= line.indent) break;
      if (!isBlank(candidate)) minimumIndent = Math.min(minimumIndent, candidate.indent);
      contentLines.push(candidate);
      this.index += 1;
    }

    if (!Number.isFinite(minimumIndent)) minimumIndent = line.indent + 1;
    const content = contentLines
      .map((htmlLine) =>
        isBlank(htmlLine) ? '' : stripIndent(htmlLine.raw, minimumIndent),
      )
      .join('\n');
    const node: FluxRawHtml = {
      ...createFluxNodeBase(line),
      type: 'RawHtml',
      content,
    };
    this.finishRange(node);
    return node;
  }

  private parseHorizontalRule(line: FluxSourceLine): FluxHorizontalRule {
    this.index += 1;
    return { ...createFluxNodeBase(line), type: 'HorizontalRule' };
  }

  private parseList(
    indent: number,
    ordered: boolean,
    depth: number,
    sectionDepth: number,
  ): FluxList {
    const firstLine = this.lines[this.index];
    if (firstLine === undefined) throw new Error('Cannot start a list without a source line.');
    const list: FluxList = {
      ...createFluxNodeBase(firstLine),
      type: 'List',
      ordered,
      start: 1,
      children: [],
    };
    let first = true;

    while (this.index < this.lines.length) {
      const line = this.lines[this.index];
      if (line === undefined || isBlank(line) || line.indent !== indent) break;
      const marker = this.matchListMarker(line);
      if (marker === null || marker.ordered !== ordered || marker.depth !== depth) break;
      if (first) {
        list.start = marker.ordinal?.[marker.ordinal.length - 1] ?? 1;
        first = false;
      }

      const item: FluxListItem = {
        ...createFluxNodeBase(line),
        type: 'ListItem',
        marker: marker.marker,
        ordinal: marker.ordinal,
        checked: marker.checked,
        taskMarkerOffset: marker.taskMarkerOffset,
        children: [],
      };
      if (marker.content.length > 0) {
        const paragraph: FluxParagraph = {
          ...createFluxNodeBase(line),
          type: 'Paragraph',
          tokens: this.inlineParser.parse(marker.content.trim()),
        };
        item.children.push(paragraph);
      }
      this.index += 1;

      const next = this.lines[this.index];
      if (next !== undefined && !isBlank(next)) {
        if (next.indent > line.indent) {
          item.children.push(...this.parseBlocks(line.indent, sectionDepth));
        } else if (next.indent === line.indent) {
          const nestedMarker = this.matchListMarker(next);
          if (
            nestedMarker !== null &&
            nestedMarker.ordered === ordered &&
            nestedMarker.depth > depth
          ) {
            item.children.push(
              this.parseList(indent, ordered, nestedMarker.depth, sectionDepth),
            );
          }
        }
      }

      this.finishRange(item);
      list.children.push(item);
    }

    this.finishRange(list);
    return list;
  }

  private matchListMarker(line: FluxSourceLine): ListMarker | null {
    const content = line.content;
    const task = /^[-+*][ \t]+\[([ xX])\][ \t]+(.*)$/.exec(content);
    if (task !== null) {
      const bracket = content.indexOf('[', 1);
      return {
        ordered: false,
        depth: 1,
        marker: content[0] ?? '*',
        content: task[2] ?? '',
        ordinal: null,
        checked: (task[1] ?? ' ').toLowerCase() === 'x',
        taskMarkerOffset: line.offset + line.indentLength + bracket + 1,
      };
    }

    const unordered = /^(-+|\+|\*)[ \t]+(.*)$/.exec(content);
    if (unordered !== null) {
      const marker = unordered[1] ?? '-';
      return {
        ordered: false,
        depth: marker === '*' ? 1 : marker.length,
        marker,
        content: unordered[2] ?? '',
        ordinal: null,
        checked: null,
        taskMarkerOffset: null,
      };
    }

    const ordered = /^(\d+(?:\.\d+)*)\.[ \t]+(.*)$/.exec(content);
    if (ordered !== null) {
      const ordinal = (ordered[1] ?? '1').split('.').map(Number);
      return {
        ordered: true,
        depth: ordinal.length,
        marker: `${ordered[1] ?? '1'}.`,
        content: ordered[2] ?? '',
        ordinal,
        checked: null,
        taskMarkerOffset: null,
      };
    }
    return null;
  }

  private parseParagraph(line: FluxSourceLine, parentIndent: number): FluxParagraph {
    const parts = [line.content.trim()];
    this.index += 1;

    while (this.index < this.lines.length) {
      const next = this.lines[this.index];
      if (next === undefined || isBlank(next) || next.indent <= parentIndent) break;
      if (next.indent < line.indent || this.isBlockStart(next, line.indent)) break;
      parts.push(next.content.trim());
      this.index += 1;
    }

    const node: FluxParagraph = {
      ...createFluxNodeBase(line),
      type: 'Paragraph',
      tokens: this.inlineParser.parse(parts.join('\n')),
    };
    this.finishRange(node);
    return node;
  }

  private isBlockStart(line: FluxSourceLine, paragraphIndent: number): boolean {
    if (this.customRules.length > 0 && line.indent === paragraphIndent) return true;
    return (
      /^#+(?:[ \t]+.*)?$/.test(line.content) ||
      /^>(?:[ \t]+.*)?$/.test(line.content) ||
      /^\$(?:[ \t]+\S+)?[ \t]*$/.test(line.content) ||
      /^@(?:[ \t]+.*)?$/.test(line.content) ||
      /^!html[ \t]*$/.test(line.content) ||
      /^-{3,}[ \t]*$/.test(line.content) ||
      this.matchListMarker(line) !== null
    );
  }

  private finishRange(node: FluxBlockNode): void {
    const previous = this.lines[this.index - 1];
    if (previous !== undefined) {
      node.range.end = previous.offset + previous.raw.length;
    }
  }

  private warn(line: FluxSourceLine, message: string): void {
    const issue: FluxParseIssue = {
      severity: 'warning',
      message,
      line: line.number,
      column: line.indent + 1,
    };
    this.issues.push(issue);
    this.onIssue?.(issue);
  }
}

export function parseFluxMarkDocument(
  source: string,
  options: FluxParserOptions = {},
): FluxDocument {
  return new FluxMarkParser(options).parse(source);
}
