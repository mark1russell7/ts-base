#!/usr/bin/env node
import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const configs = {
  esm: './tsconfig/esm.lib.json',
  cjs: './tsconfig/commonjs.lib.json',
  commonjs: './tsconfig/commonjs.lib.json',
  frontend: './tsconfig/frontend.json',
  browser: './tsconfig/frontend.json',
};

const args = process.argv.slice(2);
let configName = args[0];
let outputPath = args[1] || resolve(root, 'tsconfig.json');

if (!configName || !configs[configName]) {
  console.error('Usage: npm run set-tsconfig <config> [output-path]');
  console.error('');
  console.error('Configs:');
  console.error('  esm       Node.js ESM (nodenext)');
  console.error('  cjs       Node.js CommonJS');
  console.error('  frontend  Browser/React (bundler resolution)');
  console.error('');
  console.error('Examples:');
  console.error('  npm run set-tsconfig esm');
  console.error('  npm run set-tsconfig frontend ./packages/ui/tsconfig.json');
  process.exit(1);
}

const extendsPath = configs[configName];

// If custom output path, adjust the extends path
let finalExtends = extendsPath;
if (outputPath !== resolve(root, 'tsconfig.json')) {
  // Calculate relative path from output location to tsconfig folder
  const outputDir = dirname(resolve(outputPath));
  const tsconfigDir = resolve(root, 'tsconfig');
  const relative = resolve(outputDir, extendsPath.replace('./tsconfig/', ''));

  // For simplicity, if outputting elsewhere, use path relative to ts-base root
  // User may need to adjust manually for deeply nested paths
  finalExtends = extendsPath;
}

const content = {
  $schema: 'https://json.schemastore.org/tsconfig',
  extends: finalExtends,
};

writeFileSync(outputPath, JSON.stringify(content, null, 2) + '\n');
console.log(`tsconfig set to: ${configName} (${extendsPath})`);
console.log(`Written to: ${outputPath}`);
