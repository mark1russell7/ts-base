# ts-base

TypeScript template with hyper-strict tsconfig composition.

## Starting a new project

```bash
# Clone ts-base to a new folder name
git clone ~/git/ts-base ~/git/my-new-lib

# Initialize with your package name
cd ~/git/my-new-lib
npm run init my-new-lib                    # defaults to ESM
npm run init my-new-lib --config frontend  # for browser/React
npm run init my-new-lib -c cjs             # for CommonJS

# Then
npm install
```

## Scripts

| Script | Usage |
|--------|-------|
| `npm run init <name> [-c esm\|cjs\|frontend]` | Full setup: sets name, tsconfig, reinits git |
| `npm run set-name <name>` | Just update package name + URLs |
| `npm run set-tsconfig <esm\|cjs\|frontend> [path]` | Just change tsconfig |

## What `init` does

1. Sets `name` to `@mark1russell7/<name>`
2. Updates `repository`, `bugs`, `homepage` URLs
3. Sets root tsconfig.json to chosen config
4. Deletes `.git` and runs `git init` fresh

## tsconfig composition

```
tsconfig/
├── shared.json          # Hyper-strict base
├── esm.json             # nodenext module/resolution
├── commonjs.json        # commonjs module, node resolution
├── lib.json             # ${configDir} output paths
├── esm.lib.json         # ESM + lib combined
├── commonjs.lib.json    # CJS + lib combined
└── frontend.json        # DOM/JSX/bundler for browser
```
