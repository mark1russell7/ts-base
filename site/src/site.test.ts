// These tests prove that the page tells the truth. They start the real CLI and the real compiler, and compare the page data with them.
import { tsconfigConfigs, type ConfigType } from "@mark1russell7/ts-base";
import { describe, expect, it } from "vitest";
import { compilerOf, makeProject, removeProject, tscCommand, type Project } from "../scripts/tsc-run.ts";
import { CONFIGS, FILES, layersFor, presetOf, resultFor, TABLE } from "./data.ts";
import { runInit } from "./init.ts";
import { fragmentOfLines, presetState, printedByTsc, refusalsAt, trace, type FlagState } from "./model.ts";
import { FLAGS, FRAGMENTS, PROJECT_NAME } from "./sample.ts";

/** One config for each preset. */
const CHOSEN: readonly ConfigType[] = ["esm", "cjs", "frontend"];

/** This function gives a short form of refusals, for a comparison. */
const shape = (refusals: readonly { line: number; code: number }[]): string[] => refusals.map((refusal) => `${refusal.line}:${refusal.code}`).sort();

/** This function runs a test with a new project of the real CLI. */
function inProject(config: ConfigType, test: (project: Project) => void): void {
  const project = makeProject(config);
  try {
    test(project);
  } finally {
    removeProject(project);
  }
}

/** This function gives the state of the flags with each flag off, with each flag on, with one change and with two changes. */
function states(base: FlagState): FlagState[] {
  const flip = (id: string): FlagState => ({ [id]: base[id] !== true });
  const pairs = FLAGS.flatMap((a, index) => FLAGS.slice(index + 1).map((b) => ({ ...base, ...flip(a.id), ...flip(b.id) })));
  return [Object.fromEntries(FLAGS.map((flag) => [flag.id, false])), Object.fromEntries(FLAGS.map((flag) => [flag.id, true])), base, ...FLAGS.map((flag) => ({ ...base, ...flip(flag.id) })), ...pairs];
}

describe("the record", () => {
  it("has each config of the real CLI", () => {
    expect(Object.keys(TABLE.init).sort()).toEqual(Object.keys(tsconfigConfigs).sort());
    expect(CONFIGS).toEqual(Object.keys(tsconfigConfigs));
  });

  it("has each file of the chains in tsconfig/", () => {
    for (const config of CONFIGS) expect(layersFor(config).length).toBeGreaterThan(2);
    expect(Object.keys(FILES)).toContain("shared.json");
  });
});

describe("the trace", () => {
  it.each(CONFIGS)("agrees with tsc --showConfig for %s", (config) => {
    const shown = resultFor(config).showConfig;
    const rows = trace(layersFor(config), shown);
    for (const [option, value] of Object.entries(shown.compilerOptions)) {
      expect(rows.find((row) => row.option === option)?.value).toEqual(value);
    }
    for (const row of rows.filter((candidate) => candidate.source !== null && candidate.printed)) {
      const file = layersFor(config).find((layer) => layer.file === row.source);
      const own = row.option === "include" || row.option === "exclude" ? file?.raw[row.option] : file?.raw.compilerOptions?.[row.option];
      // tsc prints the path of the project for ${configDir}, and it writes a value of an option in lower case.
      const normal = (value: unknown): string => JSON.stringify(value).replaceAll("${configDir}", ".").toLowerCase();
      expect(normal(row.value)).toBe(normal(own));
    }
  });

  it("names the file that tsc uses for a setting that a later file replaces", () => {
    const module = trace(layersFor("frontend"), resultFor("frontend").showConfig).find((row) => row.option === "module");
    expect(module?.source).toBe("frontend.json");
    expect(module?.shadowed.map((shadow) => shadow.file)).toContain("esm.json");
  });
});

describe("the output of init", () => {
  it.each(CONFIGS)("is the same as the record of the real CLI for %s", (config) => {
    const output = runInit({ config, name: PROJECT_NAME, overwrite: false, existing: "", fallbackName: "unused" });
    expect(output.tsconfig).toBe(TABLE.init[config]?.tsconfig);
    expect(output.package).toBe(TABLE.init[config]?.package);
    expect(output.problems).toEqual([]);
  });

  it("uses a scoped name as the real CLI does", () => {
    const project = makeProject("esm", "@acme/tool");
    try {
      const output = runInit({ config: "esm", name: "@acme/tool", overwrite: false, existing: "", fallbackName: "unused" });
      expect(output.package).toBe(project.package);
    } finally {
      removeProject(project);
    }
  });

  it("merges an existing file and keeps its scripts", () => {
    const output = runInit({ config: "esm", name: "", overwrite: false, existing: '{ "name": "old", "scripts": { "build": "make" } }', fallbackName: "unused" });
    expect(JSON.parse(output.package)).toMatchObject({ name: "@mark1russell7/old", scripts: { build: "make", typecheck: "tsc --noEmit" } });
  });
});

describe("the sample", () => {
  it.each(CHOSEN)("gives one result from the table and from the compiler for %s", (config) => {
    inProject(config, (project) => {
      const compile = compilerOf(project);
      const preset = resultFor(config);
      for (const state of states(presetState(preset.showConfig))) {
        expect(shape(refusalsAt(preset, state))).toEqual(shape(compile(state)));
      }
    });
  });

  it.each(CHOSEN)("predicts what the tsc command prints for %s", (config) => {
    inProject(config, (project) => {
      const compile = compilerOf(project);
      const base = presetState(resultFor(config).showConfig);
      // The first state has each flag off, the third state is the preset, and the fourth state has an error of the options.
      for (const state of states(base).slice(0, 4)) {
        expect(shape(tscCommand(project, state))).toEqual(shape(printedByTsc(compile(state)).filter((refusal) => refusal.line > 0)));
      }
    });
  });

  it("hides the declaration phase of the command when the code has an error", () => {
    const preset = resultFor("esm");
    const refusals = refusalsAt(preset, presetState(preset.showConfig));
    expect(refusals.filter((refusal) => refusal.declaration).map((refusal) => refusal.code)).toEqual([9007]);
    expect(printedByTsc(refusals)).toHaveLength(refusals.length - 1);
  });

  it("is in the tsconfig presets with each flag", () => {
    for (const preset of Object.values(TABLE.presets)) {
      for (const flag of FLAGS) expect(preset.showConfig.compilerOptions).toHaveProperty(flag.id);
    }
  });

  it("shows each flag at work in the preset of esm", () => {
    const preset = resultFor("esm");
    const refusals = refusalsAt(preset, presetState(preset.showConfig));
    const parts = fragmentOfLines();
    for (const fragment of FRAGMENTS) expect(refusals.filter((refusal) => parts.get(refusal.line)?.id === fragment.id), fragment.id).toHaveLength(1);
    for (const flag of FLAGS) expect(refusals.filter((refusal) => refusal.flag === flag.id).length, flag.id).toBeGreaterThan(0);
  });

  it("gives the preset of each config", () => {
    expect(presetOf("cjs")).toBe("commonjs.lib.json");
    expect(presetState(resultFor("cjs").showConfig)["verbatimModuleSyntax"]).toBe(false);
    expect(presetState(resultFor("esm").showConfig)["verbatimModuleSyntax"]).toBe(true);
  });
});
