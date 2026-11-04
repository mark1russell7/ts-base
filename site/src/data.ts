/**
 * The data of the page. Vite reads the real files of `tsconfig/` at build time, and the script `scripts/tsc-table.ts` writes
 * the results of tsc. This module has no copy of a setting.
 */
import { createTsconfigTemplate, tsconfigConfigs, type ConfigType } from "@mark1russell7/ts-base";
import { layersOf, type Layer, type PresetResult, type RawConfig, type Table } from "./model.ts";
import record from "./tsc-table.json";

const modules = import.meta.glob<RawConfig>("../../tsconfig/*.json", { eager: true, import: "default" });

/** The real files of `tsconfig/`, by file name. */
export const FILES: Readonly<Record<string, RawConfig>> = Object.fromEntries(Object.entries(modules).map(([path, raw]) => [path.slice(path.lastIndexOf("/") + 1), raw]));

/** The record of the real CLI and of tsc. */
export const TABLE: Table = record as unknown as Table;

/** The configs of the real CLI, in the sequence of its table. */
export const CONFIGS: readonly ConfigType[] = Object.keys(tsconfigConfigs) as ConfigType[];

/** The name of the file of `tsconfig/` for a config. */
export function presetOf(config: ConfigType): string {
  const path = tsconfigConfigs[config];
  return path.slice(path.lastIndexOf("/") + 1);
}

/** This function gives the chain of a config: the files of the package, then the `tsconfig.json` that `init` writes. */
export function layersFor(config: ConfigType): Layer[] {
  return [...layersOf(presetOf(config), FILES), { file: "tsconfig.json", raw: createTsconfigTemplate(config) as RawConfig }];
}

/**
 * This function gives the results of tsc for a config.
 *
 * @throws Error when the record does not have the preset of the config
 */
export function resultFor(config: ConfigType): PresetResult {
  const result = TABLE.presets[presetOf(config)];
  if (result === undefined) throw new Error(`The record of tsc does not have the config ${config}.`);
  return result;
}
