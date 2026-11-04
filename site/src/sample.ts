/**
 * The strict flags of the page and the code sample of the flags. The sample is a string, not a source file of this package,
 * because tsc refuses it on purpose. The script `scripts/tsc-table.ts` compiles this text, so each refusal on the page is
 * a result of tsc.
 */

/** A strict flag of the page. */
export interface Flag {
  /** The name of the compiler option. */
  readonly id: string;
  /** The value of the option that refuses the code. The opposite value lets the code pass. */
  readonly refusing: boolean;
  /** What the flag refuses, for the page. */
  readonly note: string;
}

/** The flags in the sequence of the page. The real presets give the start value of each flag. */
export const FLAGS: readonly Flag[] = [
  { id: "strict", refusing: true, note: "The strict family: a parameter with no type, and a value that can be null." },
  { id: "noUncheckedIndexedAccess", refusing: true, note: "An index into an array can miss, so the type adds undefined." },
  { id: "exactOptionalPropertyTypes", refusing: true, note: "An optional property can be absent, but it cannot hold undefined." },
  { id: "noPropertyAccessFromIndexSignature", refusing: true, note: "A key of an index signature needs brackets, not a dot." },
  { id: "noImplicitOverride", refusing: true, note: "A method that replaces a base method needs the word override." },
  { id: "noImplicitReturns", refusing: true, note: "Each path of a function with a return value gives a value." },
  { id: "noFallthroughCasesInSwitch", refusing: true, note: "A case with code cannot continue into the next case." },
  { id: "noUnusedLocals", refusing: true, note: "Each local name has a use." },
  { id: "noUnusedParameters", refusing: true, note: "Each parameter has a use." },
  { id: "allowUnusedLabels", refusing: false, note: "Each label has a jump to it." },
  { id: "allowUnreachableCode", refusing: false, note: "No code comes after a return." },
  { id: "noUncheckedSideEffectImports", refusing: true, note: "An import for side effects points at a file that exists." },
  { id: "isolatedDeclarations", refusing: true, note: "An export has its type in its own text, so a tool can write declarations with no type check." },
  { id: "verbatimModuleSyntax", refusing: true, note: "An import of a type says so. In CommonJS, the flag also refuses each ESM statement." },
];

/** The flags that can change the result of each part of the sample. */
export const GLOBAL_FLAGS: readonly string[] = ["strict", "verbatimModuleSyntax"];

/** A part of the sample. Its own flag and `GLOBAL_FLAGS` decide all of its refusals. The test of the site proves this. */
export interface Fragment {
  readonly id: string;
  /** The flag that this part shows. */
  readonly flag: string;
  readonly code: string;
}

/** The sample, in the sequence of the file. The parts have a blank line between them. */
export const FRAGMENTS: readonly Fragment[] = [
  { id: "side-effect", flag: "noUncheckedSideEffectImports", code: `import "./theme.css";` },
  {
    id: "type-import",
    flag: "verbatimModuleSyntax",
    code: `import { Shape } from "./shape.js";

export function area(shape: Shape): number {
  return shape.size * shape.size;
}`,
  },
  {
    id: "any-parameter",
    flag: "strict",
    code: `function double(value) {
  return value * 2;
}

export const four: number = double(2);`,
  },
  {
    id: "null-value",
    flag: "strict",
    code: `export function shout(name: string | null): string {
  return name.toUpperCase();
}`,
  },
  {
    id: "index",
    flag: "noUncheckedIndexedAccess",
    code: `export function first(list: string[]): string {
  return list[0];
}`,
  },
  {
    id: "optional",
    flag: "exactOptionalPropertyTypes",
    code: `export interface Options {
  label?: string;
}

export const options: Options = { label: undefined };`,
  },
  {
    id: "index-key",
    flag: "noPropertyAccessFromIndexSignature",
    code: `export function mode(env: Record<string, string>): string | undefined {
  return env.MODE;
}`,
  },
  {
    id: "override",
    flag: "noImplicitOverride",
    code: `export class Base {
  run(): void {}
}

export class Child extends Base {
  run(): void {}
}`,
  },
  {
    id: "returns",
    flag: "noImplicitReturns",
    code: `export function sign(value: number): string | undefined {
  if (value > 0) {
    return "plus";
  }
}`,
  },
  {
    id: "fallthrough",
    flag: "noFallthroughCasesInSwitch",
    code: `export function size(kind: string): number {
  let total = 0;
  switch (kind) {
    case "big":
      total += 10;
    case "small":
      total += 1;
  }
  return total;
}`,
  },
  {
    id: "unused-local",
    flag: "noUnusedLocals",
    code: `export function count(prices: number[]): number {
  const tax = 0.2;
  return prices.length;
}`,
  },
  {
    id: "unused-parameter",
    flag: "noUnusedParameters",
    code: `export function greet(name: string, age: number): string {
  return name;
}`,
  },
  {
    id: "unused-label",
    flag: "allowUnusedLabels",
    code: `export function tick(): number {
  outer: for (const step of [1, 2]) {
    return step;
  }
  return 0;
}`,
  },
  {
    id: "unreachable",
    flag: "allowUnreachableCode",
    code: `export function stop(): number {
  return 1;
  return 2;
}`,
  },
  {
    id: "declaration",
    flag: "isolatedDeclarations",
    code: `export function stamp() {
  return Date.now();
}`,
  },
];

/** The text of the sample: the file `src/sample.ts` of the compiled project. */
export const SAMPLE: string = `${FRAGMENTS.map((fragment) => fragment.code).join("\n\n")}\n`;

/** The second file of the compiled project, for the import of the sample. */
export const SHAPE: string = "export interface Shape {\n  size: number;\n}\n";

/** The name of the project of the table, and the start value of the name on the page. */
export const PROJECT_NAME = "my-lib";
