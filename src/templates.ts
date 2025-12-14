import type { PackageJson, Tsconfig } from './schema.js';

/**
 * Available tsconfig configurations
 */
export const tsconfigConfigs = {
  esm: '@mark1russell7/ts-base/tsconfig/esm.lib.json',
  cjs: '@mark1russell7/ts-base/tsconfig/commonjs.lib.json',
  commonjs: '@mark1russell7/ts-base/tsconfig/commonjs.lib.json',
  frontend: '@mark1russell7/ts-base/tsconfig/frontend.json',
  browser: '@mark1russell7/ts-base/tsconfig/frontend.json',
} as const;

export type ConfigType = keyof typeof tsconfigConfigs;

/**
 * Create a package.json template
 */
export function createPackageTemplate(name: string, shortName: string): PackageJson {
  return {
    $schema: 'https://json.schemastore.org/package',
    name,
    version: '0.0.0',
    description: 'Package description',
    license: 'MIT',
    author: 'Mark Russell <marktheprogrammer17@gmail.com>',
    type: 'module',
    main: './dist/index.js',
    types: './dist/index.d.ts',
    exports: {
      '.': {
        types: './dist/index.d.ts',
        import: './dist/index.js',
      },
    },
    files: ['dist', 'src'],
    scripts: {
      build: 'tsc -b',
      typecheck: 'tsc --noEmit',
      clean: 'rm -rf dist .tsbuildinfo',
    },
    sideEffects: false,
    devDependencies: {
      '@mark1russell7/ts-base': 'github:mark1russell7/ts-base#main',
      typescript: '^5.9.3',
    },
    dependencies: {},
    peerDependencies: {},
    keywords: [],
    repository: {
      type: 'git',
      url: `https://github.com/mark1russell7/${shortName}.git`,
    },
    bugs: {
      url: `https://github.com/mark1russell7/${shortName}/issues`,
    },
    homepage: `https://github.com/mark1russell7/${shortName}#readme`,
    publishConfig: {
      access: 'public',
    },
    engines: {
      node: '>=25.0.0',
      npm: '>=11.0.0',
    },
  };
}

/**
 * Create a tsconfig.json template
 */
export function createTsconfigTemplate(config: ConfigType): Tsconfig {
  return {
    $schema: 'https://json.schemastore.org/tsconfig',
    extends: tsconfigConfigs[config],
  };
}
