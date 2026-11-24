import { BadRequestException } from '@nestjs/common';
import { publicCv, type Locale } from './public-cv';
import { isPortrait } from './cv-image';

export const sections = ['experience', 'projects', 'education', 'skills', 'certifications', 'awards', 'activities'] as const;
export type Section = typeof sections[number];
type SharedItem = { id: string; start: string; end: string; url: string; github?: string; technologies?: string; current?: boolean; hidden?: boolean; gpa?: string };
type Translation = { title: string; subtitle: string; details: string; contribution?: string };
type Localized = {
  role: string; intro: string; location: string; seoTitle: string; seoDescription: string;
  items: Record<string, Translation>;
  headings?: Partial<Record<Section, string>>;
};
export type Draft = {
  shared: { name: string; email: string; phone: string; website: string; github?: string; facebook?: string; portrait?: string; sections: Record<Section, SharedItem[]> };
  localized: Record<Locale, Localized>;
};

export function initialDraft(): Draft {
  const vi = publicCv('vi');
  const shared = {
    name: vi.name, ...vi.contact,
    sections: {
      experience: vi.experience.map((item, i) => ({ id: `experience-${i}`, start: item.start, end: item.end, url: '' })),
      projects: vi.projects.map((_, i) => ({ id: `projects-${i}`, start: '', end: '', url: '' })),
      education: [{ id: 'education-0', start: '', end: '', url: '' }],
      skills: vi.skills.map((_, i) => ({ id: `skills-${i}`, start: '', end: '', url: '' })),
      certifications: [], awards: [], activities: [],
    },
  };
  function localized(locale: Locale): Localized {
    const cv = publicCv(locale);
    const items: Localized['items'] = {};
    cv.experience.forEach((item, i) => { items[`experience-${i}`] = { title: item.role, subtitle: item.organization, details: item.details.join('\n') }; });
    cv.projects.forEach((item, i) => { items[`projects-${i}`] = { title: item.name, subtitle: '', details: item.description }; });
    items['education-0'] = { title: cv.education.name, subtitle: cv.education.school, details: '' };
    cv.skills.forEach((title, i) => { items[`skills-${i}`] = { title, subtitle: '', details: '' }; });
    return { role: cv.role, intro: cv.intro, location: cv.location, seoTitle: cv.seo.title, seoDescription: cv.seo.description, items };
  }
  return { shared, localized: { vi: localized('vi'), en: localized('en') } };
}

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export function validateDraft(input: unknown): Draft {
  const errors: Record<string, string> = {};
  function text(value: unknown, key: string, length = 250) {
    if (typeof value !== 'string' || value.length > length) {
      errors[key] = `Nhập văn bản tối đa ${length} ký tự.`;
      return '';
    }
    return value.trim();
  }
  function url(value: unknown, key: string) {
    const result = text(value, key, 2048);
    if (result) {
      try {
        const parsed = new URL(result);
        if (!/^https?:\/\//i.test(result) || parsed.username || parsed.password) throw new Error();
        return parsed.href;
      } catch {
        errors[key] = 'Nhập URL bắt đầu bằng http:// hoặc https://.';
      }
    }
    return result;
  }
  const source = object(input);
  const shared = object(source.shared);
  const storedSections = object(shared.sections);
  const ids = new Set<string>();
  const structured = {} as Draft['shared']['sections'];
  const month = /^\d{4}-(0[1-9]|1[0-2])$/;
  for (const section of sections) {
    const entries = storedSections[section] ?? (['certifications', 'awards', 'activities'].includes(section) ? [] : undefined);
    if (!Array.isArray(entries) || entries.length > 50) errors[`shared.sections.${section}`] = 'Mỗi nhóm hỗ trợ tối đa 50 mục.';
    structured[section] = (Array.isArray(entries) ? entries.slice(0, 50) : []).map((raw, index) => {
      const item = object(raw);
      const id = typeof item.id === 'string' ? item.id : '';
      const prefix = `shared.sections.${section}.${index}`;
      if (!id.startsWith(`${section}-`) || !/^[a-z]+-[a-z0-9-]{1,48}$/.test(id) || ids.has(id)) {
        errors[`${prefix}.id`] = 'Mã mục không hợp lệ hoặc bị trùng.';
      }
      ids.add(id);
      const start = text(item.start, `${prefix}.start`, 7);
      const current = section === 'experience' && item.current === true;
      const end = current ? '' : text(item.end, `${prefix}.end`, 7);
      if (start && !month.test(start)) errors[`${prefix}.start`] = 'Nhập tháng theo dạng YYYY-MM.';
      if (end && (!month.test(end) || !start || end < start)) errors[`${prefix}.end`] = 'Tháng kết thúc phải hợp lệ và không trước tháng bắt đầu.';
      return {
        id, start, end, url: url(item.url, `${prefix}.url`), current, hidden: item.hidden === true,
        github: url(item.github ?? '', `${prefix}.github`),
        technologies: text(item.technologies ?? '', `${prefix}.technologies`, 400),
        gpa: text(item.gpa ?? '', `${prefix}.gpa`, 32),
      };
    });
  }
  const email = text(shared.email, 'shared.email');
  const phone = text(shared.phone, 'shared.phone', 32);
  if (email && !/^[^\s@?&#]+@[^\s@?&#]+\.[^\s@?&#]+$/.test(email)) errors['shared.email'] = 'Địa chỉ email không hợp lệ.';
  if (phone && !/^\+?[0-9() .-]{3,32}$/.test(phone)) errors['shared.phone'] = 'Số điện thoại không hợp lệ.';
  const localized = object(source.localized);
  function translation(locale: Locale): Localized {
    const prefix = `localized.${locale}`;
    const values = object(localized[locale]);
    const items = object(values.items);
    const headings = object(values.headings);
    return {
      role: text(values.role, `${prefix}.role`), intro: text(values.intro, `${prefix}.intro`, 4000),
      location: text(values.location, `${prefix}.location`), seoTitle: text(values.seoTitle, `${prefix}.seoTitle`),
      seoDescription: text(values.seoDescription, `${prefix}.seoDescription`, 500),
      headings: Object.fromEntries(sections.map((section) => [section, text(headings[section] ?? '', `${prefix}.headings.${section}`, 100)])),
      items: Object.fromEntries([...ids].map((id) => {
        const value = object(items[id]);
        const key = `${prefix}.items.${id}`;
        return [id, {
          title: text(value.title ?? '', `${key}.title`), subtitle: text(value.subtitle ?? '', `${key}.subtitle`),
          details: text(value.details ?? '', `${key}.details`, 4000), contribution: text(value.contribution ?? '', `${key}.contribution`, 4000),
        }];
      })),
    };
  }
  const portrait = isPortrait(shared.portrait) ? shared.portrait : undefined;
  if (shared.portrait !== undefined && !portrait) {
    errors['shared.portrait'] = 'Chọn ảnh PNG, JPEG hoặc WebP hợp lệ, tối đa 512 KiB.';
  }
  const draft = {
    shared: { name: text(shared.name, 'shared.name'), email, phone, website: url(shared.website, 'shared.website'),
      github: url(shared.github ?? '', 'shared.github'), facebook: url(shared.facebook ?? '', 'shared.facebook'),
      ...(portrait ? { portrait } : {}), sections: structured },
    localized: { vi: translation('vi'), en: translation('en') },
  };
  if (Object.keys(errors).length) throw new BadRequestException({ message: 'Kiểm tra các trường được đánh dấu.', fieldErrors: errors });
  return draft;
}

export function publicationErrors(draft: Draft, locale: Locale) {
  const { shared } = draft;
  const localized = draft.localized[locale];
  const required = {
    'shared.name': [shared.name, 'Tên hiển thị'],
    [`localized.${locale}.role`]: [localized.role, 'Chức danh'],
    [`localized.${locale}.intro`]: [localized.intro, 'Giới thiệu'],
    [`localized.${locale}.seoTitle`]: [localized.seoTitle, 'Tiêu đề SEO'],
    [`localized.${locale}.seoDescription`]: [localized.seoDescription, 'Mô tả SEO'],
  };
  return Object.fromEntries(Object.entries(required).filter(([, [value]]) => !value).map(([key, [, label]]) => [key, `Cần nhập ${label}.`]));
}

export function snapshot(draft: Draft, locale: Locale, publishing = false) {
  const { shared } = draft;
  const localized = draft.localized[locale];
  if (publishing) {
    const fieldErrors = publicationErrors(draft, locale);
    if (Object.keys(fieldErrors).length) throw new BadRequestException({ message: 'Chưa đủ nội dung bắt buộc để xuất bản.', fieldErrors });
  }
  function translated(section: Section) {
    return (shared.sections[section] ?? []).flatMap((item) => {
      const content = localized.items[item.id];
      if (item.hidden || !content?.title || (section === 'experience' && (!content.subtitle || !item.start)) ||
        (section === 'projects' && !content.details) || (section === 'education' && !content.subtitle)) return [];
      return [{ ...item, ...content }];
    });
  }
  return {
    locale, sample: false, name: shared.name, role: localized.role, intro: localized.intro, location: localized.location,
    contact: { email: shared.email, phone: shared.phone, website: shared.website, github: shared.github ?? '', facebook: shared.facebook ?? '' },
    ...(shared.portrait ? { portrait: shared.portrait } : {}),
    seo: { title: localized.seoTitle, description: localized.seoDescription },
    headings: localized.headings ?? {},
    experience: translated('experience').map((item) => ({ role: item.title, organization: item.subtitle, details: item.details.split('\n').filter((line) => line.trim()), start: item.start, end: item.end, current: item.current ?? false, contribution: item.contribution ?? '' })),
    projects: translated('projects').map((item) => ({
      name: item.title, description: item.details, url: item.url, role: item.subtitle, contribution: item.contribution ?? '',
      github: item.github ?? '', technologies: item.technologies ?? '', start: item.start, end: item.end,
    })),
    education: translated('education').map((item) => ({ name: item.title, school: item.subtitle, start: item.start, end: item.end, gpa: item.gpa ?? '', details: item.details })),
    skills: translated('skills').map((item) => item.title),
    skillDetails: translated('skills').map((item) => ({ name: item.title, group: item.subtitle, description: item.details })),
    extras: (['certifications', 'awards', 'activities'] as const).map((section) => ({
      section, items: translated(section).map((item) => ({ title: item.title, subtitle: item.subtitle, details: item.details, start: item.start, end: item.end, url: item.url })),
    })),
  };
}

export type CvSnapshot = ReturnType<typeof snapshot>;
type Sample = ReturnType<typeof publicCv>;
export type RenderableCv = Omit<Sample, 'experience' | 'projects' | 'education' | 'contact'> &
  Partial<Pick<CvSnapshot, 'headings' | 'extras' | 'skillDetails' | 'sample' | 'portrait'>> & {
    contact: Sample['contact'] & { github?: string; facebook?: string };
    experience: (Sample['experience'][number] & Partial<CvSnapshot['experience'][number]>)[];
    projects: (Sample['projects'][number] & Partial<CvSnapshot['projects'][number]>)[];
    education: Sample['education'] | CvSnapshot['education'];
  };
