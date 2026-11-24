export const labels = { experience: 'Kinh nghiệm', projects: 'Dự án', education: 'Học vấn', skills: 'Kỹ năng', certifications: 'Chứng chỉ', awards: 'Giải thưởng', activities: 'Hoạt động' } as const;
export type Section = keyof typeof labels;
export type Locale = 'vi' | 'en';
export type Item = { id: string; start: string; end: string; url: string; github?: string; technologies?: string; current?: boolean; hidden?: boolean; gpa?: string };
export type Translation = { title: string; subtitle: string; details: string; contribution?: string };
export type Localized = { role: string; intro: string; location: string; seoTitle: string; seoDescription: string; headings?: Partial<Record<Section, string>>; items: Record<string, Translation> };
export type Draft = { shared: { name: string; email: string; phone: string; website: string; github?: string; facebook?: string; portrait?: string; sections: Record<Section, Item[]> }; localized: Record<Locale, Localized> };
export const blank: Translation = { title: '', subtitle: '', details: '', contribution: '' };

export function visible(draft: Draft, locale: Locale, section: Section) {
  return (draft.shared.sections[section] ?? []).filter((item) => {
    const translation = draft.localized[locale].items[item.id];
    return !item.hidden && Boolean(translation?.title)
      && (section !== 'experience' || Boolean(translation?.subtitle && item.start))
      && (section !== 'projects' || Boolean(translation?.details))
      && (section !== 'education' || Boolean(translation?.subtitle));
  });
}

export function insertItem(draft: Draft, section: Section, id: string, newId: string, action: 'clone' | 'above' | 'below') {
  const next = structuredClone(draft);
  const items = next.shared.sections[section];
  const index = items.findIndex((item) => item.id === id);
  if (index < 0 || items.length >= 50 || items.some((item) => item.id === newId)) return null;
  const item = action === 'clone' ? { ...items[index], id: newId } : { id: newId, start: '', end: '', url: '' };
  items.splice(index + (action === 'above' ? 0 : 1), 0, item);
  for (const locale of ['vi', 'en'] as const) {
    next.localized[locale].items[newId] = action === 'clone'
      ? { ...(next.localized[locale].items[id] ?? blank) } : { ...blank };
  }
  return next;
}
