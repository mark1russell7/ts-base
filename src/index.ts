// Schema exports
export {
  PackageJsonSchema,
  TsconfigSchema,
  validate,
  getErrors,
  type PackageJson,
  type Tsconfig,
} from './schema.js';

// Template exports
export {
  tsconfigConfigs,
  createPackageTemplate,
  createTsconfigTemplate,
  type ConfigType,
} from './templates.js';

// Merge exports
export { merge, type MergeOptions } from './merge.js';
