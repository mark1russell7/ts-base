/**
 * The probe of the page. The site check of the Pages workflow starts it in a browser at each width, before the deploy.
 * A failed check stops the deploy.
 *
 * The site check reads this TypeScript file directly. It removes the types and the `export` line, and it starts the result
 * as the body of an async function.
 */

// The site check gives these helpers to the probe. Each element of this page is an HTML element.
declare const check: (name: string, ok: unknown, detail?: unknown) => boolean;
declare const until: <T>(fn: () => T | Promise<T>, ms?: number) => Promise<T>;
declare const $: (selector: string) => HTMLElement | null;
declare const $$: (selector: string) => HTMLElement[];
declare const type: (target: string | Element, text: string) => void;
declare const click: (target: string | Element) => void;

const chipOf = (config: string) => `#configs [data-config="${config}"]`;
const chain = () => $$("#chain .layer").map((layer) => layer.dataset["layer"]).join(" ");
const row = (option: string) => $(`#rows tr[data-option="${option}"]`);
const sourceOf = (option: string) => row(option)?.dataset["source"] ?? "(no row)";
const valueOf = (option: string) => row(option)?.dataset["value"] ?? "(no row)";
const refusals = () => Number($("#verdict")?.dataset["refusals"] ?? "-1");
const lineWith = (text: string) => $$("#sample .ln").find((line) => (line.querySelector(".t")?.textContent ?? "").includes(text));
const codesOf = (text: string) => lineWith(text)?.dataset["codes"] ?? "(no line)";
const flag = (id: string) => `#flags [data-flag="${id}"] input`;
const file = () => $("#init-file")?.textContent ?? "";

// The chain and the trace
click(chipOf("esm"));
check("the config esm is on", await until(() => $(chipOf("esm"))?.getAttribute("aria-pressed") === "true"));
check("the chain of esm has its files in the sequence of tsc", chain() === "shared.json esm.json lib.json esm.lib.json tsconfig.json", chain());
check("the command names the config", ($("#command")?.textContent ?? "").includes("--config esm"), $("#command")?.textContent);
check("strict comes from shared.json", sourceOf("strict") === "shared.json" && valueOf("strict") === "true", sourceOf("strict"));
check("outDir comes from lib.json, and tsc resolves its path", sourceOf("outDir") === "lib.json" && valueOf("outDir") === "./dist", valueOf("outDir"));
check("module comes from esm.json with the value of tsc", sourceOf("module") === "esm.json" && valueOf("module") === "nodenext", valueOf("module"));
check("noImplicitAny is an option that tsc implies", sourceOf("noImplicitAny") === "tsc" && valueOf("noImplicitAny") === "true", sourceOf("noImplicitAny"));

click(chipOf("frontend"));
check("the chain of frontend adds frontend.json", await until(() => chain() === "shared.json esm.json lib.json esm.lib.json frontend.json tsconfig.json"), chain());
check("frontend.json replaces module of esm.json", sourceOf("module") === "frontend.json" && valueOf("module") === "esnext", valueOf("module"));
check("the row of module shows the value that it replaces", (row("module")?.textContent ?? "").includes("esm.json"), row("module")?.textContent);
check("the command follows the config", ($("#command")?.textContent ?? "").includes("--config frontend"), $("#command")?.textContent);

click(chipOf("cjs"));
check("the chain of cjs has commonjs.json", await until(() => chain() === "shared.json commonjs.json lib.json commonjs.lib.json tsconfig.json"), chain());
check("cjs turns verbatimModuleSyntax off in commonjs.json", sourceOf("verbatimModuleSyntax") === "commonjs.json" && valueOf("verbatimModuleSyntax") === "false", valueOf("verbatimModuleSyntax"));
check("the switch of verbatimModuleSyntax is off in cjs", ($(flag("verbatimModuleSyntax")) as HTMLInputElement | null)?.checked === false);

click('#chain [data-layer="lib.json"]');
check("a file of the chain filters the rows", await until(() => $$("#rows tr").length > 0 && $$("#rows tr").every((tr) => tr.dataset["source"] === "lib.json")), $$("#rows tr").length);
check("a file of the chain shows its real text", ($("#raw")?.textContent ?? "").includes("${configDir}/dist"), $("#raw")?.textContent);
click('#chain [data-layer="lib.json"]');
check("a second click clears the filter", await until(() => $("#raw-box")?.hidden === true && $$("#rows tr").length > 3), $$("#rows tr").length);

type("#filter", "noUnchecked");
check("the filter keeps the matching options", await until(() => $$("#rows tr").length > 0 && $$("#rows tr").every((tr) => (tr.dataset["option"] ?? "").includes("noUnchecked"))), $$("#rows tr").length);
type("#filter", "");
await until(() => $$("#rows tr").length > 3);

