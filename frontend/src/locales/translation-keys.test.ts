import { join } from 'node:path';
import { readdirSync, readFileSync } from 'node:fs';

import { uzLatn } from './langs/uz-latn';

// Guards against renamed or mistyped keys: every literal t('...') key used in the app must exist.

const SRC = join(__dirname, '..');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? sourceFiles(join(dir, e.name)) : /(?<!\.test)\.tsx?$/.test(e.name) ? [join(dir, e.name)] : []
  );
}

const lookup = (key: string) =>
  key.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], uzLatn);

describe('translation keys', () => {
  const used = sourceFiles(SRC).flatMap((file) =>
    [...readFileSync(file, 'utf8').matchAll(/\bt\(\s*'([^']+)'/g)].map((m) => ({ file, key: m[1] }))
  );

  it('finds keys to check', () => {
    expect(used.length).toBeGreaterThan(50);
  });

  it('every used key exists in the dictionary', () => {
    expect(used.filter(({ key }) => typeof lookup(key) !== 'string')).toEqual([]);
  });
});
