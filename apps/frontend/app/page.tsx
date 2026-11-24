import type { Metadata } from 'next';
import { cache } from 'react';
import { CvTemplate } from './cv-template';
import { LanguageSelector } from './language-selector';
import { ResumeDocument } from './resume-document';
import { selectLocale, type Locale, type PublicCv } from './public-cv';

type PageProps = {
  searchParams: Promise<{ lang?: string | string[] }>;
};

const getCv = cache(async (locale: Locale): Promise<PublicCv> => {
  const origin = process.env.CV_API_ORIGIN ?? 'http://127.0.0.1:3001';
  const url = new URL('/api/public/cv', origin);
  url.searchParams.set('lang', locale);
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`CV API returned ${response.status}`);
  return response.json();
});

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const cv = await getCv(selectLocale((await searchParams).lang));
  return {
    title: cv.seo.title,
    description: cv.seo.description,
    robots: { index: false, follow: false },
  };
}

export default async function Page({ searchParams }: PageProps) {
  const cv = await getCv(selectLocale((await searchParams).lang));
  if (cv.template && 'document' in cv.template) {
    return <div className="upstream-cv-page">
      <header className="imported-site-header">
        <LanguageSelector locale={cv.locale} label={cv.locale === 'vi' ? 'Ngôn ngữ' : 'Language'} />
      </header>
      <ResumeDocument document={cv.template.document} title={cv.seo.title} followFragment />
    </div>;
  }
  if (cv.template) {
    return <div className="imported-cv-page">
      <header className="imported-site-header">
        <LanguageSelector locale={cv.locale} label={cv.locale === 'vi' ? 'Ngôn ngữ' : 'Language'} />
      </header>
      <style dangerouslySetInnerHTML={{ __html: cv.template.css }} />
      <div className="imported-template" dangerouslySetInnerHTML={{ __html: cv.template.html }} />
    </div>;
  }
  return <CvTemplate cv={cv} />;
}
