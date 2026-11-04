// The third panel: the two files that `init` writes. It runs the real code of the package in the browser.
import { byId, copyText, h } from "@mark1russell7/site-pages/chrome";
import type { ConfigType } from "@mark1russell7/ts-base";
import { TABLE } from "./data.ts";
import { runInit, type InitOutput } from "./init.ts";
import { PROJECT_NAME } from "./sample.ts";

/** The files of the panel. */
const TABS = ["tsconfig.json", "package.json"] as const;
type Tab = (typeof TABS)[number];

/** The start value of the button with an example. */
const EXAMPLE = `{
  "name": "old-name",
  "version": "1.4.0",
  "scripts": {
    "build": "make",
    "lint": "eslint ."
  },
  "dependencies": {
    "zod": "^3.23.0"
  }
}`;

/** The panel of `init`. */
export class InitPanel {
  private config: ConfigType = "esm";
  private tab: Tab = "tsconfig.json";
  private output: InitOutput | null = null;
  private readonly name = byId<HTMLInputElement>("name");
  private readonly overwrite = byId<HTMLInputElement>("overwrite");
  private readonly existing = byId<HTMLTextAreaElement>("existing");

  /** The constructor draws the panel. `onInput` gets the name and the mode of the command. */
  constructor(private readonly onInput: (name: string, overwrite: boolean) => void) {
    this.name.value = PROJECT_NAME;
    byId("init-tabs").replaceChildren(
      ...TABS.map((tab) => {
        const button = h("button", { type: "button", role: "tab", "data-tab": tab, "aria-selected": "false" }, tab);
        button.addEventListener("click", () => {
          this.tab = tab;
          this.drawFile();
        });
        return button;
      }),
    );
    for (const input of [this.name, this.overwrite, this.existing]) input.addEventListener("input", () => this.run());
    byId("existing-example").addEventListener("click", () => {
      this.existing.value = EXAMPLE;
      this.tab = "package.json";
      this.run();
    });
    const copy = byId<HTMLButtonElement>("copy-init");
    copy.addEventListener("click", () => void copyText(copy, byId("init-file").textContent ?? ""));
    this.run();
  }

  /** This function shows the files of a new config. */
  setConfig(config: ConfigType): void {
    this.config = config;
    this.run();
  }

  private run(): void {
    this.output = runInit({ config: this.config, name: this.name.value, overwrite: this.overwrite.checked, existing: this.existing.value, fallbackName: "my-folder" });
    this.onInput(this.name.value, this.overwrite.checked);
    this.drawFile();
    byId("existing-error").textContent = this.output.badJson ? "This text is not JSON. The CLI ignores such a file, and starts from the template." : "";
    byId("init-problems").replaceChildren(...this.output.problems.map((problem) => h("li", {}, problem)));
    this.drawMatch();
  }

  private drawFile(): void {
    for (const button of byId("init-tabs").querySelectorAll("button")) button.setAttribute("aria-selected", String(button.dataset["tab"] === this.tab));
    byId("init-file").textContent = this.tab === "tsconfig.json" ? (this.output?.tsconfig ?? "") : (this.output?.package ?? "");
  }

  /** This function compares the output of the page with the record of the real CLI, when the record has the same input. */
  private drawMatch(): void {
    const record = TABLE.init[this.config];
    const comparable = this.name.value.trim() === PROJECT_NAME && this.existing.value.trim() === "" && !this.overwrite.checked;
    const same = record !== undefined && record.tsconfig === this.output?.tsconfig && record.package === this.output.package;
    const match = byId("init-match");
    match.dataset["match"] = comparable ? String(same) : "none";
    match.textContent = !comparable
      ? ""
      : same
        ? `These two files are the same as the files of the real CLI: ts-base init ${PROJECT_NAME} --config ${this.config}, at build time.`
        : "These files are not the same as the files of the real CLI.";
  }
}
