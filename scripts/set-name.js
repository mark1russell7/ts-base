#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const name = process.argv[2];
if (!name) {
  console.error('Usage: npm run set-name <package-name>');
  console.error('Example: npm run set-name my-cool-lib');
  process.exit(1);
}

const fullName = name.startsWith('@') ? name : `@mark1russell7/${name}`;
const shortName = fullName.replace('@mark1russell7/', '');

const pkgPath = resolve(root, 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));

pkg.name = fullName;
pkg.repository.url = `https://github.com/mark1russell7/${shortName}.git`;
pkg.bugs.url = `https://github.com/mark1russell7/${shortName}/issues`;
pkg.homepage = `https://github.com/mark1russell7/${shortName}#readme`;

writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
console.log(`Package name set to: ${fullName}`);
