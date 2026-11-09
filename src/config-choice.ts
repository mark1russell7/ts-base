// The choice of a tsconfig config by the CLI, and the tsconfig.json that the choice gives.
import { merge } from './merge.ts';
import { createTsconfigTemplate, tsconfigConfigs, type ConfigType } from './templates.ts';
import type { Tsconfig } from './schema.ts';

/** The names that the CLI accepts after --config and set-tsconfig. */
export const configNames: readonly string[] = Object.keys(tsconfigConfigs);

/**
 * This function gives the config of a name, or null for a name that is not a config.
 * Only an own key is a config, so a name such as "toString" or "constructor" gives null.
 */
export function configOf(name: string | undefined): ConfigType | null {
  return name !== undefined && Object.hasOwn(tsconfigConfigs, name) ? (name as ConfigType) : null;
}

/**
 * This function gives the tsconfig.json for a config. Without overwrite, the other keys of the existing file stay;
 * the value of extends is always that of the config, so the file and the report of the CLI agree.
 */
export function tsconfigFor(existing: Partial<Tsconfig>, config: ConfigType, overwrite: boolean): Tsconfig {
  const merged = merge(existing, createTsconfigTemplate(config), { overwrite }) as Tsconfig;
  merged.extends = tsconfigConfigs[config];
  return merged;
}
