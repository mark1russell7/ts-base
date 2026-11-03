/**
 * The real tools of the table. This module starts the CLI of the package and the compiler on a new project in the temporary
 * folder of the system. A browser cannot start them.
 */
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import type { FlagState, Refusal, ShowConfig } from "../src/model.ts";
import { FLAGS, PROJECT_NAME, SAMPLE, SHAPE } from "../src/sample.ts";

const root = fileURLToPath(new URL("../../", import.meta.url));
const cli = join(root, "dist", "cli.js");
const tsc = createRequire(import.meta.url).resolve("typescript/lib/tsc.js");

/** A project that the real CLI made. */
export interface Project {
  readonly dir: string;
  readonly stdout: string;
  readonly tsconfig: string;
  readonly package: string;
  /** The output of `tsc --showConfig`, with `.` for the folder of the project. */
  readonly showConfig: ShowConfig;
}

/**
 * This function makes a project with `ts-base init` for a config, and adds the sample to it. A link in `node_modules` points
 * to this repository, so `extends` resolves as it does for a user.
 */
export function makeProject(config: string, name: string = PROJECT_NAME): Project {
  const dir = mkdtempSync(join(tmpdir(), "ts-base-site-"));
  const stdout = execFileSync(process.execPath, [cli, "init", name, "--config", config], { cwd: dir, encoding: "utf8" });
  mkdirSync(join(dir, "node_modules", "@mark1russell7"), { recursive: true });
  symlinkSync(root, join(dir, "node_modules", "@mark1russell7", "ts-base"), "junction");
  const shown = execFileSync(process.execPath, [tsc, "--showConfig", "-p", dir], { encoding: "utf8" }).replaceAll(dir.replaceAll("\\", "/"), ".");
  writeFileSync(join(dir, "src", "sample.ts"), SAMPLE);
  writeFileSync(join(dir, "src", "shape.ts"), SHAPE);
  return {
    dir,
    stdout,
    tsconfig: readFileSync(join(dir, "tsconfig.json"), "utf8"),
    package: readFileSync(join(dir, "package.json"), "utf8"),
    showConfig: JSON.parse(shown) as ShowConfig,
  };
}

/** This function removes the folder of a project. It removes the link first, so it cannot reach this repository. */
export function removeProject(project: Project): void {
  rmSync(join(project.dir, "node_modules", "@mark1russell7", "ts-base"), { force: true });
  rmSync(project.dir, { recursive: true, force: true });
}

/** This function gives the compiler options of a state of the flags. */
export function optionsOf(state: FlagState): ts.CompilerOptions {
  return Object.fromEntries(FLAGS.map((flag) => [flag.id, state[flag.id] === true ? flag.refusing : !flag.refusing]));
}

/**
 * This function changes a diagnostic of tsc into a refusal. An error of the options has line 0. tsc can attach it to the
 * config file of the project.
 *
 * @throws Error when tsc refuses a file that is not the sample
 */
function refusalOf(diagnostic: ts.Diagnostic, declaration: boolean): Refusal {
  const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
  const { file, start } = diagnostic;
  if (file === undefined || start === undefined || file.fileName.endsWith("/tsconfig.json")) return { line: 0, start: 0, end: 0, code: diagnostic.code, message, declaration };
  if (!file.fileName.endsWith("/src/sample.ts")) throw new Error(`tsc refuses ${file.fileName}, and only the sample has refusals: ${message}`);
  const from = file.getLineAndCharacterOfPosition(start);
  const to = file.getLineAndCharacterOfPosition(start + (diagnostic.length ?? 0));
  const lineEnd = file.getLineEndOfPosition(start) - file.getPositionOfLineAndCharacter(from.line, 0);
  return { line: from.line + 1, start: from.character, end: to.line === from.line ? to.character : lineEnd, code: diagnostic.code, message, declaration };
}

/** A compiler for one project: it gives the refusals of the sample at a state of the flags. */
export type Compile = (state: FlagState) => Refusal[];

/**
 * This function gives a compiler for a project. It reads the config of the project with the flags as overrides, as
 * `tsc -p <project> --<flag> <value>` does. All the runs share the parsed library files, so that a run takes less time.
 * The compiler gives the errors of all its phases. The `tsc` command stops at the first phase with an error: see `printedByTsc`.
 */
export function compilerOf(project: Project): Compile {
  const libraries = new Map<string, ts.SourceFile | undefined>();
  const parseHost: ts.ParseConfigFileHost = {
    ...ts.sys,
    onUnRecoverableConfigFileDiagnostic: (diagnostic) => {
      throw new Error(ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"));
    },
  };
  return (state) => {
    const parsed = ts.getParsedCommandLineOfConfigFile(join(project.dir, "tsconfig.json"), optionsOf(state), parseHost);
    if (parsed === undefined) throw new Error("tsc does not read the config of the project.");
    const host = ts.createCompilerHost(parsed.options);
    const read = host.getSourceFile.bind(host);
    host.getSourceFile = (name, version, onError, create) => {
      if (!/\/lib\.[^/]*\.d\.ts$/.test(name)) return read(name, version, onError, create);
      if (!libraries.has(name)) libraries.set(name, read(name, version, onError, create));
      return libraries.get(name);
    };
    const program = ts.createProgram({ rootNames: parsed.fileNames, options: parsed.options, host, configFileParsingDiagnostics: ts.getConfigFileParsingDiagnostics(parsed) });
    const earlier = [...ts.getConfigFileParsingDiagnostics(parsed), ...program.getOptionsDiagnostics(), ...program.getSyntacticDiagnostics(), ...program.getGlobalDiagnostics(), ...program.getSemanticDiagnostics()];
    return [...earlier.map((diagnostic) => refusalOf(diagnostic, false)), ...program.getDeclarationDiagnostics().map((diagnostic) => refusalOf(diagnostic, true))];
  };
}

/** One error of the `tsc` command in the sample. */
export interface TscError {
  readonly line: number;
  readonly code: number;
}

/** This function starts the `tsc` command on a project with the flags on its command line, and gives its errors in the sample. */
export function tscCommand(project: Project, state: FlagState): TscError[] {
  const flags = Object.entries(optionsOf(state)).flatMap(([name, value]) => [`--${name}`, String(value)]);
  const run = spawnSync(process.execPath, [tsc, "-p", project.dir, "--noEmit", "--pretty", "false", ...flags], { encoding: "utf8", cwd: project.dir });
  return [...run.stdout.matchAll(/^src\/sample\.ts\((\d+),\d+\): error TS(\d+):/gm)].map((match) => ({ line: Number(match[1]), code: Number(match[2]) }));
}

/** The version of the compiler. */
export const typescriptVersion: string = ts.version;
