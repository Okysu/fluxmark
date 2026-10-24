import type {
  FluxInlineStyle,
  FluxInlineToken,
  FluxInlineTokenType,
  FluxPipeModifier,
} from './types';

type DelimiterSymbol = '*' | '**' | '_' | '=' | '~';
type ActiveStyleFlag = 'bold' | 'italic' | 'mark' | 'strike';

interface Delimiter {
  start: number;
  length: number;
  symbol: DelimiterSymbol;
}

interface DelimiterEvent extends Delimiter {
  opening: boolean;
}

interface BracketFrame {
  start: number;
  firstPipe: number | null;
}

const STYLE_FOR_DELIMITER: Record<DelimiterSymbol, ActiveStyleFlag> = {
  '*': 'bold',
  '**': 'bold',
  _: 'italic',
  '=': 'mark',
  '~': 'strike',
};

const BUILT_IN_ALIASES: Record<string, keyof Pick<
  FluxInlineStyle,
  'bold' | 'italic' | 'underline' | 'strike' | 'mark' | 'code'
>> = {
  b: 'bold',
  bold: 'bold',
  i: 'italic',
  italic: 'italic',
  u: 'underline',
  underline: 'underline',
  s: 'strike',
  strike: 'strike',
  m: 'mark',
  mark: 'mark',
  c: 'code',
  code: 'code',
};

function getBuiltInAlias(
  modifier: string,
): keyof Pick<
  FluxInlineStyle,
  'bold' | 'italic' | 'underline' | 'strike' | 'mark' | 'code'
> | undefined {
  const normalized = modifier.toLowerCase();
  return Object.prototype.hasOwnProperty.call(BUILT_IN_ALIASES, normalized)
    ? BUILT_IN_ALIASES[normalized]
    : undefined;
}

export function createFluxInlineStyle(): FluxInlineStyle {
  return {
    bold: false,
    italic: false,
    underline: false,
    strike: false,
    mark: false,
    code: false,
    color: null,
    href: null,
    tooltip: null,
    customModifiers: [],
  };
}

export function createFluxInlineToken(
  type: FluxInlineTokenType,
  content: string,
  style: FluxInlineStyle = createFluxInlineStyle(),
  attributes: Record<string, string> = {},
): FluxInlineToken {
  return { type, content, style, attributes };
}

function isWhitespace(character: string | undefined): boolean {
  return character === undefined || /\s/u.test(character);
}

function isWordCharacter(character: string | undefined): boolean {
  return character !== undefined && /[\p{L}\p{N}]/u.test(character);
}

function isColorModifier(modifier: string): boolean {
  return /^#(?:[\da-fA-F]{3}|[\da-fA-F]{6})$/.test(modifier);
}

function isUrlModifier(modifier: string): boolean {
  return /^(?:https?:\/\/|mailto:)/i.test(modifier);
}

function isBuiltInModifier(modifier: string): boolean {
  return (
    getBuiltInAlias(modifier) !== undefined ||
    isColorModifier(modifier) ||
    isUrlModifier(modifier) ||
    modifier.startsWith('?')
  );
}

function applyStylePatch(style: FluxInlineStyle, patch: Partial<FluxInlineStyle>): void {
  if (patch.bold !== undefined) style.bold = patch.bold;
  if (patch.italic !== undefined) style.italic = patch.italic;
  if (patch.underline !== undefined) style.underline = patch.underline;
  if (patch.strike !== undefined) style.strike = patch.strike;
  if (patch.mark !== undefined) style.mark = patch.mark;
  if (patch.code !== undefined) style.code = patch.code;
  if (patch.color !== undefined) style.color = patch.color;
  if (patch.href !== undefined) style.href = patch.href;
  if (patch.tooltip !== undefined) style.tooltip = patch.tooltip;
  if (patch.customModifiers !== undefined) {
    style.customModifiers = [...patch.customModifiers];
  }
}

/**
 * Inline scanner with precomputed delimiter pairs. Every input character is
 * visited by a constant number of linear passes; no failed match restarts a scan.
 */
export class FluxInlineParser {
  private readonly modifiers: Record<string, FluxPipeModifier>;

