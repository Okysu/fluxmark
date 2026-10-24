import { FluxMarkParser } from './parser';
import { FluxHtmlRenderer } from './renderers/html';
import type {
  FluxASTTransform,
  FluxBlockRule,
  FluxDocument,
  FluxHtmlRendererOptions,
  FluxHtmlRendererOverrides,
  FluxMarkOptions,
  FluxParserOptions,
  FluxParseIssue,
  FluxPipeModifier,
  FluxPlugin,
  FluxPluginDefinition,
  FluxPluginFactory,
  FluxRenderToHtmlOptions,
} from './types';

export class FluxMark {
  private readonly definitions: FluxPluginDefinition[] = [];
  private readonly blockRules: FluxBlockRule[];
  private readonly pipeModifiers: Record<string, FluxPipeModifier>;
  private readonly calloutVariants: string[];
  private readonly transforms: FluxASTTransform[] = [];
  private readonly htmlOverrides: FluxHtmlRendererOverrides = {};
  private readonly issueHandler: ((issue: FluxParseIssue) => void) | undefined;

  public constructor(options: FluxMarkOptions = {}) {
    this.blockRules = [...(options.blockRules ?? [])];
    this.pipeModifiers = { ...(options.pipeModifiers ?? {}) };
    this.calloutVariants = [...(options.calloutVariants ?? [])];
    this.issueHandler = options.onIssue;
    for (const plugin of options.plugins ?? []) this.register(plugin);
  }

  public use(plugin: FluxPluginDefinition): this;
  public use(plugin: FluxPluginFactory<void>): this;
  public use<Options>(plugin: FluxPluginFactory<Options>, options: Options): this;
  public use<Options>(plugin: FluxPlugin<Options>, options?: Options): this {
    const definition = typeof plugin === 'function'
      ? plugin(options as Options)
      : plugin;
    return this.register(definition);
  }

  private register(definition: FluxPluginDefinition): this {
    this.definitions.push(definition);
    this.blockRules.push(...(definition.blockRules ?? []));
    Object.assign(this.pipeModifiers, definition.pipeModifiers ?? {});
    this.calloutVariants.push(...(definition.calloutVariants ?? []));
    this.transforms.push(...(definition.astTransforms ?? []));
    Object.assign(this.htmlOverrides, definition.htmlRenderers ?? {});
    return this;
  }

  public get plugins(): readonly FluxPluginDefinition[] {
    return this.definitions;
  }

  public createParser(): FluxMarkParser {
    const options: FluxParserOptions = {
      blockRules: [...this.blockRules],
      pipeModifiers: { ...this.pipeModifiers },
      calloutVariants: [...this.calloutVariants],
    };
    if (this.issueHandler !== undefined) options.onIssue = this.issueHandler;
    return new FluxMarkParser(options);
  }

  public parse(source: string): FluxDocument {
    let document = this.createParser().parse(source);
    for (const transform of this.transforms) {
      document = transform(document, { source }) ?? document;
    }
    return document;
  }

  public createHtmlRenderer(options: FluxHtmlRendererOptions = {}): FluxHtmlRenderer {
    return new FluxHtmlRenderer({
      ...options,
      overrides: { ...this.htmlOverrides, ...(options.overrides ?? {}) },
    });
  }

  public renderToHTML(
    input: string | FluxDocument,
    options: FluxHtmlRendererOptions = {},
  ): string {
    const document = typeof input === 'string' ? this.parse(input) : input;
    return this.createHtmlRenderer(options).render(document);
  }
}

export function parseFluxMark(source: string, options: FluxMarkOptions = {}): FluxDocument {
  return new FluxMark(options).parse(source);
}

export function renderToHTML(source: string, options: FluxRenderToHtmlOptions = {}): string {
  const { parser = {}, plugins = [], ...rendererOptions } = options;
  const flux = new FluxMark({ ...parser, plugins });
  return flux.renderToHTML(source, rendererOptions);
}
