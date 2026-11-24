'use client';

import { useCallback, useEffect, useRef } from 'react';

export function ResumeDocument({ document, title, followFragment = false }: {
  document: string;
  title: string;
  followFragment?: boolean;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const follow = useCallback(() => {
    const id = window.location.hash.slice(1);
    if (followFragment && /^[a-z-]+$/.test(id)) {
      frame.current?.contentDocument?.getElementById(id)?.scrollIntoView();
    }
  }, [followFragment]);
  useEffect(() => {
    if (!followFragment) return;
    window.addEventListener('hashchange', follow);
    return () => window.removeEventListener('hashchange', follow);
  }, [follow, followFragment]);

  return <iframe ref={frame} className="resume-document" title={title} srcDoc={document}
    sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
    onLoad={follow} />;
}
