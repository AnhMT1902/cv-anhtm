import Image from 'next/image';
import { LanguageSelector } from './language-selector';
import { labels, type Locale, type PublicCv } from './public-cv';

function Month({ value, locale }: { value: string; locale: Locale }) {
  const date = new Date(`${value}-01T00:00:00Z`);
  const label = new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(date);
  return <time dateTime={value}>{label}</time>;
}

export function CvTemplate({ cv, preview = false }: { cv: PublicCv; preview?: boolean }) {
  const t = labels[cv.locale];
  const showExperience = cv.experience.length > 0;
  const showProjects = cv.projects.length > 0;
  const showSkills = cv.skills.length > 0;
  const education = Array.isArray(cv.education) ? cv.education : [cv.education];
  const showContact = Boolean(cv.location || Object.values(cv.contact).some(Boolean));
  const heading = (key: keyof NonNullable<PublicCv['headings']>) => cv.headings?.[key] || t[key];
  const extras = cv.extras?.filter((group) => group.items.length) ?? [];

  return (
    <div className="shell">
      <a className="skip-link" href="#main">{t.skip}</a>
      {!preview && <header className="topbar">
        <a className="wordmark" href={cv.locale === 'vi' ? '/' : '/?lang=en'}>
          <span className="accent-mark" aria-hidden="true" />{cv.sample === false ? cv.name : t.sample}
        </a>
        <LanguageSelector locale={cv.locale} label={t.language} />
      </header>}

      <div id="main" role={preview ? undefined : 'main'}>
        <section className="hero" aria-labelledby="cv-name">
          <div>
            {cv.portrait && <Image className="cv-portrait" src={cv.portrait} alt={cv.name} width={112} height={112} unoptimized />}
            <p className="hero-role">{cv.role}</p>
            <h1 id="cv-name">{cv.name}</h1>
            <p className="intro">{cv.intro}</p>
          </div>
          {showContact && <div className="hero-contact" id="contact">
            <h2>{t.contact}</h2>
            <address>
              {cv.location && <span>{cv.location}</span>}
              {cv.contact.email && <a href={`mailto:${cv.contact.email}`}>{cv.contact.email}</a>}
              {cv.contact.phone && <a href={`tel:${cv.contact.phone}`}>{cv.contact.phone}</a>}
              {cv.contact.website && <a href={cv.contact.website}>{t.website} <span aria-hidden="true">↗</span></a>}
              {cv.contact.github && <a href={cv.contact.github}>GitHub</a>}
              {cv.contact.facebook && <a href={cv.contact.facebook}>Facebook</a>}
            </address>
          </div>}
        </section>

        <nav className="section-nav" aria-label={t.navigation}>
          {showExperience && <a href="#experience">{heading('experience')}</a>}
          {showProjects && <a href="#projects">{heading('projects')}</a>}
          {showSkills && <a href="#skills">{heading('skills')}</a>}
          {education.length > 0 && <a href="#education">{heading('education')}</a>}
          {extras.map((group) => <a key={group.section} href={`#${group.section}`}>{heading(group.section)}</a>)}
          {showContact && <a href="#contact">{t.contact}</a>}
        </nav>

        <div className="content-grid">
          <div className="primary">
            {showExperience && (
              <section id="experience" aria-labelledby="experience-title" className="cv-section">
                <h2 id="experience-title">{heading('experience')}</h2>
                {cv.experience.map((job, index) => (
                  <article className="position" key={index}>
                    <div className="position-heading">
                      <div>
                        <h3>{job.role}</h3>
                        <p>{job.organization}</p>
                      </div>
                      <p className="dates"><Month value={job.start} locale={cv.locale} />{job.current ? ` – ${t.current}` : job.end && <> – <Month value={job.end} locale={cv.locale} /></>}</p>
                    </div>
                    <ul className="details">
                      {job.details.map((detail, i) => <li key={i}>{detail}</li>)}
                    </ul>
                    {job.contribution && <p>{job.contribution}</p>}
                  </article>
                ))}
              </section>
            )}
            {showProjects && (
              <section id="projects" aria-labelledby="projects-title" className="cv-section">
                <h2 id="projects-title">{heading('projects')}</h2>
                <div className="projects">
                  {cv.projects.map((project, index) => (
                    <article key={index}>
                      <h3>{project.name}</h3>
                      {project.role && <p><strong>{project.role}</strong></p>}
                      {project.start && <p className="dates"><Month value={project.start} locale={cv.locale} />{project.end && <> – <Month value={project.end} locale={cv.locale} /></>}</p>}
                      <p>{project.description}</p>
                      {project.contribution && <p>{project.contribution}</p>}
                      {project.technologies && <p>{project.technologies}</p>}
                      {project.github && <p><a href={project.github}>GitHub</a></p>}
                      {project.url && <p><a href={project.url}>{t.demo} <span aria-hidden="true">↗</span></a></p>}
                    </article>
                  ))}
                </div>
              </section>
            )}
          </div>

          <div className="secondary">
            {showSkills && (
              <section id="skills" aria-labelledby="skills-title" className="cv-section">
                <h2 id="skills-title">{heading('skills')}</h2>
                <ul className="skills">
                  {cv.skills.map((skill, index) => {
                    const details = cv.skillDetails?.[index];
                    return <li key={index}>{skill}
                      {details?.group && <span> · {details.group}</span>}
                      {details?.description && <p>{details.description}</p>}
                    </li>;
                  })}
                </ul>
              </section>
            )}
            {education.length > 0 && <section id="education" aria-labelledby="education-title" className="cv-section">
              <h2 id="education-title">{heading('education')}</h2>
              {education.map((entry, index) => <article key={index}>
                <h3>{entry.name}</h3>
                <p>{entry.school}</p>
                {entry.gpa && <p>GPA {entry.gpa}</p>}
                {entry.details && <p>{entry.details}</p>}
                {entry.start && <p className="dates"><Month value={entry.start} locale={cv.locale} />{entry.end && <> – <Month value={entry.end} locale={cv.locale} /></>}</p>}
              </article>)}
            </section>}
          </div>
        </div>
        {extras.map((group) => <section className="cv-section" id={group.section} key={group.section}>
          <h2>{heading(group.section)}</h2>
          {group.items.map((item, index) => <article key={index}>
            <h3>{item.title}</h3>
            {item.subtitle && <p>{item.subtitle}</p>}
            {item.start && <p className="dates"><Month value={item.start} locale={cv.locale} />{item.end && <> – <Month value={item.end} locale={cv.locale} /></>}</p>}
            {item.details && <p>{item.details}</p>}
            {item.url && <a href={item.url}>{t.evidence}</a>}
          </article>)}
        </section>)}
      </div>

      {cv.sample !== false && <footer>{t.footer}</footer>}
    </div>
  );
}
