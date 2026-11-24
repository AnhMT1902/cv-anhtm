import { load } from 'cheerio';
import type { RenderableCv } from './cv-content-model';

const labels = {
  vi: { projects: 'Dự án', experience: 'Kinh nghiệm', skills: 'Kỹ năng', education: 'Học vấn', contact: 'Liên hệ', intro: 'Giới thiệu', website: 'Trang web', certifications: 'Chứng chỉ', awards: 'Giải thưởng', activities: 'Hoạt động', current: 'Hiện tại', evidence: 'Minh chứng' },
  en: { projects: 'Projects', experience: 'Experience', skills: 'Skills', education: 'Education', contact: 'Contact', intro: 'About', website: 'Website', certifications: 'Certifications', awards: 'Awards', activities: 'Activities', current: 'Present', evidence: 'Evidence' },
};

export function renderTemplate(markup: string, cv: RenderableCv) {
  const $ = load(markup);
  const referenceSidebar = $('.jr-sidebar-reference').length > 0;
  const t = labels[cv.locale];
  const text = (tag: string, value: string) => $(`<${tag}>`).text(value);
  const link = (label: string, href: string) => $('<a>').text(label).attr('href', href);
  const dateFormat = new Intl.DateTimeFormat(cv.locale, { year: 'numeric', month: 'short', timeZone: 'UTC' });
  const date = (value: string) => text('time', dateFormat.format(new Date(`${value}-01T00:00:00Z`))).attr('datetime', value);
  const heading = (section: keyof typeof t) => cv.headings?.[section as keyof NonNullable<RenderableCv['headings']>] || t[section];
  const education: { name: string; school: string; start?: string; end?: string; gpa?: string; details?: string }[] = Array.isArray(cv.education) ? cv.education : [cv.education];
  const extras = cv.extras?.filter((group) => group.items.length) ?? [];
  const portrait = $('img[data-cv-portrait]');
  if (cv.portrait) portrait.attr({ src: cv.portrait, alt: cv.name });
  else portrait.remove();
  function range(start: string, end?: string, current?: boolean) {
    const value = $('<p>').addClass('cv-dates').append(date(start));
    if (current) value.append(` – ${t.current}`);
    else if (end) value.append(' – ', date(end));
    return value;
  }
  const visible = {
    intro: true, projects: cv.projects.length > 0, experience: cv.experience.length > 0,
    skills: cv.skills.length > 0, education: education.length > 0,
    contact: Boolean(cv.location || cv.contact.email || cv.contact.phone || cv.contact.website || cv.contact.github || cv.contact.facebook),
  };

  // Generated fragment IDs are reserved even when the supplied markup uses the same names elsewhere.
  $('[id]').each((_, node) => {
    const element = $(node);
    if (!element.is('[data-cv-section]') && Object.hasOwn(t, element.attr('id') ?? '')) element.removeAttr('id');
  });
  $('[data-cv-section]').each((_, node) => {
    const element = $(node);
    const slot = element.attr('data-cv-section') as keyof typeof visible;
    const oldId = element.attr('id');
    if (oldId && oldId !== slot) {
      $('a[href]').each((_, anchor) => {
        if ($(anchor).attr('href') === `#${oldId}`) $(anchor).attr('href', `#${slot}`);
      });
    }
    if (!visible[slot]) {
      element.remove();
      $('a[href]').filter((_, anchor) => $(anchor).attr('href') === `#${slot}`).remove();
      return;
    }
    element.attr('id', slot);
    const inner = element.children('.resume-section-content').first();
    const content = inner.length ? inner : element;
    const nestedPortrait = content.find('img[data-cv-portrait]').remove();
    content.empty().append(nestedPortrait);
    content.append(text(slot === 'intro' ? 'h1' : 'h2', slot === 'intro' ? cv.name : heading(slot)));
    switch (slot) {
      case 'intro':
        content.append(text('p', cv.role).addClass('cv-role'));
        if (referenceSidebar) {
          const name = content.children('h1');
          const lastSpace = cv.name.lastIndexOf(' ');
          if (lastSpace > 0) name.empty().append(text('span', cv.name.slice(0, lastSpace + 1)), text('strong', cv.name.slice(lastSpace + 1)));
          if (cv.intro) {
            const profile = cv.locale === 'vi' ? 'Giới thiệu' : 'Profile';
            content.append($('<div>').addClass('jr-profile').append(text('h2', profile), text('p', cv.intro)));
          }
        } else {
          content.append(text('p', cv.intro));
        }
        break;
      case 'projects':
        for (const project of cv.projects) {
          const article = $('<article>').append(text('h3', project.name), text('p', project.description));
          if (project.role) article.append(text('p', project.role));
          if (project.start) article.append(range(project.start, project.end));
          if (project.contribution) article.append(text('p', project.contribution));
          if (project.technologies) article.append(text('p', project.technologies));
          if (project.github) article.append($('<p>').append(link('GitHub', project.github)));
          if (project.url) article.append($('<p>').append(link('Demo', project.url)));
          content.append(article);
        }
        break;
      case 'experience':
        for (const job of cv.experience) {
          const details = $('<ul>');
          for (const detail of job.details) details.append(text('li', detail));
          const article = $('<article>').append(
            text('h3', referenceSidebar ? job.organization : job.role),
            text('p', referenceSidebar ? job.role : job.organization),
            range(job.start, job.end, job.current), details,
          );
          if (job.contribution) article.append(text('p', job.contribution));
          content.append(article);
        }
        break;
      case 'skills': {
        const list = $('<ul>').addClass('cv-skills');
        cv.skills.forEach((skill, index) => {
          const item = text('li', skill);
          const details = cv.skillDetails?.[index];
          if (details?.group) item.append(text('span', ` · ${details.group}`));
          if (details?.description) item.append(text('p', details.description));
          list.append(item);
        });
        content.append(list);
        break;
      }
      case 'education':
        for (const entry of education) {
          const article = $('<article>').append(
            text('h3', referenceSidebar ? entry.school : entry.name),
            text('p', referenceSidebar ? entry.name : entry.school),
          );
          if (entry.start) {
            const dates = range(entry.start, entry.end);
            if (referenceSidebar) article.prepend(dates);
            else article.append(dates);
          }
          if (entry.gpa) article.append(text('p', `GPA ${entry.gpa}`));
          if (entry.details) article.append(text('p', entry.details));
          content.append(article);
        }
        break;
      case 'contact': {
        const contact = $('<address>');
        const location = cv.location ? text('p', cv.location) : null;
        const email = cv.contact.email ? link(cv.contact.email, `mailto:${cv.contact.email}`) : null;
        const phone = cv.contact.phone ? link(cv.contact.phone, `tel:${cv.contact.phone}`) : null;
        const website = cv.contact.website ? link(t.website, cv.contact.website) : null;
        const github = cv.contact.github ? link('GitHub', cv.contact.github) : null;
        const facebook = cv.contact.facebook ? link('Facebook', cv.contact.facebook) : null;
        if (referenceSidebar) {
          for (const [item, icon] of [[phone, '📞'], [email, '✉️'], [location, '📍'], [website, '🌐'], [github, '🌐'], [facebook, '🌐']] as const) {
            if (item) contact.append(item.prepend(text('span', icon).attr('aria-hidden', 'true')));
          }
        } else {
          for (const item of [location, email, phone, website, github, facebook]) {
            if (item) contact.append(item);
          }
        }
        content.append(contact);
        break;
      }
    }
  });
  $('nav a[href]').each((_, node) => {
    const element = $(node);
    const field = element.attr('href')?.slice(1) as keyof typeof t;
    if (Object.hasOwn(visible, field)) element.text(heading(field));
  });
  // Existing ZIPs keep their slots; optional sections follow them in the same page.
  const main = $('main').first();
  const destination = main.length ? main : $('body');
  const navigation = $('nav').first();
  for (const group of extras) {
    const section = $('<section>').attr('id', group.section).addClass('resume-section cv-extra-section');
    const content = $('<div>').addClass('resume-section-content').append(text('h2', heading(group.section)));
    for (const item of group.items) {
      const article = $('<article>').append(text('h3', item.title));
      if (item.subtitle) article.append(text('p', item.subtitle));
      if (item.start) article.append(range(item.start, item.end));
      if (item.details) article.append(text('p', item.details));
      if (item.url) article.append(link(t.evidence, item.url));
      content.append(article);
    }
    if (referenceSidebar && navigation.length) navigation.before(section.append(content));
    else destination.append(section.append(content));
    navigation.append(link(heading(group.section), `#${group.section}`));
  }
  return $('body').html() ?? '';
}

export function templatePreview(name: string, css: string, markup: string, cv: RenderableCv) {
  const $ = load('<!doctype html><html><head></head><body><div class="imported-template"></div></body></html>');
  $('html').attr('lang', cv.locale);
  $('head').append('<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; img-src data:; style-src \'unsafe-inline\'">');
  $('head').append($('<title>').text(name));
  $('head').append('<style>body{margin:0} .imported-template{contain:paint}</style>');
  $('head').append($('<style>').html(css));
  $('.imported-template').html(renderTemplate(markup, cv));
  return $.html();
}
