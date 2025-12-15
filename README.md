# ts-base

TypeScript project configuration with hyper-strict tsconfig composition.

## Installation

```bash
npm install --save-dev github:mark1russell7/ts-base#main
npx @mark1russell7/ts-base init my-package-name
```

Or if published to npm:

```bash
npm install --save-dev @mark1russell7/ts-base
npx @mark1russell7/ts-base init my-package-name
```

## Usage

### Initialize a new project

```bash
npx @mark1russell7/ts-base init my-lib                 # ESM (default)
npx @mark1russell7/ts-base init my-app --config frontend  # Browser/React
npx @mark1russell7/ts-base init my-tool -c cjs         # CommonJS
npx @mark1russell7/ts-base init                        # Use existing name or folder name
npx @mark1russell7/ts-base init --overwrite            # Reset package.json to clean scaffold
```

This will:
1. Create/update `tsconfig.json` to extend from ts-base
2. Set up `package.json` with:
   - `name`: `@mark1russell7/<name>`
   - `type`: `"module"`, `main`, `types`, `exports`
   - `build`, `typecheck`, `clean` scripts
   - `repository`, `bugs`, `homepage` URLs
   - `typescript` and `@mark1russell7/ts-base` as devDependencies
3. Create `src/index.ts` if missing

### Change tsconfig type

```bash
npx @mark1russell7/ts-base set-tsconfig frontend
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

If you prefer not to use the CLI, create a `tsconfig.json`:

```json
{
  "extends": "@mark1russell7/ts-base/tsconfig/esm.lib.json"
}
```

The `${configDir}` paths in the base configs resolve to your project root, so `src/`, `dist/`, etc. will be in your project, not in node_modules.
