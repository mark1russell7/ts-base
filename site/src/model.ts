/**
 * The logic of the page. It reads the real files of `tsconfig/` and the table of real tsc results. It imports no DOM and no
 * Node.js module, so the page, the script of the table and the test use the same code.
 */
import { FLAGS, FRAGMENTS, GLOBAL_FLAGS, type Fragment } from "./sample.ts";

/** A config file, as JSON. */
export interface RawConfig {
  readonly extends?: string | readonly string[];
  readonly compilerOptions?: Readonly<Record<string, unknown>>;
  readonly include?: readonly string[];
  readonly exclude?: readonly string[];
}

/** One file of the chain. */
export interface Layer {
  readonly file: string;
  readonly raw: RawConfig;
}

/** A refusal of tsc in the sample. A refusal of the options has line 0. */
export interface Refusal {
  /** The line, from 1. */
  readonly line: number;
  /** The first column of the span, from 0. */
  readonly start: number;
  /** The column after the span, on the same line. */
  readonly end: number;
  readonly code: number;
  readonly message: string;
  /** True for an error of the declaration phase, the last phase of the compiler. */
  readonly declaration: boolean;
}

/** The result of `tsc --showConfig`. */
export interface ShowConfig {
  readonly compilerOptions: Readonly<Record<string, unknown>>;
  readonly include?: readonly string[];
  readonly exclude?: readonly string[];
}

/** The results of tsc for one preset: its `--showConfig`, and the refusals of each part by the bits of its flags. */
export interface PresetResult {
  readonly showConfig: ShowConfig;
  readonly refusals: Readonly<Record<string, Readonly<Record<string, readonly Refusal[]>>>>;
}

/** What the real CLI did for one config. */
export interface InitResult {
  readonly preset: string;
  readonly stdout: string;
  readonly tsconfig: string;
  readonly package: string;
}

/** The table of `scripts/tsc-table.ts`. */
export interface Table {
  readonly typescript: string;
  readonly init: Readonly<Record<string, InitResult>>;
  readonly presets: Readonly<Record<string, PresetResult>>;
}

/** The part of the table for the errors of the options, which have no line. */
export const OPTIONS_FRAGMENT: Fragment = { id: "options", flag: "exactOptionalPropertyTypes", code: "" };

/** Each part of the table. */
export const TABLE_FRAGMENTS: readonly Fragment[] = [OPTIONS_FRAGMENT, ...FRAGMENTS];

/** This function gives the file names of the `extends` of a config: the last part of each path. */
function basesOf(raw: RawConfig): string[] {
  const value = raw.extends;
  const list = value === undefined ? [] : typeof value === "string" ? [value] : value;
  return list.map((path) => path.slice(path.lastIndexOf("/") + 1));
}

/**
 * This function gives the files of a chain in the sequence that tsc applies them: the bases of a file, in the sequence of
 * its `extends`, then the file. A later file wins.
 *
 * @throws Error when `files` does not have a file of the chain
 */
export function layersOf(entry: string, files: Readonly<Record<string, RawConfig>>): Layer[] {
  const raw = files[entry];
  if (raw === undefined) throw new Error(`The chain names ${entry}, and tsconfig/ does not have it.`);
  return [...basesOf(raw).flatMap((base) => layersOf(base, files)), { file: entry, raw }];
}

/** The value of an earlier file that a later file replaced. */
export interface Shadow {
  readonly file: string;
  readonly value: unknown;
}

/** One setting of the merged config. */
export interface Row {
  readonly option: string;
  /** The value that tsc prints, or the value of the file when tsc does not print the option. */
  readonly value: unknown;
  /** The file that set the value. `null` for an option that tsc implies. */
  readonly source: string | null;
  /** The position of `source` in the chain, or -1. */
  readonly layer: number;
  readonly shadowed: readonly Shadow[];
  /** False when `tsc --showConfig` does not print the option. */
  readonly printed: boolean;
}

/** The keys of a config, outside `compilerOptions`, that a later file replaces as one value. */
const FILE_KEYS = ["include", "exclude"] as const;

/** This function gives the settings of one file. */
function settingsOf(raw: RawConfig): [string, unknown][] {
  const settings: [string, unknown][] = Object.entries(raw.compilerOptions ?? {});
  for (const key of FILE_KEYS) {
    const value = raw[key];
    if (value !== undefined) settings.push([key, value]);
  }
  return settings;
}

/** This function gives the value that `tsc --showConfig` prints for a setting, or undefined. */
function printedValue(option: string, shown: ShowConfig): unknown {
  return option === "include" || option === "exclude" ? shown[option] : shown.compilerOptions[option];
}

/**
 * This function traces each setting of the merged config to the file that set it. The value of each row comes from
 * `tsc --showConfig`. An option that tsc prints and that no file sets is an option that tsc implies. The result starts with
 * the settings of the last file of the chain.
 */
