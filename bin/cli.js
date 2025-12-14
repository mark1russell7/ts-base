#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgRoot = resolve(__dirname, '..');

const configs = {
  esm: '@mark1russell7/ts-base/tsconfig/esm.lib.json',
  cjs: '@mark1russell7/ts-base/tsconfig/commonjs.lib.json',
  commonjs: '@mark1russell7/ts-base/tsconfig/commonjs.lib.json',
  frontend: '@mark1russell7/ts-base/tsconfig/frontend.json',
  browser: '@mark1russell7/ts-base/tsconfig/frontend.json',
};

const defaultScripts = {
  build: 'tsc -b',
  typecheck: 'tsc --noEmit',
  clean: 'rm -rf dist .tsbuildinfo',
};

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

function printHelp() {
  console.log(`
ts-base - TypeScript project configuration

Usage:
  npx ts-base init [--config <type>]     Initialize/update project configuration
  npx ts-base set-tsconfig <type>        Change tsconfig type only

Options:
  -c, --config    tsconfig type: esm (default), cjs, frontend
  -h, --help      Show this help

Config types:
  esm       ESM with NodeNext resolution (default)
  cjs       CommonJS with Node resolution
  frontend  Browser/React with bundler resolution

Examples:
  npx ts-base init                    # Initialize with ESM config
  npx ts-base init --config frontend  # Initialize with frontend config
  npx ts-base set-tsconfig cjs        # Switch to CommonJS config

What 'init' does:
  1. Creates/updates tsconfig.json to extend from ts-base
  2. Adds build/typecheck/clean scripts to package.json (if missing)
  3. Adds typescript as devDependency (if missing)
`);
}

function init(args) {
  const cwd = process.cwd();
  let config = 'esm';

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--config' || arg === '-c') {
      config = args[++i];
    }
  }

  if (!configs[config]) {
    console.error(`Error: Unknown config "${config}". Use: esm, cjs, or frontend`);
    process.exit(1);
  }

  console.log(`Initializing ts-base with config: ${config}`);
  console.log('');

  // 1. Update/create tsconfig.json
  const tsconfigPath = resolve(cwd, 'tsconfig.json');
  let tsconfig = {};

  if (existsSync(tsconfigPath)) {
    try {
      tsconfig = JSON.parse(readFileSync(tsconfigPath, 'utf-8'));
    } catch {
      // If parse fails, start fresh
    }
  }

  tsconfig.$schema = 'https://json.schemastore.org/tsconfig';
  tsconfig.extends = configs[config];

  writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2) + '\n');
  console.log(`✓ tsconfig.json -> extends ${configs[config]}`);

  // 2. Update package.json
  const pkgPath = resolve(cwd, 'package.json');
  if (!existsSync(pkgPath)) {
    console.log('⚠ No package.json found. Run "npm init" first.');
    return;
  }

  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
  let modified = false;

  // Add scripts if missing
  if (!pkg.scripts) {
    pkg.scripts = {};
  }

  for (const [name, cmd] of Object.entries(defaultScripts)) {
    if (!pkg.scripts[name]) {
      pkg.scripts[name] = cmd;
      console.log(`✓ Added script: ${name}`);
      modified = true;
    }
  }

  // Add typescript devDependency if missing
  if (!pkg.devDependencies) {
    pkg.devDependencies = {};
  }

  if (!pkg.devDependencies.typescript) {
    pkg.devDependencies.typescript = '^5.9.3';
    console.log('✓ Added devDependency: typescript');
    modified = true;
  }

  if (modified) {
    writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  }

  console.log('');
  console.log('Done! Your project is configured with ts-base.');
}

function setTsconfig(args) {
  const cwd = process.cwd();
  const config = args[0];

  if (!config) {
    console.error('Error: Please specify a config type (esm, cjs, frontend)');
    process.exit(1);
  }

  if (!configs[config]) {
    console.error(`Error: Unknown config "${config}". Use: esm, cjs, or frontend`);
    process.exit(1);
  }

  const tsconfigPath = resolve(cwd, 'tsconfig.json');
  let tsconfig = {};

  if (existsSync(tsconfigPath)) {
    try {
      tsconfig = JSON.parse(readFileSync(tsconfigPath, 'utf-8'));
    } catch {
      // Start fresh if parse fails
    }
  }

  tsconfig.$schema = 'https://json.schemastore.org/tsconfig';
  tsconfig.extends = configs[config];

  writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2) + '\n');
  console.log(`✓ tsconfig.json -> extends ${configs[config]}`);
}
