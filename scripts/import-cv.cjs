const { spawnSync } = require('node:child_process');
const { readFileSync, writeFileSync } = require('node:fs');
const { resolve } = require('node:path');

const inputPath = process.argv[2];
if (!inputPath) {
  console.error('Usage: node scripts/import-cv.cjs <local-data.json> [--apply|--restore]');
  process.exit(1);
}
const payload = JSON.parse(readFileSync(resolve(inputPath), 'utf8'));
const apply = process.argv.includes('--apply');
const restore = process.argv.includes('--restore');
if (apply && restore) throw new Error('Choose either --apply or --restore.');
const worker = String.raw`
const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./apps/backend/dist/app.module');
const { Database } = require('./apps/backend/dist/database');
const { validateDraft, snapshot } = require('./apps/backend/dist/cv-content-model');
const fs = require('node:fs');

(async () => {
  const input = JSON.parse(fs.readFileSync(0, 'utf8'));
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  try {
    const db = app.get(Database).db;
    if (input.action === 'read') {
      const row = await db.cvContent.findUnique({ where: { key: 'main' } });
      if (!row) throw new Error('CV content has not been initialized.');
      process.stdout.write(JSON.stringify(row));
      return;
    }
    const row = await db.cvContent.findUnique({ where: { key: 'main' } });
    if (!row || row.revision !== input.revision) throw new Error('CV changed since backup. Retry after reviewing the current draft.');
    if (input.action === 'restore') {
      const previous = input.data;
      if (previous.key !== 'main' || !previous.draft || !previous.publishedVi || !previous.publishedEn) {
        throw new Error('Invalid CV backup.');
      }
      const result = await db.cvContent.updateMany({
        where: { key: 'main', revision: input.revision },
        data: {
          draft: previous.draft, publishedVi: previous.publishedVi,
          publishedEn: previous.publishedEn, revision: { increment: 1 },
        },
      });
      if (!result.count) throw new Error('CV changed during restore. No changes applied.');
      process.stdout.write(JSON.stringify({ revision: input.revision, nextRevision: input.revision + 1, restored: true }));
      return;
    }
    const draft = structuredClone(row.draft);
    Object.assign(draft.shared, input.data.shared);
    for (const [section, entries] of Object.entries(input.data.sections)) {
      const incomingIds = new Set(entries.map((entry) => entry.shared.id));
      draft.shared.sections[section] = [
        ...(draft.shared.sections[section] ?? [])
          .filter((item) => !incomingIds.has(item.id))
          .map((item) => ({ ...item, hidden: true })),
        ...entries.map((entry) => entry.shared),
      ];
      for (const entry of entries) {
        for (const locale of ['vi', 'en']) draft.localized[locale].items[entry.shared.id] = entry[locale];
      }
    }
    for (const locale of ['vi', 'en']) Object.assign(draft.localized[locale], input.data.localized[locale]);
    const validated = validateDraft(draft);
    const at = new Date().toISOString();
    const publishedVi = { cv: snapshot(validated, 'vi', true), at };
    const publishedEn = { cv: snapshot(validated, 'en', true), at };
    if (input.action === 'apply') {
      const result = await db.cvContent.updateMany({
        where: { key: 'main', revision: input.revision },
        data: { draft: validated, publishedVi, publishedEn, revision: { increment: 1 } },
      });
      if (!result.count) throw new Error('CV changed during import. No changes applied.');
    }
    process.stdout.write(JSON.stringify({ revision: input.revision, nextRevision: input.revision + 1, applied: input.action === 'apply' }));
  } finally {
    await app.close();
  }
})().catch((error) => { console.error(error.message); process.exitCode = 1; });
`;

function execute(data) {
  const result = spawnSync('docker', ['compose', 'exec', '-T', 'backend', 'node', '-e', worker], {
    input: JSON.stringify(data), encoding: 'utf8', maxBuffer: 16 * 1024 * 1024,
  });
  if (result.error || result.status !== 0) throw new Error(result.stderr || result.error?.message || 'Docker command failed');
  return JSON.parse(result.stdout);
}

try {
  const current = execute({ action: 'read' });
  if (apply || restore) {
    const backup = resolve('logs', `cv-content-backup-${Date.now()}.json`);
    writeFileSync(backup, JSON.stringify(current, null, 2), { flag: 'wx' });
    console.log(`Backup saved to ${backup}`);
  }
  const result = execute({ action: restore ? 'restore' : apply ? 'apply' : 'preview', revision: current.revision, data: payload });
  if (result.restored) console.log(`Restored CV at revision ${result.nextRevision}.`);
  else console.log(result.applied ? `Published VI and EN at revision ${result.nextRevision}.` : 'Validation passed. Use --apply to publish both locales.');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
