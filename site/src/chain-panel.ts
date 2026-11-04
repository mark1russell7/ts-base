// The first panel: the choice of a config, the chain of its files, and the merged config with the file of each setting.
import { byId, copyText, h } from "@mark1russell7/site-pages/chrome";
import type { ConfigType } from "@mark1russell7/ts-base";
import { CONFIGS, layersFor, presetOf, resultFor } from "./data.ts";
import { initCommand, trace, valueText, type Layer, type Row } from "./model.ts";

/** What each config is, in the words of the help text of the CLI. */
const NOTES: Readonly<Partial<Record<ConfigType, string>>> = {
  esm: "ESM with NodeNext resolution. This config is the default.",
  cjs: "CommonJS with Node resolution.",
  commonjs: "CommonJS with Node resolution. This name is the same as cjs.",
  frontend: "Browser and React with bundler resolution.",
  browser: "Browser and React with bundler resolution. This name is the same as frontend.",
};

/** The number of colors for the files of a chain in `style.css`. */
const COLORS = 6;

/** The panel of the chain. */
export class ChainPanel {
  private config: ConfigType = "esm";
  private name = "my-lib";
  private overwrite = false;
  private layer: string | null = null;
  private readonly configs = byId("configs");
  private readonly filter = byId<HTMLInputElement>("filter");

  /** The constructor draws the panel. `onConfig` gets each new config. */
  constructor(private readonly onConfig: (config: ConfigType) => void) {
    this.configs.replaceChildren(
      ...CONFIGS.map((config) => {
        const chip = h("button", { type: "button", class: "chip", "data-config": config, "aria-pressed": "false" }, config);
        chip.addEventListener("click", () => this.select(config));
        return chip;
      }),
    );
    this.filter.addEventListener("input", () => this.drawRows());
    const copy = byId<HTMLButtonElement>("copy-command");
    copy.addEventListener("click", () => void copyText(copy, byId("command").textContent ?? ""));
    this.select(this.config);
  }

  /** This function takes the values of the panel of `init`, for the command. */
  setCommandInput(name: string, overwrite: boolean): void {
    this.name = name;
    this.overwrite = overwrite;
    this.drawCommand();
  }

  private select(config: ConfigType): void {
    this.config = config;
    this.layer = null;
    for (const chip of this.configs.querySelectorAll("button")) chip.setAttribute("aria-pressed", String(chip.dataset["config"] === config));
    byId("config-note").textContent = `${NOTES[config] ?? ""} The preset is ${presetOf(config)}.`;
    this.drawCommand();
    this.drawChain();
    this.drawRows();
    this.onConfig(config);
  }

  private drawCommand(): void {
    byId("command").textContent = initCommand({ config: this.config, name: this.name, overwrite: this.overwrite });
  }

  private rows(): Row[] {
    return trace(layersFor(this.config), resultFor(this.config).showConfig);
  }

  /** This function draws the files of the chain. The bar of a file shows the number of settings that it keeps. */
  private drawChain(): void {
    const layers = layersFor(this.config);
    const rows = this.rows();
    const kept = (file: string): number => rows.filter((row) => row.source === file).length;
    const most = Math.max(1, ...layers.map((layer) => kept(layer.file)));
    byId("chain").replaceChildren(...layers.map((layer, index) => this.layerItem(layer, index, kept(layer.file), most)));
    this.drawRaw(layers);
  }

  private layerItem(layer: Layer, index: number, kept: number, most: number): HTMLElement {
    const pressed = this.layer === layer.file;
    const button = h(
      "button",
      { type: "button", class: `layer l${index % COLORS}`, "data-layer": layer.file, "data-kept": kept, "aria-pressed": String(pressed) },
      h("span", { class: "layer-name" }, h("code", {}, layer.file)),
      h("span", { class: "layer-count" }, kept === 0 ? "keeps no setting" : `keeps ${kept}`),
      h("span", { class: "layer-bar", "aria-hidden": "true" }, h("i", { style: `width: ${(100 * kept) / most}%` })),
    );
    button.addEventListener("click", () => {
      this.layer = pressed ? null : layer.file;
      this.drawChain();
      this.drawRows();
    });
    return h("li", {}, button);
  }

  /** This function shows the text of the selected file, as `tsconfig/` has it. */
  private drawRaw(layers: readonly Layer[]): void {
    const chosen = layers.find((layer) => layer.file === this.layer);
    byId("raw-box").hidden = chosen === undefined;
    byId("raw").textContent = chosen === undefined ? "" : JSON.stringify(chosen.raw, null, 2);
    byId("raw-title").textContent = chosen?.file ?? "";
  }

  private drawRows(): void {
    const all = this.rows();
    const words = this.filter.value.trim().toLowerCase();
    const rows = all.filter((row) => (this.layer === null || row.source === this.layer) && row.option.toLowerCase().includes(words));
    byId("rows").replaceChildren(...rows.map((row) => this.rowItem(row)));
    byId("row-count").textContent = `${rows.length} of ${all.length} settings`;
  }

  private rowItem(row: Row): HTMLElement {
    const from =
      row.source === null
        ? h("span", { class: "src implied" }, "tsc implies it")
        : h("span", { class: `src l${row.layer % COLORS}` }, row.source);
    return h(
      "tr",
      { "data-option": row.option, "data-source": row.source ?? "tsc", "data-value": valueText(row.value) },
      h("td", {}, h("code", { class: "name" }, row.option)),
      h("td", { class: "value" }, h("code", {}, valueText(row.value))),
      h(
        "td",
        {},
        from,
        row.printed ? null : h("span", { class: "shadow" }, "tsc --showConfig does not print it"),
        ...row.shadowed.map((shadow) => h("span", { class: "shadow" }, h("s", {}, valueText(shadow.value)), ` in ${shadow.file}`)),
      ),
    );
  }
}
