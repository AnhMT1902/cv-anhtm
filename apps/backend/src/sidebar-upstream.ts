import { load } from 'cheerio';
import type { RenderableCv } from './cv-content-model';

export const upstreamSidebar = {
  id: '31c527c3-2977-4123-ba5c-18680a70ee92',
  name: 'Sidebar',
  theme: 'sidebar-upstream',
  format: 'html',
} as const;

const headings = {
  CONTACT: ['contact', 'Liên hệ'],
  EDUCATION: ['education', 'Học vấn'],
  SKILLS: ['skills', 'Kỹ năng'],
  PROFILE: ['intro', 'Giới thiệu'],
  'WORK EXPERIENCE': ['experience', 'Kinh nghiệm'],
  PROJECTS: ['projects', 'Dự án'],
  VOLUNTEER: ['activities', 'Hoạt động'],
  'AWARDS & HONORS': ['awards', 'Giải thưởng'],
  CERTIFICATES: ['certifications', 'Chứng chỉ'],
} as const;

export function toSidebarResume(cv: RenderableCv) {
  const education: { name: string; school: string; start?: string; end?: string; gpa?: string; details?: string }[] =
    Array.isArray(cv.education) ? cv.education : [cv.education];
  const extras = (key: 'certifications' | 'awards' | 'activities') =>
    cv.extras?.find((group) => group.section === key)?.items ?? [];
  const markdownLink = (label: string, url: string) => `[${label}](${url.replaceAll('(', '%28').replaceAll(')', '%29')})`;
  return {
    basics: {
      name: cv.name, label: cv.role, summary: cv.intro, image: cv.portrait,
      email: cv.contact.email, phone: cv.contact.phone, url: cv.contact.website,
      location: cv.location ? { city: cv.location } : undefined,
    },
    work: cv.experience.map((item) => ({
      name: item.organization, position: item.role, startDate: item.start,
      endDate: item.current ? undefined : item.end, highlights: item.details, summary: item.contribution,
    })),
    projects: cv.projects.map((item) => ({
      name: item.name, description: item.description, url: item.url,
      startDate: item.start, endDate: item.end,
      highlights: [item.role, item.contribution, item.technologies,
        item.github ? markdownLink('GitHub', item.github) : undefined].filter(Boolean),
    })),
    education: education.map((item) => ({
      institution: item.school, area: item.name, studyType: cv.locale === 'vi' ? 'Ngành' : 'Studies',
      startDate: item.start, endDate: item.end, score: item.gpa, description: item.details,
    })),
    skills: cv.skills.length ? [{ name: 'Skills', keywords: cv.skills.map((name, index) => {
      const detail = cv.skillDetails?.[index];
      return [name, detail?.group, detail?.description].filter(Boolean).join(' · ');
    }) }] : [],
    certificates: extras('certifications').map((item) => ({
      name: item.title, issuer: item.subtitle, date: item.start, url: item.url,
      summary: item.details,
    })),
    awards: extras('awards').map((item) => ({
      title: item.title, awarder: item.subtitle, date: item.start,
      summary: [item.details, item.url && markdownLink(cv.locale === 'vi' ? 'Minh chứng' : 'Evidence', item.url)].filter(Boolean).join(' '),
    })),
    volunteer: extras('activities').map((item) => ({
      organization: item.title, position: item.subtitle, startDate: item.start, endDate: item.end, summary: item.details,
      highlights: item.url ? [markdownLink(cv.locale === 'vi' ? 'Minh chứng' : 'Evidence', item.url)] : [],
    })),
  };
}

export async function renderUpstreamSidebar(cv: RenderableCv) {
  const { render } = await import('jsonresume-theme-sidebar');
  const resume = toSidebarResume(cv);
  const placeholderContact = !cv.location && !cv.contact.email && !cv.contact.phone && !cv.contact.website
    && Boolean(cv.contact.github || cv.contact.facebook);
  if (placeholderContact) resume.basics.location = { city: ' ' };
  const $ = load(render(resume, { locale: cv.locale, title: cv.seo.title }));
  const document = $('head');
  document.prepend('<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; img-src data:; base-uri \'none\'; form-action \'none\'">');
  document.append(`<style>
    @media screen and (max-width: 639px) {
      body > div[class] { grid-template-columns: minmax(0, 1fr); }
      aside[class], main[class] { min-width: 0; overflow-wrap: anywhere; }
    }
  </style>`);
  $('section > h2').each((_, element) => {
    const title = $(element);
    const key = title.text().trim() as keyof typeof headings;
    if (!Object.hasOwn(headings, key)) return;
    const [id, vi] = headings[key];
    title.parent().attr('id', id);
    const custom = id === 'intro' || id === 'contact' ? undefined : cv.headings?.[id];
    if (custom || cv.locale === 'vi') title.text(custom || vi);
  });
  if (cv.contact.phone) {
    $('#contact span').filter((_, element) => $(element).text() === cv.contact.phone)
      .replaceWith($('<a>').attr('href', `tel:${cv.contact.phone}`).text(cv.contact.phone));
  }
  for (const [label, url] of [['GitHub', cv.contact.github], ['Facebook', cv.contact.facebook]] as const) {
    if (url) {
      const contact = $('#contact');
      if (contact.length) {
        const row = contact.children('div').first().clone().empty();
        row.append($('<span>').attr('aria-hidden', 'true').text('🌐'));
        row.append($('<a>').attr({ href: url, target: '_blank', rel: 'noopener noreferrer' }).text(label));
        contact.append(row);
      }
    }
  }
  if (placeholderContact) $('#contact > div').first().remove();
  $('#education h3').each((index, item) => {
    const description = resume.education[index]?.description;
    if (description) $(item).parent().children('ul').append($('<li>').text(description));
  });
  if (cv.locale === 'vi') {
    $('#education li').each((_, item) => {
      const value = $(item);
      if (value.text().startsWith('Ngành of ')) value.text(value.text().replace('Ngành of ', 'Ngành '));
    });
    $('#experience div, #activities div').contents().each((_, node) => {
      if (node.type === 'text' && node.data === 'PRESENT') node.data = 'Hiện tại';
    });
  }
  return $.html();
}