  public constructor(modifiers: Record<string, FluxPipeModifier> = {}) {
    this.modifiers = { ...modifiers };
  }

  public parse(input: string): FluxInlineToken[] {
    if (input.length === 0) return [];

    const codePairs = this.findCodePairs(input);
    const { bracketPairs, pipePositions } = this.findBracketPairs(input, codePairs);
    const events = this.findDelimiterEvents(input, codePairs, bracketPairs, pipePositions);
    const tokens: FluxInlineToken[] = [];
    const active: Record<ActiveStyleFlag, number> = {
      bold: 0,
      italic: 0,
      mark: 0,
      strike: 0,
    };
    let textStart = 0;
    let index = 0;

    const currentStyle = (): FluxInlineStyle => {
      const style = createFluxInlineStyle();
      style.bold = active.bold > 0;
      style.italic = active.italic > 0;
      style.mark = active.mark > 0;
      style.strike = active.strike > 0;
      return style;
    };

    const flushText = (end: number): void => {
      if (end <= textStart) return;
      tokens.push(createFluxInlineToken('text', input.slice(textStart, end), currentStyle()));
    };

    while (index < input.length) {
      const codeEnd = codePairs.get(index);
      if (codeEnd !== undefined) {
        flushText(index);
        const style = currentStyle();
        style.code = true;
        tokens.push(
          createFluxInlineToken('code', input.slice(index + 1, codeEnd), style),
        );
        index = codeEnd + 1;
        textStart = index;
        continue;
      }

      const pipePosition = pipePositions.get(index);
      const bracketEnd = bracketPairs.get(index);
      if (pipePosition !== undefined && bracketEnd !== undefined) {
        flushText(index);
        const rawContent = input.slice(index + 1, pipePosition);
        const rawModifiers = input.slice(pipePosition + 1, bracketEnd);
        const style = currentStyle();
        const attributes: Record<string, string> = {};
        this.applyModifiers(rawContent, rawModifiers, style, attributes);
        const type = style.code ? 'code' : 'style';
        tokens.push(createFluxInlineToken(type, rawContent, style, attributes));
        index = bracketEnd + 1;
        textStart = index;
        continue;
      }

      const event = events.get(index);
      if (event !== undefined) {
        flushText(index);
        const flag = STYLE_FOR_DELIMITER[event.symbol];
        active[flag] += event.opening ? 1 : -1;
        index += event.length;
        textStart = index;
        continue;
      }

      if (input[index] === '\n') {
        flushText(index);
        tokens.push(createFluxInlineToken('break', '\n', currentStyle()));
        index += 1;
        textStart = index;
        continue;
      }

      index += 1;
    }

    flushText(input.length);
    return tokens;
  }

  private findCodePairs(input: string): Map<number, number> {
    const pairs = new Map<number, number>();
    let opening = -1;
    for (let index = 0; index < input.length; index += 1) {
      if (input[index] !== '`') continue;
      if (opening < 0) {
        opening = index;
      } else {
        pairs.set(opening, index);
        opening = -1;
      }
    }
    return pairs;
  }

  private findBracketPairs(
    input: string,
    codePairs: Map<number, number>,
  ): { bracketPairs: Map<number, number>; pipePositions: Map<number, number> } {
    const bracketPairs = new Map<number, number>();
    const pipePositions = new Map<number, number>();
    const stack: BracketFrame[] = [];
    let index = 0;

    while (index < input.length) {
      const codeEnd = codePairs.get(index);
      if (codeEnd !== undefined) {
        index = codeEnd + 1;
        continue;
      }
      const character = input[index];
      if (character === '[') {
        stack.push({ start: index, firstPipe: null });
      } else if (character === '|' && stack.length > 0) {
        const frame = stack[stack.length - 1];
        if (frame !== undefined && frame.firstPipe === null) frame.firstPipe = index;
      } else if (character === ']' && stack.length > 0) {
        const frame = stack.pop();
        if (frame !== undefined) {
          bracketPairs.set(frame.start, index);
          if (frame.firstPipe !== null) pipePositions.set(frame.start, frame.firstPipe);
        }
      }
      index += 1;
    }
    return { bracketPairs, pipePositions };
  }

