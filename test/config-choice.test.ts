// The choice of a config by the CLI. A name that is not a config must stop the command, and the extends of the
// written tsconfig.json must be that of the chosen config, also when the existing file has another one.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { configNames, configOf, tsconfigFor } from '../src/config-choice.ts';
import { tsconfigConfigs } from '../src/templates.ts';

describe('configOf', () => {
  it('gives the config of each name of tsconfigConfigs', () => {
    for (const name of configNames) assert.equal(configOf(name), name);
  });

  it('gives null for a misspelled name, an empty name, no name or a key of Object.prototype', () => {
    for (const name of ['fronted', '', undefined, 'toString', 'constructor', '__proto__', 'hasOwnProperty']) {
      assert.equal(configOf(name), null, String(name));
    }
  });
});

describe('tsconfigFor', () => {
  const existing = { extends: tsconfigConfigs.esm, compilerOptions: { strict: true }, include: ['src'] };

  it('sets extends to the chosen config and keeps the other keys', () => {
    const result = tsconfigFor(existing, 'frontend', false);
    assert.equal(result.extends, tsconfigConfigs.frontend);
    assert.deepEqual(result.compilerOptions, { strict: true });
    assert.deepEqual(result.include, ['src']);
  });

  it('gives only the template with overwrite', () => {
    assert.deepEqual(tsconfigFor(existing, 'cjs', true), {
      $schema: 'https://json.schemastore.org/tsconfig',
      extends: tsconfigConfigs.cjs,
    });
  });

  it('does not change the existing object', () => {
    tsconfigFor(existing, 'frontend', false);
    assert.equal(existing.extends, tsconfigConfigs.esm);
  });
});
