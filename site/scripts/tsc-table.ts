/**
 * This script writes `site/src/tsc-table.json`: the real output of `ts-base init` for each config, of `tsc --showConfig` for
 * each preset, and of the compiler on the code sample. A browser cannot start them, so the site reads this record. Git does
 * not keep the file. The scripts `build`, `test` and `typecheck` of the site start this script, so CI makes the record at each run.
 *
 * It needs the build of the package. `pnpm install` makes that build.
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { tsconfigConfigs } from "@mark1russell7/ts-base";
import { bitsOf, flagsOf, fragmentOfLines, TABLE_FRAGMENTS, type FlagState, type InitResult, type PresetResult, type Refusal, type Table } from "../src/model.ts";
import { FLAGS, type Fragment } from "../src/sample.ts";
import { compilerOf, makeProject, removeProject, typescriptVersion, type Compile } from "./tsc-run.ts";

const out = fileURLToPath(new URL("../src/tsc-table.json", import.meta.url));

/** This function gives each subset of a list of flags, as a state with each other flag on. */
function statesOf(flags: readonly string[]): FlagState[] {
  const allOn = Object.fromEntries(FLAGS.map((flag) => [flag.id, true]));
  return Array.from({ length: 1 << flags.length }, (_, mask) => ({ ...allOn, ...Object.fromEntries(flags.map((flag, bit) => [flag, (mask & (1 << bit)) !== 0])) }));
}

/** This function keeps the refusals of one part of the sample. */
function ofFragment(refusals: readonly Refusal[], fragment: Fragment, lines: ReadonlyMap<number, Fragment>): Refusal[] {
  return refusals.filter((refusal) => (refusal.line === 0 ? fragment.id === "options" : lines.get(refusal.line)?.id === fragment.id));
}

/** This function gives the refusals of each part by the bits of its flags. Each run compiles the whole file. */
function refusalTable(compile: Compile): PresetResult["refusals"] {
  const lines = fragmentOfLines();
  const runs = new Map<string, Refusal[]>();
  const run = (state: FlagState): Refusal[] => {
    const key = FLAGS.map((flag) => (state[flag.id] === true ? "1" : "0")).join("");
    const refusals = runs.get(key) ?? compile(state);
    runs.set(key, refusals);
    return refusals;
  };
  const table = Object.fromEntries(
    TABLE_FRAGMENTS.map((fragment) => [fragment.id, Object.fromEntries(statesOf(flagsOf(fragment)).map((state) => [bitsOf(fragment, state), ofFragment(run(state), fragment, lines)]))]),
  );
  console.log(`The compiler ran ${runs.size} times.`);
  return table;
}

/** This function makes the record of each config of the CLI and of each preset. */
function record(): Table {
  const presets: Record<string, PresetResult> = {};
  const init: Record<string, InitResult> = {};
  for (const [config, path] of Object.entries(tsconfigConfigs)) {
    const preset = path.slice(path.lastIndexOf("/") + 1);
    const project = makeProject(config);
    try {
      init[config] = { preset, stdout: project.stdout, tsconfig: project.tsconfig, package: project.package };
      presets[preset] ??= { showConfig: project.showConfig, refusals: refusalTable(compilerOf(project)) };
    } finally {
      removeProject(project);
    }
  }
  return { typescript: typescriptVersion, init, presets };
}

writeFileSync(out, `${JSON.stringify(record())}\n`);
console.log(`The script wrote ${out}.`);