// The flags against the code
click(chipOf("esm"));
await until(() => chain().includes("esm.lib.json"));
check("the preset refuses the sample", await until(() => refusals() > 0), refusals());
check("tsc refuses the index with TS2322", codesOf("return list[0];") === "2322", codesOf("return list[0];"));
check("tsc refuses the null value with TS18047", codesOf("return name.toUpperCase();") === "18047", codesOf("return name.toUpperCase();"));
check("tsc refuses the type import with TS1484", codesOf('import { Shape } from "./shape.js";') === "1484");
check("isolatedDeclarations refuses the export with no type", codesOf("export function stamp()") === "9007", codesOf("export function stamp()"));
check("the list has one item for each refusal", $$("#refusals li").length === refusals(), $$("#refusals li").length);

const start = refusals();
const printed = () => Number($("#tsc-note")?.dataset["printed"] ?? "-1");
check("the note tells that tsc hides the declaration error", printed() === start - 1 && ($("#tsc-note")?.textContent ?? "").includes("TS9007"), $("#tsc-note")?.textContent);
click(flag("noUncheckedIndexedAccess"));
check("noUncheckedIndexedAccess off accepts the index", await until(() => codesOf("return list[0];") === ""), codesOf("return list[0];"));
check("one refusal goes away", refusals() === start - 1, refusals());
check("the command of tsc shows the change", ($("#tsc-command")?.textContent ?? "").includes("--noUncheckedIndexedAccess false"), $("#tsc-command")?.textContent);
click(flag("noUncheckedIndexedAccess"));
check("noUncheckedIndexedAccess on refuses the index again", await until(() => codesOf("return list[0];") === "2322"), codesOf("return list[0];"));

click(flag("allowUnreachableCode"));
check("allowUnreachableCode: true accepts the second return", await until(() => codesOf("return 2;") === ""), codesOf("return 2;"));
click(flag("allowUnreachableCode"));
await until(() => codesOf("return 2;") === "7027");

click(flag("strict"));
check("strict off accepts the null value", await until(() => codesOf("return name.toUpperCase();") === ""), codesOf("return name.toUpperCase();"));
check("strict off also ends noUncheckedIndexedAccess", codesOf("return list[0];") === "", codesOf("return list[0];"));
check("strict off gives the option error TS5052", $('#option-errors [data-code="5052"]') !== null, $("#option-errors")?.textContent);
check("the note tells that the command prints no error of the code", printed() === 0, $("#tsc-note")?.textContent);
click(flag("strict"));
check("strict on removes the option error", await until(() => $("#option-errors")?.childElementCount === 0));

click("#flags-off");
check("all the flags off accept the sample", await until(() => refusals() === 0), refusals());
check("the verdict tells it", ($("#verdict")?.textContent ?? "").includes("accepts"), $("#verdict")?.textContent);
click("#flags-preset");
check("the button Preset gives the result of the start", await until(() => refusals() === start), refusals());

click(chipOf("cjs"));
await until(() => chain().includes("commonjs.lib.json"));
click(flag("verbatimModuleSyntax"));
check("verbatimModuleSyntax in CommonJS refuses each ESM export", await until(() => codesOf("export function sign(").includes("1287")), codesOf("export function sign("));

// The panel of init
click(chipOf("esm"));
await until(() => chain().includes("esm.lib.json"));
click('#init-tabs [data-tab="tsconfig.json"]');
check("tsconfig.json extends the preset", await until(() => file().includes("@mark1russell7/ts-base/tsconfig/esm.lib.json")), file());
check("the files are the same as the files of the real CLI", $("#init-match")?.dataset["match"] === "true", $("#init-match")?.textContent);
click('#init-tabs [data-tab="package.json"]');
type("#name", "@acme/tool");
check("a scoped name stays as it is", await until(() => file().includes('"name": "@acme/tool"')), file().slice(0, 200));
check("the repository uses the short name", file().includes("github.com/mark1russell7/tool.git"), file());
check("the command has the name", ($("#command")?.textContent ?? "").includes("init @acme/tool --config esm"), $("#command")?.textContent);

click("#existing-example");
check("merge keeps the scripts of the existing file", await until(() => file().includes('"build": "make"')), file());
check("merge fills the gaps from the template", file().includes('"typecheck": "tsc --noEmit"') && file().includes('"zod"'), file());
click("#overwrite");
check("overwrite gives the template", await until(() => file().includes('"build": "tsc -b"') && !file().includes('"zod"')), file());
click("#overwrite");
await until(() => file().includes('"zod"'));

type("#existing", '{ "version": 1 }');
check("the real schema refuses a bad version", await until(() => $$("#init-problems li").length > 0), $("#init-problems")?.textContent);
type("#existing", "{ not json");
check("text that is not JSON gets the note of the CLI", await until(() => ($("#existing-error")?.textContent ?? "").includes("not JSON")), $("#existing-error")?.textContent);
type("#existing", "");
type("#name", "my-lib");
check("the panel returns to the record of the real CLI", await until(() => $("#init-match")?.dataset["match"] === "true"), $("#init-match")?.textContent);

export {};
