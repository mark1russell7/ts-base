#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

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
  npx ts-base init [name] [options]    Initialize/update project configuration
  npx ts-base set-tsconfig <type>      Change tsconfig type only

Arguments:
  name              Package name (without @mark1russell7/ prefix)
                    If omitted, uses current folder name

Options:
  -c, --config      tsconfig type: esm (default), cjs, frontend
  -h, --help        Show this help

Config types:
  esm       ESM with NodeNext resolution (default)
  cjs       CommonJS with Node resolution
  frontend  Browser/React with bundler resolution

Examples:
  npx ts-base init my-lib                 # Full setup with package name
  npx ts-base init my-app -c frontend     # Frontend/React setup
  npx ts-base init                        # Use folder name, ESM config
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

function init(args) {
  const cwd = process.cwd();
  let name = null;
  let config = 'esm';

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--config' || arg === '-c') {
      config = args[++i];
    } else if (!arg.startsWith('-') && !name) {
      name = arg;
    }
  }

  if (!configs[config]) {
    console.error(`Error: Unknown config "${config}". Use: esm, cjs, or frontend`);
    process.exit(1);
  }

  // Default to folder name
  if (!name) {
    name = basename(cwd);
  }

  const fullName = name.startsWith('@') ? name : `@mark1russell7/${name}`;
  const shortName = fullName.replace(/^@[^/]+\//, '');

  console.log(`Initializing: ${fullName}`);
  console.log(`Config: ${config}`);
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

  // 2. Update/create package.json
  const pkgPath = resolve(cwd, 'package.json');
  let pkg = {};
  let isNew = false;

  if (existsSync(pkgPath)) {
    try {
      pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    } catch {
      // Start fresh if parse fails
    }
  } else {
    isNew = true;
  }

  // Set/update core fields
  pkg.$schema = pkg.$schema || 'https://json.schemastore.org/package';
  pkg.name = fullName;
  pkg.version = pkg.version || '0.0.0';
  pkg.description = pkg.description || 'Package description';
  pkg.license = pkg.license || 'MIT';
  pkg.author = pkg.author || 'Mark Russell <marktheprogrammer17@gmail.com>';
  pkg.type = 'module';
  pkg.main = './dist/index.js';
  pkg.types = './dist/index.d.ts';
  pkg.exports = {
    '.': {
      types: './dist/index.d.ts',
      import: './dist/index.js',
    },
  };
  pkg.files = ['dist', 'src'];

  // Scripts
  if (!pkg.scripts) {
    pkg.scripts = {};
  }
  for (const [scriptName, cmd] of Object.entries(defaultScripts)) {
    if (!pkg.scripts[scriptName]) {
      pkg.scripts[scriptName] = cmd;
    }
  }

  pkg.sideEffects = false;

  // Dependencies
  if (!pkg.devDependencies) {
    pkg.devDependencies = {};
  }
  if (!pkg.devDependencies['@mark1russell7/ts-base']) {
    pkg.devDependencies['@mark1russell7/ts-base'] = 'github:mark1russell7/ts-base#main';
  }
  if (!pkg.devDependencies.typescript) {
    pkg.devDependencies.typescript = '^5.9.3';
  }

  if (!pkg.dependencies) {
    pkg.dependencies = {};
  }
  if (!pkg.peerDependencies) {
    pkg.peerDependencies = {};
  }

  // Metadata
  pkg.keywords = pkg.keywords || [];
  pkg.repository = {
    type: 'git',
    url: `https://github.com/mark1russell7/${shortName}.git`,
  };
  pkg.bugs = {
    url: `https://github.com/mark1russell7/${shortName}/issues`,
  };
  pkg.homepage = `https://github.com/mark1russell7/${shortName}#readme`;
  pkg.publishConfig = {
    access: 'public',
  };
  pkg.engines = pkg.engines || {
    node: '>=20.0.0',
  };

  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  console.log(`✓ package.json ${isNew ? 'created' : 'updated'}`);
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
