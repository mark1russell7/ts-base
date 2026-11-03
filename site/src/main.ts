// The start of the page: the theme, the three panels, the copy buttons and the build line.
import { byId, copyText, h, setupTheme } from "@mark1russell7/site-pages/chrome";
import { ChainPanel } from "./chain-panel.ts";
import { FlagsPanel } from "./flags-panel.ts";
import { InitPanel } from "./init-panel.ts";
import "@mark1russell7/site-pages/scroll-cue.css";
import "./style.css";

setupTheme(byId<HTMLButtonElement>("theme"), "ts-base-theme");

const flags = new FlagsPanel();
// The panel of the chain starts first, with the command of the start values. The panel of init then gives its values.
let init: InitPanel | null = null;
const chain = new ChainPanel((config) => {
  flags.setConfig(config);
  init?.setConfig(config);
});
init = new InitPanel((name, overwrite) => chain.setCommandInput(name, overwrite));

for (const button of document.querySelectorAll<HTMLButtonElement>("button[data-copy]")) {
  button.addEventListener("click", () => void copyText(button, byId(button.dataset["copy"]!).textContent ?? ""));
}

byId("build").append(
  `Version ${__BUILD__.version}, build `,
  __BUILD__.sha === "local" ? "local" : h("a", { href: `https://github.com/mark1russell7/ts-base/commit/${__BUILD__.sha}` }, __BUILD__.sha),
  ` of ${__BUILD__.date}`,
);
