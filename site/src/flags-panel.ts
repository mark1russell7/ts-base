// The second panel: the strict flags against the code sample. Each result comes from the record of tsc.
import { byId, h } from "@mark1russell7/site-pages/chrome";
import type { ConfigType } from "@mark1russell7/ts-base";
import { resultFor, TABLE } from "./data.ts";
import { fragmentOfLines, presetState, printedByTsc, refusalsAt, type Blamed, type FlagState, type PresetResult } from "./model.ts";
import { FLAGS, SAMPLE } from "./sample.ts";

const LINES = SAMPLE.trimEnd().split("\n");

/** This function gives a state with each flag on or each flag off. */
const allFlags = (on: boolean): FlagState => Object.fromEntries(FLAGS.map((flag) => [flag.id, on]));

/** The panel of the flags. */
export class FlagsPanel {
  private preset: PresetResult;
  private base: FlagState;
  private state: FlagState;
  /** The flag of the last click: the sample scrolls to its part. */
  private last: string | null = null;

  constructor() {
    this.preset = resultFor("esm");
    this.base = presetState(this.preset.showConfig);
    this.state = this.base;
    byId("flags").replaceChildren(...FLAGS.map((flag) => this.flagItem(flag.id, flag.note)));
    byId("flags-preset").addEventListener("click", () => this.apply(this.base));
    byId("flags-on").addEventListener("click", () => this.apply(allFlags(true)));
    byId("flags-off").addEventListener("click", () => this.apply(allFlags(false)));
    byId("tsc-version").textContent = TABLE.typescript;
    this.draw();
  }

  /** This function shows a new config, with the flags of its preset. */
  setConfig(config: ConfigType): void {
    this.preset = resultFor(config);
    this.base = presetState(this.preset.showConfig);
    this.apply(this.base);
  }

  private apply(state: FlagState): void {
    this.state = state;
    this.last = null;
    this.draw();
  }

  private flagItem(id: string, note: string): HTMLElement {
    const input = h("input", { type: "checkbox", id: `flag-${id}` });
    input.addEventListener("change", () => {
      this.state = { ...this.state, [id]: input.checked };
      this.last = id;
      this.draw();
    });
    return h(
      "li",
      { class: "flag", "data-flag": id },
      input,
      h(
        "label",
        { for: `flag-${id}` },
        h("code", { class: "flag-name" }, id),
        h("span", { class: "flag-value" }),
        h("span", { class: "flag-note" }, note),
      ),
      h("span", { class: "flag-count" }),
    );
  }

  private draw(): void {
    const refusals = refusalsAt(this.preset, this.state);
    const placed = refusals.filter((refusal) => refusal.line > 0);
    this.drawFlags(placed);
    this.drawVerdict(placed);
    this.drawOptionErrors(refusals.filter((refusal) => refusal.line === 0));
    this.drawSample(placed);
    this.drawList(placed);
    this.drawCommand(refusals);
  }

  private drawFlags(placed: readonly Blamed[]): void {
    for (const flag of FLAGS) {
      const row = byId("flags").querySelector<HTMLElement>(`[data-flag="${flag.id}"]`);
      if (row === null) continue;
      const on = this.state[flag.id] === true;
      const input = row.querySelector("input");
      if (input !== null) input.checked = on;
      const count = placed.filter((refusal) => refusal.flag === flag.id).length;
      row.dataset["on"] = String(on);
      row.dataset["count"] = String(count);
      row.dataset["changed"] = String(on !== (this.base[flag.id] === true));
      const value = row.querySelector(".flag-value");
      if (value !== null) value.textContent = `: ${String(on ? flag.refusing : !flag.refusing)}`;
      const badge = row.querySelector(".flag-count");
      if (badge !== null) badge.textContent = on ? String(count) : "";
    }
  }

  private drawVerdict(placed: readonly Blamed[]): void {
    const lines = new Set(placed.map((refusal) => refusal.line)).size;
    const verdict = byId("verdict");
    verdict.dataset["refusals"] = String(placed.length);
    verdict.textContent = placed.length === 0 ? "tsc accepts the sample." : `tsc refuses ${lines} of ${LINES.length} lines of the sample.`;
    verdict.classList.toggle("clean", placed.length === 0);
  }

