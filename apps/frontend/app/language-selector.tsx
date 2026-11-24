'use client';

import type { MouseEvent } from 'react';
import type { Locale } from './public-cv';

const options = [
  { locale: 'vi', name: 'Tiếng Việt', url: '/' },
  { locale: 'en', name: 'English', url: '/?lang=en' },
] as const;

function preserveFragment(event: MouseEvent<HTMLAnchorElement>) {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const fragment = window.location.hash;
  if (fragment) {
    event.preventDefault();
    window.location.assign(event.currentTarget.href + fragment);
  }
}

export function LanguageSelector({ locale, label }: { locale: Locale; label: string }) {
  return (
    <nav aria-label={label} className="locale-switch">
      {options.map((option) => (
        <a
          key={option.locale}
          href={option.url}
          hrefLang={option.locale}
          lang={option.locale}
          aria-label={option.name}
          aria-current={locale === option.locale ? 'page' : undefined}
          onClick={preserveFragment}
        >
          {option.locale.toUpperCase()}
        </a>
      ))}
    </nav>
  );
}
