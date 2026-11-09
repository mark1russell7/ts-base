import ts from 'typescript';

/**
 * A config file that the CLI cannot read as a JSON object. The CLI stops on it, so it does not write a template over
 * the file and lose its settings.
 */
export class ConfigReadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigReadError';
  }
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * This function reads the text of a `tsconfig.json` file. Comments and trailing commas are allowed, as `tsc` allows them.
 *
 * @throws ConfigReadError when the text is not valid, or is not a JSON object
 */
export function parseTsconfigText(text: string, file: string): Record<string, unknown> {
  const { config, error } = ts.parseConfigFileTextToJson(file, text);
  if (error !== undefined) {
    throw new ConfigReadError(`${file}: ${ts.flattenDiagnosticMessageText(error.messageText, '\n')}`);
  }
  if (!isObject(config)) throw new ConfigReadError(`${file}: the file is not a JSON object.`);
  return config;
}

/**
 * This function reads the text of a `package.json` file. It is strict JSON, as npm reads it.
 *
 * @throws ConfigReadError when the text is not valid JSON, or is not a JSON object
 */
export function parsePackageText(text: string, file: string): Record<string, unknown> {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch (error) {
    throw new ConfigReadError(`${file}: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (!isObject(value)) throw new ConfigReadError(`${file}: the file is not a JSON object.`);
  return value;
}
