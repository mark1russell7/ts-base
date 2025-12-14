#!/usr/bin/env node
import { readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const configs = {
  esm: './tsconfig/esm.lib.json',
  cjs: './tsconfig/commonjs.lib.json',
  commonjs: './tsconfig/commonjs.lib.json',
  frontend: './tsconfig/frontend.json',
  browser: './tsconfig/frontend.json',
};

// Parse args
const args = process.argv.slice(2);
let name = null;
let config = 'esm';

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '--config' || arg === '-c') {
    config = args[++i];
  } else if (arg === '--help' || arg === '-h') {
    printHelp();
    process.exit(0);
  } else if (!name) {
    name = arg;
  }
}

function printHelp() {
  console.log(`
Usage: npm run init <name> [--config <type>]

Initialize this repo as a new project.

Arguments:
  name              Package name (without @mark1russell7/ prefix)

Options:
  -c, --config      tsconfig type: esm (default), cjs, frontend
  -h, --help        Show this help

Examples:
  npm run init my-lib
  npm run init my-app --config frontend
  npm run init my-tool -c cjs

This will:
  1. Set package name to @mark1russell7/<name>
  2. Update repository URLs
  3. Set tsconfig to specified type
  4. Remove .git and reinitialize fresh
`);
}

if (!name) {
  // Default to folder name
  name = basename(root);
  if (name === 'ts-base') {
    console.error('Error: Please provide a package name or rename the folder first.');
    console.error('');
    printHelp();
    process.exit(1);
  }
}

if (!configs[config]) {
  console.error(`Error: Unknown config "${config}". Use: esm, cjs, or frontend`);
  process.exit(1);
}

const fullName = name.startsWith('@') ? name : `@mark1russell7/${name}`;
const shortName = fullName.replace('@mark1russell7/', '');

console.log(`Initializing: ${fullName}`);
console.log(`Config: ${config}`);
console.log('');

// 1. Update package.json
const pkgPath = resolve(root, 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));

pkg.name = fullName;
pkg.repository.url = `https://github.com/mark1russell7/${shortName}.git`;
pkg.bugs.url = `https://github.com/mark1russell7/${shortName}/issues`;
pkg.homepage = `https://github.com/mark1russell7/${shortName}#readme`;

writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
console.log(`✓ Package name: ${fullName}`);

// 2. Update tsconfig.json
const tsconfigPath = resolve(root, 'tsconfig.json');
const tsconfig = {
  $schema: 'https://json.schemastore.org/tsconfig',
  extends: configs[config],
};
writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2) + '\n');
console.log(`✓ tsconfig: ${config} (${configs[config]})`);

// 3. Reinitialize git
const gitDir = resolve(root, '.git');
if (existsSync(gitDir)) {
  rmSync(gitDir, { recursive: true, force: true });
}
execSync('git init', { cwd: root, stdio: 'pipe' });
console.log('✓ Git reinitialized');

console.log('');
console.log('Done! Next steps:');
console.log('  npm install');
console.log('  git add -A && git commit -m "Initial commit"');