export function trace(layers: readonly Layer[], shown: ShowConfig): Row[] {
  const found = new Map<string, { value: unknown; layer: number; shadowed: Shadow[] }>();
  layers.forEach((layer, index) => {
    for (const [option, value] of settingsOf(layer.raw)) {
      const before = found.get(option);
      const shadowed = before === undefined ? [] : [...before.shadowed, { file: layers[before.layer]?.file ?? "", value: before.value }];
      found.set(option, { value, layer: index, shadowed });
    }
  });
  const set: Row[] = [...found].map(([option, setting]) => {
    const printed = printedValue(option, shown);
    return {
      option,
      value: printed ?? setting.value,
      source: layers[setting.layer]?.file ?? null,
      layer: setting.layer,
      shadowed: setting.shadowed,
      printed: printed !== undefined,
    };
  });
  set.sort((a, b) => b.layer - a.layer);
  const implied = Object.entries(shown.compilerOptions)
    .filter(([option]) => !found.has(option))
    .map(([option, value]): Row => ({ option, value, source: null, layer: -1, shadowed: [], printed: true }));
  return [...set, ...implied];
}

/** The state of the toggles: true for a flag that refuses. */
export type FlagState = Readonly<Record<string, boolean>>;

/** This function gives the flags that decide the refusals of a part of the sample. */
export function flagsOf(fragment: Fragment): string[] {
  return [...new Set([...GLOBAL_FLAGS, fragment.flag])];
}

/** This function gives the key of a part in the table: one bit for each of its flags. */
export function bitsOf(fragment: Fragment, state: FlagState): string {
  return flagsOf(fragment)
    .map((flag) => (state[flag] === true ? "1" : "0"))
    .join("");
}

/** This function gives the state of the flags in a preset, from the output of `tsc --showConfig`. */
export function presetState(shown: ShowConfig): FlagState {
  return Object.fromEntries(FLAGS.map((flag) => [flag.id, shown.compilerOptions[flag.id] === flag.refusing]));
}

/** A refusal and the flag that causes it. */
export interface Blamed extends Refusal {
  /** A flag that removes this refusal when it goes off. */
  readonly flag: string | null;
}

/** This function tells if two refusals are the same refusal. */
const same = (a: Refusal, b: Refusal): boolean => a.code === b.code && a.line === b.line && a.start === b.start;

/** This function gives the refusals of one part at a state of the flags. */
function partRefusals(preset: PresetResult, fragment: Fragment, state: FlagState): Blamed[] {
  const cells = preset.refusals[fragment.id] ?? {};
  const refusals = cells[bitsOf(fragment, state)] ?? [];
  // The flag of the part comes first: the part is there to show that flag.
  const flags = [...new Set([fragment.flag, ...flagsOf(fragment)])];
  return refusals.map((refusal) => {
    const flag = flags.find((id) => {
      if (state[id] !== true) return false;
      const without = cells[bitsOf(fragment, { ...state, [id]: false })] ?? [];
      return !without.some((other) => same(other, refusal));
    });
    return { ...refusal, flag: flag ?? null };
  });
}

/** This function gives all the refusals of the sample at a state of the flags, in the sequence of the file. */
export function refusalsAt(preset: PresetResult, state: FlagState): Blamed[] {
  return TABLE_FRAGMENTS.flatMap((fragment) => partRefusals(preset, fragment, state)).sort((a, b) => a.line - b.line || a.start - b.start || a.code - b.code);
}

/**
 * This function keeps the refusals that the command `tsc --noEmit` prints. The command stops at the first phase with an
 * error: an error of the options hides the code, and an error of the code hides the declaration phase.
 */
export function printedByTsc<T extends Refusal>(refusals: readonly T[]): T[] {
  const options = refusals.filter((refusal) => refusal.line === 0);
  if (options.length > 0) return options;
  const code = refusals.filter((refusal) => !refusal.declaration);
  return code.length > 0 ? code : [...refusals];
}

/** This function gives the part of the sample at each line, by the line number from 1. A blank line has no part. */
export function fragmentOfLines(): Map<number, Fragment> {
  const lines = new Map<number, Fragment>();
  let next = 1;
  for (const fragment of FRAGMENTS) {
    const count = fragment.code.split("\n").length;
    for (let line = next; line < next + count; line++) lines.set(line, fragment);
    next += count + 1;
  }
  return lines;
}

/** The values of `ts-base init` on the page. */
export interface InitInput {
  readonly config: string;
  readonly name: string;
  readonly overwrite: boolean;
}

/** This function gives the full name and the short name of a package, by the rules of `init` in `src/cli.ts`. */
export function packageNames(name: string): { readonly fullName: string; readonly shortName: string } {
  const fullName = name.startsWith("@") ? name : `@mark1russell7/${name}`;
  return { fullName, shortName: fullName.replace(/^@[^/]+\//, "") };
}

/** This function gives the command of the CLI for the values of the page. */
export function initCommand(input: InitInput): string {
  const parts = ["npx @mark1russell7/ts-base init", input.name.trim(), "--config", input.config];
  if (input.overwrite) parts.push("--overwrite");
  return parts.filter((part) => part !== "").join(" ");
}

/** This function gives the text of a value for a cell of a table. */
export function valueText(value: unknown): string {
  return typeof value === "string" ? value : JSON.stringify(value);
}
