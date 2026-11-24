import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { strToU8, zipSync } from 'fflate';
import { inspectTemplate } from './template-package';

export const previousSidebarId = 'dfeb0408-44f2-43d0-a01d-02b9379060b1';

export const catalog = [
  { id: 'c352ea6f-9cce-47a0-8671-cd3f5a4bc863', name: 'Sidebar', theme: 'sidebar' },
  { id: 'e93d0020-98bb-4d47-b5ea-7e1fea6bb988', name: 'Elegant', theme: 'elegant' },
  { id: 'efbe2935-65bc-4a8c-8c61-eebb97c25b94', name: 'Kendall', theme: 'kendall' },
  { id: '9272ce13-2b4c-4625-b939-5f4aea652a7e', name: 'Jake Technical', theme: 'jake-technical' },
] as const;

const catalogDirectory = resolve(process.env.CV_TEMPLATE_SAMPLE ?? 'apps/backend/templates/start-bootstrap-resume.zip', '../json-resume');

export async function loadCatalogTemplate(item: typeof catalog[number], directory = catalogDirectory) {
  const [markup, sharedCss, themeCss] = await Promise.all([
    readFile(resolve(directory, `${item.theme}.html`), 'utf8'),
    readFile(resolve(directory, 'common.css'), 'utf8'),
    readFile(resolve(directory, `${item.theme}.css`), 'utf8'),
  ]);
  const archive = Buffer.from(zipSync({
    'template.json': strToU8(JSON.stringify({ schemaVersion: 1, name: item.name })),
    'index.html': strToU8(markup),
    'styles.css': strToU8(`${sharedCss}\n${themeCss}`),
  }));
  const template = await inspectTemplate(archive);
  if (template.status !== 'valid') throw new Error(`Incomplete catalog template: ${item.theme}`);
  return { id: item.id, name: template.name, markup: template.markup, css: template.css, archive: new Uint8Array(template.archive) };
}
