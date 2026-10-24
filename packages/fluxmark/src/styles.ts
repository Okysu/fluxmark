const FLUX_DEFAULT_STYLES = `
.fx-document {
  --fx-bg: #ffffff;
  --fx-fg: #172033;
  --fx-muted: #64748b;
  --fx-accent: #2563eb;
  --fx-border: #dbe3ef;
  --fx-soft: #f6f8fb;
  --fx-code-bg: #111827;
  --fx-code-fg: #e5e7eb;
  --fx-mark: #fef08a;
  --fx-shadow: 0 12px 36px rgb(15 23 42 / 0.08);
  color: var(--fx-fg);
  background: var(--fx-bg);
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 16px;
  line-height: 1.72;
  color-scheme: light;
}
.fx-document.dark,
.dark .fx-document,
[data-theme="dark"] .fx-document {
  --fx-bg: #0c1220;
  --fx-fg: #dbe5f4;
  --fx-muted: #8e9bb0;
  --fx-accent: #60a5fa;
  --fx-border: #263349;
  --fx-soft: #121b2c;
  --fx-code-bg: #080d17;
  --fx-code-fg: #dbe5f4;
  --fx-mark: #713f12;
  --fx-shadow: 0 12px 36px rgb(0 0 0 / 0.24);
  color-scheme: dark;
}
.fx-document *, .fx-document *::before, .fx-document *::after { box-sizing: border-box; }
.fx-section { position: relative; margin: 0 0 1.25rem; }
.fx-heading { margin: 1.5em 0 0.55em; color: var(--fx-fg); font-weight: 720; line-height: 1.25; letter-spacing: -0.025em; scroll-margin-top: 5rem; }
.fx-level-1 > .fx-heading { font-size: 2.15em; }
.fx-level-2 > .fx-heading { font-size: 1.65em; }
.fx-level-3 > .fx-heading { font-size: 1.32em; }
.fx-level-4 > .fx-heading, .fx-level-5 > .fx-heading, .fx-level-6 > .fx-heading { font-size: 1.12em; }
.fx-section .fx-section { margin-left: 0.35rem; padding-left: 1rem; border-left: 1px solid var(--fx-border); }
.fx-paragraph { margin: 0.65rem 0; }
.fx-link { color: var(--fx-accent); text-decoration: none; border-bottom: 1px solid color-mix(in srgb, var(--fx-accent) 42%, transparent); }
.fx-link:hover { border-bottom-color: var(--fx-accent); }
.fx-inline-code, .fx-kbd {
  padding: 0.14em 0.4em;
  border: 1px solid var(--fx-border);
  border-radius: 0.35rem;
  background: var(--fx-soft);
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
  font-size: 0.88em;
}
.fx-kbd { box-shadow: 0 2px 0 var(--fx-border); white-space: nowrap; }
.fx-badge { display: inline-flex; align-items: center; padding: 0.08em 0.55em; border-radius: 999px; background: color-mix(in srgb, var(--fx-accent) 13%, transparent); color: var(--fx-accent); font-size: 0.78em; font-weight: 700; letter-spacing: 0.02em; }
.fx-spoiler { border-radius: 0.25rem; background: var(--fx-fg); color: transparent; cursor: pointer; transition: color 150ms, background 150ms; }
.fx-spoiler:hover, .fx-spoiler:focus { background: color-mix(in srgb, var(--fx-fg) 8%, transparent); color: var(--fx-fg); }
.fx-tooltip { position: relative; border-bottom: 1px dashed #10b981; cursor: help; }
.fx-tooltip::after {
  content: attr(data-flux-tooltip);
  position: absolute;
  z-index: 30;
  left: 50%;
  bottom: calc(100% + 0.55rem);
  width: max-content;
  max-width: min(19rem, 75vw);
  padding: 0.55rem 0.7rem;
  border: 1px solid var(--fx-border);
  border-radius: 0.55rem;
  background: var(--fx-fg);
  color: var(--fx-bg);
  box-shadow: var(--fx-shadow);
  font-size: 0.78rem;
  line-height: 1.45;
  white-space: normal;
  opacity: 0;
  pointer-events: none;
  transform: translate(-50%, 0.25rem);
  transition: opacity 140ms, transform 140ms;
}
.fx-tooltip:hover::after, .fx-tooltip:focus::after { opacity: 1; transform: translate(-50%, 0); }
.fx-callout { margin: 1rem 0; padding: 0.9rem 1rem; border: 1px solid var(--fx-border); border-left: 3px solid var(--fx-muted); border-radius: 0.65rem; background: var(--fx-soft); }
.fx-callout-note { border-left-color: #3b82f6; }
.fx-callout-tip { border-left-color: #10b981; }
.fx-callout-warn { border-left-color: #f59e0b; }
.fx-callout-danger { border-left-color: #ef4444; }
.fx-callout-title { margin-bottom: 0.35rem; font-weight: 700; }
.fx-callout-content > :first-child { margin-top: 0; }
.fx-callout-content > :last-child { margin-bottom: 0; }
.fx-code-block { overflow: hidden; margin: 1rem 0; border: 1px solid color-mix(in srgb, var(--fx-border) 65%, transparent); border-radius: 0.75rem; background: var(--fx-code-bg); color: var(--fx-code-fg); box-shadow: var(--fx-shadow); }
.fx-code-header { display: flex; align-items: center; justify-content: space-between; padding: 0.55rem 0.85rem; border-bottom: 1px solid rgb(255 255 255 / 0.08); color: #94a3b8; font: 0.72rem/1.2 ui-monospace, monospace; }
.fx-window-dots { display: inline-flex; gap: 0.35rem; }
.fx-window-dots i { width: 0.58rem; height: 0.58rem; border-radius: 50%; background: #475569; }
.fx-window-dots i:first-child { background: #f87171; }
.fx-window-dots i:nth-child(2) { background: #fbbf24; }
.fx-window-dots i:nth-child(3) { background: #34d399; }
.fx-code-block pre { overflow: auto; margin: 0; padding: 1rem 1.1rem; }
.fx-code-block code { font: 0.86rem/1.7 "SFMono-Regular", Consolas, "Liberation Mono", monospace; white-space: pre; }
.fx-datatable-wrapper { margin: 1rem 0; }
.fx-datatable-wrapper figcaption { margin-bottom: 0.5rem; font-weight: 700; }
.fx-table-scroll { overflow-x: auto; border: 1px solid var(--fx-border); border-radius: 0.65rem; }
.fx-datatable { width: 100%; border-collapse: collapse; font-size: 0.92rem; }
.fx-datatable th, .fx-datatable td { min-width: 7rem; padding: 0.65rem 0.8rem; border-bottom: 1px solid var(--fx-border); text-align: left; vertical-align: top; }
.fx-datatable th { background: var(--fx-soft); color: var(--fx-muted); font-size: 0.76rem; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; }
.fx-datatable tbody tr:last-child td { border-bottom: 0; }
.fx-datatable tbody tr:hover { background: color-mix(in srgb, var(--fx-accent) 4%, transparent); }
.fx-list { margin: 0.55rem 0; padding-left: 1.55rem; }
.fx-list .fx-list { margin: 0.15rem 0; }
.fx-list-item { margin: 0.2rem 0; padding-left: 0.15rem; }
.fx-list-item > .fx-paragraph { display: inline-block; margin: 0; }
.fx-task-item { position: relative; list-style: none; }
.fx-task-checkbox { margin: 0 0.5rem 0 -1.35rem; accent-color: var(--fx-accent); vertical-align: middle; cursor: pointer; }
.fx-task-checkbox:checked + .fx-paragraph { color: var(--fx-muted); text-decoration: line-through; }
.fx-divider { height: 1px; margin: 1.75rem 0; border: 0; background: var(--fx-border); }
.fx-custom-block { margin: 1rem 0; padding: 0.85rem; border: 1px dashed var(--fx-border); border-radius: 0.65rem; }
.fx-custom-content { overflow: auto; margin: 0; white-space: pre-wrap; }
@media (max-width: 640px) {
  .fx-document { font-size: 15px; }
  .fx-section .fx-section { margin-left: 0; padding-left: 0.65rem; }
  .fx-datatable th, .fx-datatable td { min-width: 6rem; }
}
@media (prefers-reduced-motion: reduce) {
  .fx-document *, .fx-document *::before, .fx-document *::after { scroll-behavior: auto !important; transition: none !important; }
}
`;

/** Return the standalone stylesheet used by the semantic HTML renderer. */
export function getFluxDefaultStyles(): string {
  return FLUX_DEFAULT_STYLES.trim();
}
