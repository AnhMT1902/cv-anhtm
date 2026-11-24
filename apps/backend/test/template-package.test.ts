import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';
import { strToU8, zipSync } from 'fflate';
import { publicCv } from '../src/public-cv';
import { catalog, loadCatalogTemplate } from '../src/template-catalog';
import { renderUpstreamSidebar, toSidebarResume } from '../src/sidebar-upstream';
import { load } from 'cheerio';
import { inspectTemplate } from '../src/template-package';
import { renderTemplate } from '../src/template-render';

const fields = ['intro', 'projects', 'experience', 'skills', 'education', 'contact'];
const archive = (files: Record<string, string>) => Buffer.from(zipSync(Object.fromEntries(Object.entries(files).map(([name, value]) => [name, strToU8(value)]))));
const files = {
  'template.json': JSON.stringify({ schemaVersion: 1, name: 'Test' }),
  'index.html': fields.map((field) => `<section data-cv-section="${field}"></section>`).join(''),
  'styles.css': 'h1 { color: #113322; }',
};

test('official Sidebar uses the bundled renderer with published data and localized headings', async () => {
  const cv = { ...publicCv('vi'), name: 'CV <Fixture>', portrait: 'data:image/png;base64,AAAA' };
  const resume = toSidebarResume(cv);
  assert.equal(resume.basics.image, cv.portrait);
  assert.equal(resume.work[0].name, cv.experience[0].organization);
  const $ = load(await renderUpstreamSidebar(cv));
  assert.equal($('html').attr('lang'), 'vi');
  assert.equal($('h1').text(), cv.name);
  assert.equal($('#experience > h2').text(), 'Kinh nghiệm');
  assert.equal($('#contact a[href^="tel:"]').length, 1);
  assert.equal($('aside img').attr('src'), cv.portrait);
  const english = load(await renderUpstreamSidebar(publicCv('en')));
  assert.equal(english('#experience > h2').text(), 'WORK EXPERIENCE');
  assert.equal(english('aside img').length, 0);
});

test('bundled JSON Resume templates export to compatible ZIPs and render both languages', async () => {
  assert.equal(new Set(catalog.map((item) => item.id)).size, catalog.length);
  for (const item of catalog) {
    const template = await loadCatalogTemplate(item, resolve('templates/json-resume'));
    const checked = await inspectTemplate(Buffer.from(template.archive));
    assert.equal(checked.status, 'valid');
    assert.equal(checked.name, item.name);
    assert.match(template.css, /\.imported-template \.jr/);
    for (const [locale, heading] of [['vi', 'Kinh nghiệm'], ['en', 'Experience']] as const) {
      const html = renderTemplate(template.markup, { ...publicCv(locale), portrait: 'data:image/png;base64,AAAA' });
      assert.ok(html.includes(`<h2>${heading}</h2>`));
      assert.ok(html.includes('mailto:'));
      assert.equal(html.includes('data-cv-portrait'), item.theme !== 'jake-technical');
      if (item.theme === 'sidebar') {
        assert.match(html, /<aside[^>]*>[^]*id="education"[^]*<\/aside>/);
        assert.match(html, /<main[^>]*>[^]*<h1>[^]*class="jr-profile"[^]*id="experience"[^]*<\/main>/);
        assert.match(html, /<div class="jr-profile"><h2>(Giới thiệu|Profile)<\/h2>/);
      }
    }
  }
});

test('accepts an optional portrait slot and rejects ambiguous or misplaced slots', async () => {
  const portrait = '<img data-cv-portrait width="112" height="112">';
  const markup = files['index.html'];
  const inIntro = markup.replace('="intro">', `="intro">${portrait}`);
  const valid = await inspectTemplate(archive({ ...files, 'index.html': inIntro }));
  assert.equal(valid.status, 'valid');
  assert.match(valid.markup, /data-cv-portrait/);
  for (const invalid of [inIntro + portrait, markup + '<div data-cv-portrait></div>',
    markup + '<img data-cv-portrait src="">', markup.replace('="skills">', `="skills">${portrait}`)]) {
    await assert.rejects(inspectTemplate(archive({ ...files, 'index.html': invalid })), /index\.html:/);
  }
});

test('validates the Start Bootstrap download and renders localized template content', async () => {
  const result = await inspectTemplate(await readFile('templates/start-bootstrap-resume.zip'));
  assert.equal(result.status, 'valid');
  assert.match(result.css, /\.imported-template/);
  const vi = renderTemplate(result.markup, publicCv('vi'));
  const en = renderTemplate(result.markup, publicCv('en'));
  assert.ok(vi.indexOf('id="projects"') < vi.indexOf('id="experience"'));
  assert.match(vi, /Kinh nghiệm/);
  assert.match(en, /Experience/);
  assert.match(en, /href="mailto:minh-an@example.com"/);
});

test('asks for mapping, creates a valid package and accepts it on reimport', async () => {
  const draft = archive({ 'index.html': fields.map((field) => `<section id="block-${field}"></section>`).join(''), 'styles.css': files['styles.css'] });
  const result = await inspectTemplate(draft);
  assert.equal(result.status, 'configuration');
  assert.deepEqual(result.missing, fields);
  assert.equal(result.ids.length, 6);
  const configured = await inspectTemplate(draft, { name: 'Mapped', mapping: Object.fromEntries(fields.map((field) => [field, `block-${field}`])) });
  assert.equal(configured.status, 'valid');
  assert.equal((await inspectTemplate(configured.archive)).status, 'valid');
});

test('rejects unsupported file types, missing resources, invalid structure and version', async () => {
  await assert.rejects(inspectTemplate(Buffer.from('not a ZIP')), /ZIP/);
  await assert.rejects(inspectTemplate(archive({ ...files, 'app.js': '' })), /app.js/);
  await assert.rejects(inspectTemplate(archive({ ...files, 'index.html': '<script src="app.js"></script>' })), /script/);
  await assert.rejects(inspectTemplate(archive({ ...files, 'index.html': '<img src="assets/missing.png">' })), /missing.png/);
  await assert.rejects(inspectTemplate(archive({ ...files, 'template.json': '{"schemaVersion":2,"name":"Test"}' })), /schemaVersion/);
});
