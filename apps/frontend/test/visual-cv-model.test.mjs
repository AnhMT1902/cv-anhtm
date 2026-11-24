import assert from 'node:assert/strict';
import test from 'node:test';
import { insertItem, visible } from '../app/admin/visual-cv-model.ts';

function draft() {
  return {
    shared: { sections: { projects: [
      { id: 'projects-a', start: '', end: '', url: '' },
      { id: 'projects-hidden', start: '', end: '', url: '', hidden: true },
      { id: 'projects-b', start: '', end: '', url: '' },
    ] } },
    localized: {
      vi: { items: { 'projects-a': { title: 'A', subtitle: '', details: 'A vi' }, 'projects-b': { title: 'B', subtitle: '', details: 'B vi' } } },
      en: { items: { 'projects-a': { title: 'A en', subtitle: '', details: 'A details' }, 'projects-b': { title: 'B en', subtitle: '', details: '' } } },
    },
  };
}

test('visible items follow locale completeness and skip hidden entries', () => {
  const value = draft();
  assert.deepEqual(visible(value, 'vi', 'projects').map((item) => item.id), ['projects-a', 'projects-b']);
  assert.deepEqual(visible(value, 'en', 'projects').map((item) => item.id), ['projects-a']);
});

test('cloning and inserting preserve both languages and do not mutate the original', () => {
  const value = draft();
  const clone = insertItem(value, 'projects', 'projects-a', 'projects-copy', 'clone');
  assert.deepEqual(clone.shared.sections.projects.map((item) => item.id), ['projects-a', 'projects-copy', 'projects-hidden', 'projects-b']);
  clone.localized.en.items['projects-copy'].title = 'Changed';
  assert.equal(value.localized.en.items['projects-a'].title, 'A en');
  assert.equal(clone.localized.vi.items['projects-copy'].details, 'A vi');
  const above = insertItem(value, 'projects', 'projects-b', 'projects-new', 'above');
  assert.equal(above.shared.sections.projects[2].id, 'projects-new');
  assert.equal(above.localized.vi.items['projects-new'].title, '');
  assert.equal(insertItem(value, 'projects', 'missing', 'projects-new', 'below'), null);
  assert.equal(insertItem(value, 'projects', 'projects-a', 'projects-a', 'below'), null);
});
