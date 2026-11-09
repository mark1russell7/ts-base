// The readers of the config files of the CLI. A file that does not parse must stop the command, so that the command
// does not write a template over it.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ConfigReadError, parsePackageText, parseTsconfigText } from '../src/read-config.ts';

describe('parseTsconfigText', () => {
  it('reads comments and trailing commas, as tsc does', () => {
    const text = '{\n  // the base\n  "extends": "./base.json",\n  /* the options */\n  "compilerOptions": { "strict": true, },\n}\n';
    assert.deepEqual(parseTsconfigText(text, 'tsconfig.json'), { extends: './base.json', compilerOptions: { strict: true } });
  });

  it('stops on text that does not parse, or that is not an object', () => {
    for (const text of ['{ "extends": ', '[1, 2]', '"text"']) {
      assert.throws(() => parseTsconfigText(text, 'tsconfig.json'), ConfigReadError);
    }
  });
});

describe('parsePackageText', () => {
  it('reads strict JSON', () => {
    assert.deepEqual(parsePackageText('{ "name": "a" }', 'package.json'), { name: 'a' });
  });

  it('stops on a comment, on text that does not parse, or on a value that is not an object', () => {
    for (const text of ['{ // no\n "name": "a" }', '{ "name": ', 'null']) {
      assert.throws(() => parsePackageText(text, 'package.json'), (error: unknown) => error instanceof ConfigReadError && error.message.startsWith('package.json: '));
    }
  });
});
