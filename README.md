# ts-base

TypeScript project configuration with hyper-strict tsconfig composition.

## Installation

```bash
npm install --save-dev @mark1russell7/ts-base
npx ts-base init
```

## Usage

### Initialize a new project

```bash
npx ts-base init                    # ESM (default)
npx ts-base init --config frontend  # Browser/React
npx ts-base init -c cjs             # CommonJS
```

This will:
1. Create/update `tsconfig.json` to extend from ts-base
2. Add `build`, `typecheck`, `clean` scripts to package.json
3. Add `typescript` as a devDependency

### Change tsconfig type

```bash
npx ts-base set-tsconfig frontend
```

## Config types

| Type | Use case |
|------|----------|
| `esm` | Node.js ESM packages (default) |
| `cjs` | Node.js CommonJS packages |
| `frontend` | Browser/React apps with bundler |

## tsconfig composition

```
tsconfig/
├── shared.json          # Hyper-strict base settings
├── esm.json             # ESM: nodenext module/resolution
├── commonjs.json        # CJS: commonjs module, node resolution
├── lib.json             # Output paths using ${configDir}
├── esm.lib.json         # ESM + lib combined
├── commonjs.lib.json    # CJS + lib combined
└── frontend.json        # DOM/JSX/bundler for browser
```

## Manual setup

If you prefer not to use the CLI, just create a `tsconfig.json`:

```json
{
  "extends": "@mark1russell7/ts-base/tsconfig/esm.lib.json"
}
```

The `${configDir}` paths in the base configs resolve to your project root, so `src/`, `dist/`, etc. will be in your project, not in node_modules.
