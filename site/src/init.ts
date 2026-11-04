/**
 * The step `init` of the CLI, with no file system. It calls the real templates, `merge` and `validate` of the package. It
 * follows the same sequence as `init` in `src/cli.ts`, and the test of the site compares the two.
 */
import { createPackageTemplate, createTsconfigTemplate, getErrors, merge, PackageJsonSchema, validate, type ConfigType, type PackageJson, type Tsconfig } from "@mark1russell7/ts-base";
import { packageNames } from "./model.ts";

/** The input of one run. */
export interface InitRun {
  readonly config: ConfigType;
  /** The name argument. An empty name uses the name of `existing`, then `fallbackName`. */
  readonly name: string;
  readonly overwrite: boolean;
  /** The text of the package.json that exists. An empty text means that there is no file. */
  readonly existing: string;
  /** The name of the folder, for a run with no other name. */
  readonly fallbackName: string;
}

/** The result of one run. */
export interface InitOutput {
  readonly tsconfig: string;
  readonly package: string;
  /** The warnings of the schema. */
  readonly problems: readonly string[];
  /** True when the existing file is not JSON. The CLI then starts with an empty object. */
  readonly badJson: boolean;
}

/** This function gives the object of an existing package.json. Text that is not a JSON object gives an empty object. */
function parseExisting(text: string): { readonly value: Partial<PackageJson>; readonly badJson: boolean } {
  if (text.trim() === "") return { value: {}, badJson: false };
  try {
    return { value: JSON.parse(text) as Partial<PackageJson>, badJson: false };
  } catch {
    return { value: {}, badJson: true };
  }
}

/** This function does the steps of `init` and gives the two files. */
export function runInit(input: InitRun): InitOutput {
  const { value: existing, badJson } = parseExisting(input.existing);
  const name = input.name.trim() === "" ? (existing.name ?? input.fallbackName) : input.name.trim();
  const { fullName, shortName } = packageNames(name);
  const tsconfig = merge<Tsconfig>({}, createTsconfigTemplate(input.config), { overwrite: input.overwrite });
  const merged = merge<PackageJson>(existing, createPackageTemplate(fullName, shortName), { overwrite: input.overwrite });
  merged.name = fullName;
  return {
    tsconfig: `${JSON.stringify(tsconfig, null, 2)}\n`,
    package: `${JSON.stringify(merged, null, 2)}\n`,
    problems: validate<PackageJson>(PackageJsonSchema, merged) ? [] : getErrors(PackageJsonSchema, merged),
    badJson,
  };
}
