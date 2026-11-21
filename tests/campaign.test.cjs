const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const runner = path.join(__dirname, '..', 'tools', 'campaign.cjs');
for (const [difficulty, route] of [
  ['gentle', 'ordered'],
  ['normal', 'ordered'],
  ['hard', 'ordered'],
  ['normal', '--night-route'],
  ['normal', '--day-route'],
]) {
  test(`new campaign reaches victory: ${difficulty}, ${route}`, () => {
    const result = spawnSync(
      process.execPath,
      [runner, '31719', difficulty, route],
      {
        encoding: 'utf8',
        timeout: 60000,
      },
    );
    assert.ifError(result.error);
    assert.equal(result.status, 0, result.stdout + result.stderr);
  });
}
