#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import { createPackageTemplate, tsconfigConfigs, type ConfigType } from './templates.js';
import { configNames, configOf, tsconfigFor } from './config-choice.js';
import { merge } from './merge.js';
import { ConfigReadError, parsePackageText, parseTsconfigText } from './read-config.js';
import { PackageJsonSchema, validate, getErrors, type PackageJson, type Tsconfig } from './schema.js';

const args = process.argv.slice(2);
const command = args[0];

if (!command || command === '--help' || command === '-h') {
  printHelp();
  process.exit(0);
}

if (command === 'init') {
  init(args.slice(1));
} else if (command === 'set-tsconfig') {
  setTsconfig(args.slice(1));
} else {
  console.error(`Unknown command: ${command}`);
  printHelp();
  process.exit(1);
}

function printHelp(): void {
  console.log(`
ts-base - TypeScript project configuration

Usage:
  npx ts-base init [name] [options]    Initialize/update project configuration
  npx ts-base set-tsconfig <type>      Change tsconfig type only

Arguments:
  name              Package name (without @mark1russell7/ prefix)
                    If omitted, uses existing package.json name or folder name

Options:
  -c, --config      tsconfig type: esm (default), cjs, frontend
  --overwrite       Reset package.json to clean scaffold (keeps name & ts-base dep)
  -h, --help        Show this help

Config types:
  esm       ESM with NodeNext resolution (default)
  cjs       CommonJS with Node resolution
  frontend  Browser/React with bundler resolution

Examples:
  npx ts-base init my-lib                 # Full setup with package name
  npx ts-base init my-app -c frontend     # Frontend/React setup
  npx ts-base init                        # Use existing name or folder name
  npx ts-base init --overwrite            # Reset package.json to clean state
  npx ts-base set-tsconfig cjs            # Switch existing project to CJS

What 'init' does:
  1. Creates/updates tsconfig.json to extend from ts-base
  2. Sets up package.json with:
     - name: @mark1russell7/<name>
     - type: "module", main, types, exports
     - build/typecheck/clean scripts
     - repository/bugs/homepage URLs
     - typescript devDependency
  3. Creates src/ directory with index.ts if missing
`);
}

interface InitOptions {
  name: string | null;
  /** The name after --config as typed, or null when there is none. */
  config: string | null;
  overwrite: boolean;
}

function parseInitArgs(args: string[]): InitOptions {
  let name: string | null = null;
  let config: string | null = null;
  let overwrite = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--config' || arg === '-c') {
      config = args[++i] ?? '';
    } else if (arg === '--overwrite') {
      overwrite = true;
    } else if (!arg?.startsWith('-') && !name) {
      name = arg ?? null;
    }
  }

  return { name, config, overwrite };
}

