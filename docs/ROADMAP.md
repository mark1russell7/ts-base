# Roadmap

This file is the plan of ts-base. The Status page of the site reads it.

| ID | Item | Status | Summary |
| --- | --- | --- | --- |
| T1 | The tsconfig presets | done | The package has seven files in `tsconfig/`. The file `shared.json` has the strict flags, and small files add the module system and the paths. |
| T2 | The CLI | done | `ts-base init` writes `tsconfig.json`, `package.json` and `src/index.ts`. `ts-base set-tsconfig` changes the config of a project. |
| T3 | The site | in progress | The site at https://mark1russell7.github.io/ts-base/ traces each setting of a merged tsconfig to its file. It shows which code each strict flag refuses, with real tsc results. |
| T4 | The package on the npm registry in the README | not started | The README tells how to install from GitHub first. The npm form becomes the only form after a check of each step. |
| T5 | Tests of the published package | not started | The root package has no tests of its own. The tests of the site start the CLI, so they cover `init` with each config. A test suite covers `set-tsconfig` and `merge`. |