  private drawOptionErrors(errors: readonly Blamed[]): void {
    byId("option-errors").replaceChildren(
      ...errors.map((error) => h("p", { class: "option-error", "data-code": error.code }, h("strong", {}, `TS${error.code}`), ` ${error.message} The command stops at this error. The sample shows what the next phase finds.`)),
    );
  }

  private drawSample(placed: readonly Blamed[]): void {
    const parts = fragmentOfLines();
    const lines = LINES.map((text, index) => {
      const line = index + 1;
      const here = placed.filter((refusal) => refusal.line === line);
      const part = parts.get(line);
      const pulse = this.last !== null && part?.flag === this.last;
      return h(
        "span",
        {
          class: `ln${here.length > 0 ? " bad" : ""}${pulse ? " pulse" : ""}`,
          "data-line": line,
          "data-part": part?.id,
          "data-part-flag": part?.flag,
          "data-codes": here.map((refusal) => refusal.code).join(" "),
        },
        h("span", { class: "no", "aria-hidden": "true" }, String(line)),
        h("span", { class: "t" }, ...marked(text, here)),
        here.length === 0 ? null : h("span", { class: "tag" }, here.map((refusal) => `TS${refusal.code}`).join(" ")),
      );
    });
    byId("sample").replaceChildren(...lines);
    this.scrollToPart();
  }

  /** This function brings the part of the last click into the view of the sample, and does not move the page. */
  private scrollToPart(): void {
    if (this.last === null) return;
    const line = byId("sample").querySelector<HTMLElement>(`[data-part-flag="${this.last}"]`);
    if (line !== null) byId("sample-scroll").scrollTop = line.offsetTop - byId("sample").offsetTop - 12;
  }

  private drawList(placed: readonly Blamed[]): void {
    byId("refusals-count").textContent = String(placed.length);
    byId("refusals").replaceChildren(
      ...placed.map((refusal) =>
        h(
          "li",
          { "data-line": refusal.line, "data-code": refusal.code, "data-flag": refusal.flag },
          h("span", { class: "ref-head" }, h("code", {}, `TS${refusal.code}`), ` line ${refusal.line}`, refusal.flag === null ? null : h("code", { class: "ref-flag" }, refusal.flag)),
          h("span", { class: "ref-text" }, refusal.message),
        ),
      ),
    );
  }

  /** This function shows the command for a project with the preset, and what the command prints of the refusals. */
  private drawCommand(refusals: readonly Blamed[]): void {
    const printed = printedByTsc(refusals);
    const options = printed.some((refusal) => refusal.line === 0);
    const hidden = refusals.length - printed.length;
    const note = byId("tsc-note");
    note.dataset["printed"] = String(printed.filter((refusal) => refusal.line > 0).length);
    note.textContent = options
      ? "This command prints only the error of the options, because tsc stops at that error."
      : hidden > 0
        ? `This command prints ${printed.length} of these ${refusals.length} refusals. tsc shows a declaration error, such as TS9007, only when the code has no other error.`
        : "This command prints each of these refusals.";
    const changed = FLAGS.filter((flag) => (this.state[flag.id] === true) !== (this.base[flag.id] === true)).map((flag) => `--${flag.id} ${String(this.state[flag.id] === true ? flag.refusing : !flag.refusing)}`);
    byId("tsc-command").textContent = ["tsc -p . --noEmit", ...changed].join(" ");
  }
}

/** This function gives the text of a line, with a mark on each span that tsc refuses. */
function marked(text: string, refusals: readonly Blamed[]): (string | HTMLElement)[] {
  const spans = [...refusals].sort((a, b) => a.start - b.start);
  const parts: (string | HTMLElement)[] = [];
  let at = 0;
  for (const span of spans) {
    if (span.start < at) continue;
    parts.push(text.slice(at, span.start), h("mark", {}, text.slice(span.start, span.end)));
    at = span.end;
  }
  parts.push(text.slice(at));
  return parts;
}