function init(args: string[]): void {
  const cwd = process.cwd();
  const parsed = parseInitArgs(args);
  const config = parsed.config === null ? 'esm' : configOf(parsed.config);
  if (config === null) unknownConfig(parsed.config ?? '');
  const options = { ...parsed, config };

  // Read existing package.json to get name if not provided
  const pkgPath = resolve(cwd, 'package.json');
  let existingPkg: Partial<PackageJson> = {};
  let isNewPkg = false;

  if (existsSync(pkgPath)) {
    // A file that does not parse stops the command. Only --overwrite starts again from the template.
    try {
      existingPkg = parsePackageText(readFileSync(pkgPath, 'utf-8'), pkgPath) as Partial<PackageJson>;
    } catch (error) {
      if (!options.overwrite) stopOn(error);
    }
  } else {
    isNewPkg = true;
  }

  // Determine package name: arg > existing > folder name
  const name = options.name ?? existingPkg.name ?? basename(cwd);
  const fullName = name.startsWith('@') ? name : `@mark1russell7/${name}`;
  const shortName = fullName.replace(/^@[^/]+\//, '');

  console.log(`Initializing: ${fullName}`);
  console.log(`Config: ${options.config}`);
  if (options.overwrite) {
    console.log('Mode: overwrite (clean scaffold)');
  }
  console.log('');

  // 1. Update/create tsconfig.json
  const tsconfigPath = resolve(cwd, 'tsconfig.json');
  let existingTsconfig: Partial<Tsconfig> = {};

  if (!options.overwrite && existsSync(tsconfigPath)) {
    try {
      existingTsconfig = parseTsconfigText(readFileSync(tsconfigPath, 'utf-8'), tsconfigPath) as Partial<Tsconfig>;
    } catch (error) {
      stopOn(error);
    }
  }

  const mergedTsconfig = tsconfigFor(existingTsconfig, options.config, options.overwrite);

  writeFileSync(tsconfigPath, JSON.stringify(mergedTsconfig, null, 2) + '\n');
  console.log(`✓ tsconfig.json -> extends ${tsconfigConfigs[options.config]}`);

  // 2. Update/create package.json
  const pkgTemplate = createPackageTemplate(fullName, shortName);
  const mergedPkg = merge(existingPkg, pkgTemplate, { overwrite: options.overwrite });

  // Always use the determined name
  mergedPkg.name = fullName;

  // Validate the result
  if (!validate<PackageJson>(PackageJsonSchema, mergedPkg)) {
    const errors = getErrors(PackageJsonSchema, mergedPkg);
    console.warn('⚠ package.json validation warnings:');
    errors.slice(0, 5).forEach((e) => console.warn(`  ${e}`));
    if (errors.length > 5) {
      console.warn(`  ... and ${errors.length - 5} more`);
    }
  }

  writeFileSync(pkgPath, JSON.stringify(mergedPkg, null, 2) + '\n');
  console.log(`✓ package.json ${isNewPkg ? 'created' : (options.overwrite ? 'overwritten' : 'updated')}`);
  console.log(`  name: ${fullName}`);
  console.log(`  repository: github.com/mark1russell7/${shortName}`);

  // 3. Create src/index.ts if missing
  const srcDir = resolve(cwd, 'src');
  const indexPath = resolve(srcDir, 'index.ts');

  if (!existsSync(indexPath)) {
    if (!existsSync(srcDir)) {
      mkdirSync(srcDir, { recursive: true });
    }
    writeFileSync(indexPath, 'export {};\n');
    console.log('✓ Created src/index.ts');
  }

  console.log('');
  console.log('Done! Next steps:');
  console.log('  npm install');
  console.log('  npm run build');
}

function setTsconfig(args: string[]): void {
  const cwd = process.cwd();
  const configArg = args[0];

  if (!configArg) {
    console.error('Error: Please specify a config type (esm, cjs, frontend)');
    process.exit(1);
  }

  const config: ConfigType | null = configOf(configArg);
  if (config === null) unknownConfig(configArg);
  const tsconfigPath = resolve(cwd, 'tsconfig.json');
  let existingTsconfig: Partial<Tsconfig> = {};

  if (existsSync(tsconfigPath)) {
    try {
      existingTsconfig = parseTsconfigText(readFileSync(tsconfigPath, 'utf-8'), tsconfigPath) as Partial<Tsconfig>;
    } catch (error) {
      stopOn(error);
    }
  }

  const merged = tsconfigFor(existingTsconfig, config, false);

  writeFileSync(tsconfigPath, JSON.stringify(merged, null, 2) + '\n');
  console.log(`✓ tsconfig.json -> extends ${tsconfigConfigs[config]}`);
}

/** This function stops the command on a config file that it cannot read, so it does not write over the file. */
function stopOn(error: unknown): never {
  if (!(error instanceof ConfigReadError)) throw error;
  console.error(`Error: ${error.message}`);
  console.error('The file did not change. Correct it, or start again from the template with --overwrite (init only).');
  process.exit(1);
}

/** This function stops the command on a name that is not a config, so the command does not write a default config. */
function unknownConfig(name: string): never {
  console.error(`Error: Unknown config "${name}". Use one of: ${configNames.join(', ')}`);
  process.exit(1);
}
