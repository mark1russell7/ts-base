#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import { createPackageTemplate, createTsconfigTemplate, tsconfigConfigs, type ConfigType } from './templates.js';
import { merge } from './merge.js';
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
  config: ConfigType;
  overwrite: boolean;
}

function parseInitArgs(args: string[]): InitOptions {
  let name: string | null = null;
  let config: ConfigType = 'esm';
  let overwrite = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--config' || arg === '-c') {
      const nextArg = args[++i];
      if (nextArg && nextArg in tsconfigConfigs) {
        config = nextArg as ConfigType;
      }
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
  const options = parseInitArgs(args);

  if (!(options.config in tsconfigConfigs)) {
    console.error(`Error: Unknown config "${options.config}". Use: esm, cjs, or frontend`);
    process.exit(1);
  }

  // Read existing package.json to get name if not provided
  const pkgPath = resolve(cwd, 'package.json');
  let existingPkg: Partial<PackageJson> = {};
  let isNewPkg = false;

  if (existsSync(pkgPath)) {
    try {
      existingPkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as Partial<PackageJson>;
    } catch {
      // Start fresh if parse fails
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
      existingTsconfig = JSON.parse(readFileSync(tsconfigPath, 'utf-8')) as Partial<Tsconfig>;
    } catch {
      // Start fresh if parse fails
    }
  }

  const tsconfigTemplate = createTsconfigTemplate(options.config);
  const mergedTsconfig = merge(existingTsconfig, tsconfigTemplate, { overwrite: options.overwrite });

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

  if (!(configArg in tsconfigConfigs)) {
    console.error(`Error: Unknown config "${configArg}". Use: esm, cjs, or frontend`);
    process.exit(1);
  }

  const config = configArg as ConfigType;
  const tsconfigPath = resolve(cwd, 'tsconfig.json');
  let existingTsconfig: Partial<Tsconfig> = {};

  if (existsSync(tsconfigPath)) {
    try {
      existingTsconfig = JSON.parse(readFileSync(tsconfigPath, 'utf-8')) as Partial<Tsconfig>;
    } catch {
      // Start fresh if parse fails
    }
  }

  const template = createTsconfigTemplate(config);
  const merged = merge(existingTsconfig, template, { overwrite: false });
  // Always update extends
  merged.extends = tsconfigConfigs[config];

  writeFileSync(tsconfigPath, JSON.stringify(merged, null, 2) + '\n');
  console.log(`✓ tsconfig.json -> extends ${tsconfigConfigs[config]}`);
}