  private findDelimiterEvents(
    input: string,
    codePairs: Map<number, number>,
    bracketPairs: Map<number, number>,
    pipePositions: Map<number, number>,
  ): Map<number, DelimiterEvent> {
    const events = new Map<number, DelimiterEvent>();
    const stacks: Record<DelimiterSymbol, Delimiter[]> = {
      '*': [],
      '**': [],
      _: [],
      '=': [],
      '~': [],
    };
    let index = 0;

    while (index < input.length) {
      const codeEnd = codePairs.get(index);
      if (codeEnd !== undefined) {
        index = codeEnd + 1;
        continue;
      }
      if (pipePositions.has(index)) {
        const bracketEnd = bracketPairs.get(index);
        if (bracketEnd !== undefined) {
          index = bracketEnd + 1;
          continue;
        }
      }

      const character = input[index];
      if (character !== '*' && character !== '_' && character !== '=' && character !== '~') {
        index += 1;
        continue;
      }

      let runLength = 1;
      while (input[index + runLength] === character) runLength += 1;
      const symbol: DelimiterSymbol | null =
        character === '*' && runLength === 2
          ? '**'
          : runLength === 1
            ? character
            : null;
      if (symbol === null) {
        index += runLength;
        continue;
      }

      const delimiter: Delimiter = { start: index, length: runLength, symbol };
      const previous = input[index - 1];
      const next = input[index + runLength];
      const canOpen = !isWhitespace(next);
      const canClose = !isWhitespace(previous);
      const stack = stacks[symbol];
      let paired = false;

      if (canClose && stack.length > 0) {
        const opening = stack.pop();
        if (opening !== undefined) {
          if (symbol === '_' && this.isUnsafeIntrawordUnderscore(input, opening, delimiter)) {
            paired = false;
          } else {
            events.set(opening.start, { ...opening, opening: true });
            events.set(delimiter.start, { ...delimiter, opening: false });
            paired = true;
          }
        }
      }

      if (!paired && canOpen) stack.push(delimiter);

      index += runLength;
    }
    return events;
  }

  private isUnsafeIntrawordUnderscore(
    input: string,
    opening: Delimiter,
    closing: Delimiter,
  ): boolean {
    return (
      isWordCharacter(input[opening.start - 1]) &&
      isWordCharacter(input[closing.start + closing.length])
    );
  }

  private applyModifiers(
    content: string,
    rawModifiers: string,
    style: FluxInlineStyle,
    attributes: Record<string, string>,
  ): void {
    const modifiers = rawModifiers.split(',');
    for (let index = 0; index < modifiers.length; index += 1) {
      const rawModifier = modifiers[index];
      if (rawModifier === undefined) continue;
      const modifier = rawModifier.trim();
      if (modifier.length === 0) continue;

      if (!isBuiltInModifier(modifier)) style.customModifiers.push(modifier);

      const normalizedModifier = modifier.toLowerCase();
      const modifierHandler = Object.prototype.hasOwnProperty.call(this.modifiers, modifier)
        ? this.modifiers[modifier]
        : Object.prototype.hasOwnProperty.call(this.modifiers, normalizedModifier)
          ? this.modifiers[normalizedModifier]
          : undefined;
      if (modifierHandler !== undefined) {
        const result = modifierHandler(modifier, { content, modifier, style, attributes });
        if (typeof result === 'object' && result !== null) applyStylePatch(style, result);
        if (result !== false) continue;
      }

      if (modifier.startsWith('?')) {
        const remaining = modifiers.slice(index + 1);
        const suffix = remaining.length > 0 ? `,${remaining.join(',')}` : '';
        style.tooltip = `${modifier.slice(1)}${suffix}`.trim();
        break;
      }

      const alias = getBuiltInAlias(modifier);
      if (alias !== undefined) {
        style[alias] = true;
      } else if (isColorModifier(modifier)) {
        style.color = modifier.toLowerCase();
      } else if (isUrlModifier(modifier)) {
        style.href = modifier;
      }
    }
  }
}

export function parseFluxInline(
  input: string,
  modifiers: Record<string, FluxPipeModifier> = {},
): FluxInlineToken[] {
  return new FluxInlineParser(modifiers).parse(input);
}
