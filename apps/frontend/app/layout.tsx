import './styles.css';
import { headers } from 'next/headers';
import type { ReactNode } from 'react';

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = (await headers()).get('x-cv-locale') === 'en' ? 'en' : 'vi';
  return <html lang={locale}><body>{children}</body></html>;
}
