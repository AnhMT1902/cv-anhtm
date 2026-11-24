'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { VisualCvEditor } from './visual-cv-editor';
import { CvTemplate } from '../cv-template';
import type { PublicCv } from '../public-cv';

type Template = { id: string; name: string; format?: 'html' };
type Library = { templates: Template[]; catalog: Template[]; active: string };
type ImportResult = { status: 'rejected'; reason: string } |
  { status: 'configuration'; name: string; missing: string[]; ids: string[] } |
  { status: 'valid'; template: Template };
const sectionNames: Record<string, string> = { intro: 'Giới thiệu', projects: 'Dự án', experience: 'Kinh nghiệm', skills: 'Kỹ năng', education: 'Học vấn', contact: 'Liên hệ' };

type LoginErrors = { username?: string; password?: string };
type PreviewResult = { document: string } | { cv: PublicCv };

class AdminApiError extends Error {
  constructor(message: string, readonly fieldErrors?: LoginErrors) {
    super(message);
  }
}

async function api<T>(path: string, method = 'GET', data?: object): Promise<T> {
  const response = await fetch(`/api/admin/${path}`, {
    method,
    ...(data && { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
  });
  const result = await response.json();
  if (!response.ok) {
    throw new AdminApiError(
      typeof result.message === 'string' ? result.message : 'Yêu cầu không thành công.',
      result.fieldErrors,
    );
  }
  return result as T;
}

async function encode(file: File) {
  if (!file.name.toLowerCase().endsWith('.zip') || file.size > 2 * 1024 * 1024) throw new Error('Chọn tệp .zip tối đa 2 MiB.');
  const bytes = new Uint8Array(await file.arrayBuffer());
  const chunks: string[] = [];
  for (let offset = 0; offset < bytes.length; offset += 8192) {
    chunks.push(String.fromCharCode(...bytes.subarray(offset, offset + 8192)));
  }
  return btoa(chunks.join(''));
}

function TemplateThumbnail({ item }: { item: Template }) {
  const [result, setResult] = useState<PreviewResult | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let cancelled = false;
    void api<PreviewResult>(`templates/${item.id}/preview?lang=vi`)
      .then((value) => { if (!cancelled) setResult(value); })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [item.id]);
  return <div className="admin-thumbnail" aria-label={`Hình thu nhỏ ${item.name}`}>
    {result && <div className="admin-thumbnail-canvas" aria-hidden="true">
      {'document' in result
        ? <iframe title={`Hình thu nhỏ ${item.name}`} sandbox="" tabIndex={-1} srcDoc={result.document} />
        : <CvTemplate cv={result.cv} preview />}
    </div>}
    {!result && <span>{failed ? 'Không tải được hình' : 'Đang tải…'}</span>}
  </div>;
}

export function TemplateAdmin() {
  const [library, setLibrary] = useState<Library | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [workspace, setWorkspace] = useState<'templates' | 'content'>('templates');
  const [contentOpened, setContentOpened] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loginErrors, setLoginErrors] = useState<LoginErrors>({});
  const [archive, setArchive] = useState('');
  const [fileName, setFileName] = useState('');
  const [configuration, setConfiguration] = useState<Extract<ImportResult, { status: 'configuration' }> | null>(null);
  const [preview, setPreview] = useState<Template | null>(null);
  const [previewResult, setPreviewResult] = useState<PreviewResult | null>(null);
  const previewDialog = useRef<HTMLDialogElement>(null);
  const previewOrigin = useRef<HTMLElement | null>(null);
  const [locale, setLocale] = useState('vi');
  const [phone, setPhone] = useState(false);
  const refresh = useCallback(async () => setLibrary(await api<Library>('templates')), []);

  useEffect(() => {
    let cancelled = false;
    void api<Library>('templates').then((result) => {
      if (!cancelled) setLibrary(result);
    }).catch(() => undefined).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!preview) return;
    let cancelled = false;
    void api<PreviewResult>(`templates/${preview.id}/preview?lang=${locale}`)
      .then((result) => { if (!cancelled) setPreviewResult(result); })
      .catch((failure) => { if (!cancelled) setError(failure.message); });
    return () => { cancelled = true; };
  }, [preview, locale]);

  useEffect(() => {
    if (preview && previewDialog.current && !previewDialog.current.open) previewDialog.current.showModal();
  }, [preview]);

  async function run(action: () => Promise<void>) {
    setMessage('');
    setError('');
    setBusy(true);
    try { await action(); } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Yêu cầu không thành công.');
    } finally { setBusy(false); }
  }

  function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || loading) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    setLoginErrors({});
    void run(async () => {
      try {
        await api('login', 'POST', { username: data.get('username'), password: data.get('password') });
      } catch (failure) {
        if (!(failure instanceof AdminApiError) || !failure.fieldErrors) throw failure;
        setLoginErrors(failure.fieldErrors);
        const input = form.elements.namedItem(failure.fieldErrors.username ? 'username' : 'password');
        if (input instanceof HTMLInputElement) input.focus();
        return;
      }
      await refresh();
    });
  }

  async function importArchive(encoded: string, setup?: { name: string; mapping: Record<string, string> }) {
    const result = await api<ImportResult>('templates/import', 'POST', { archive: encoded, setup, save: true });
    setConfiguration(null);
    if (result.status === 'rejected') { setError(`Bị từ chối · ${result.reason}`); return; }
    if (result.status === 'configuration') { setConfiguration(result); setMessage('Cần cấu hình'); return; }
    await refresh();
    setPreviewResult(null);
    previewOrigin.current = window.document.activeElement as HTMLElement | null;
    setPreview(result.template);
    setMessage(`Hợp lệ · Đã nhập ${result.template.name}`);
  }

  function importFile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const file = new FormData(event.currentTarget).get('file');
    if (!(file instanceof File) || !file.size) return;
    setConfiguration(null);
    void run(async () => { const encoded = await encode(file); setArchive(encoded); await importArchive(encoded); });
  }

  function configure(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!configuration) return;
    const values = new FormData(event.currentTarget);
    const mapping = Object.fromEntries(configuration.missing.map((key) => [key, String(values.get(key) ?? '')]));
    void run(() => importArchive(archive, { name: String(values.get('name') ?? ''), mapping }));
  }

  function activate(id: string) {
    void run(async () => {
      await api(`templates/${id}/active`, 'PUT');
      await refresh();
      setMessage('Đã áp dụng template cho bản tiếng Việt và tiếng Anh.');
    });
  }

  function templateRows(items: Template[], active: string) {
    return <ul className="admin-library">
      {items.map((item) => (
        <li key={item.id}>
          <TemplateThumbnail item={item} />
          <strong>{item.name}</strong>
          {item.id === active && <span className="admin-active">Đang áp dụng</span>}
          <div className="admin-actions">
            <>
              <button className="admin-plain" disabled={busy} aria-label={`Xem trước ${item.name}`}
                onClick={(event) => { previewOrigin.current = event.currentTarget; setError(''); setPreviewResult(null); setPreview(item); }}>Xem trước</button>
              {item.id !== 'original' && <a href={`/api/admin/templates/${item.id}/export${item.format === 'html' ? `?lang=${locale}` : ''}`} download>
                {item.format === 'html' ? 'Xuất HTML' : 'Xuất ZIP'}
              </a>}
            </>
            <button disabled={busy || item.id === active} onClick={() => activate(item.id)}
              aria-label={`Áp dụng ${item.name}`}>Áp dụng</button>
          </div>
        </li>
      ))}
    </ul>;
  }

  if (!library) {
    return (
      <main className="admin-workspace admin-signin">
        <section className="admin-signin-card" aria-labelledby="signin-title">
          <Link href="/" className="admin-signin-back"><span aria-hidden="true">←</span> Về CV công khai</Link>
          <h1 id="signin-title">Đăng nhập quản trị</h1>
          {loading ? <p role="status">Đang kiểm tra phiên…</p> : (
            <form className="admin-login" onSubmit={login} noValidate aria-busy={busy}>
              {error && <p className="admin-error" role="alert">{error}</p>}
              <div className="admin-login-field">
                <label htmlFor="admin-username">Tên tài khoản</label>
                <input id="admin-username" name="username" autoComplete="username" autoCapitalize="none" spellCheck={false}
                  required aria-invalid={!!loginErrors.username} aria-describedby={loginErrors.username ? 'username-error' : undefined} />
                {loginErrors.username && <p className="admin-field-error" id="username-error" role="alert">{loginErrors.username}</p>}
              </div>
              <div className="admin-login-field">
                <label htmlFor="admin-password">Mật khẩu</label>
                <input id="admin-password" name="password" type="password" autoComplete="current-password"
                  required aria-invalid={!!loginErrors.password} aria-describedby={loginErrors.password ? 'password-error' : undefined} />
                {loginErrors.password && <p className="admin-field-error" id="password-error" role="alert">{loginErrors.password}</p>}
              </div>
              <button disabled={busy}>{busy ? 'Đang đăng nhập…' : 'Đăng nhập'}</button>
            </form>
          )}
        </section>
      </main>
    );
  }

  return (
    <main className="admin-workspace">
      <header className="admin-header">
        <Link href="/">← CV công khai</Link>
        {library && <button className="admin-plain" disabled={busy} onClick={() => void run(async () => {
          await api('logout', 'POST'); setLibrary(null); setPreview(null); setConfiguration(null); setArchive(''); setFileName(''); setPreviewResult(null);
          setWorkspace('templates'); setContentOpened(false);
        })}>Đăng xuất</button>}
      </header>
      <h1>{workspace === 'templates' ? 'Quản trị template' : 'Quản trị CV'}</h1>
      <nav className="cv-editor-tabs admin-workspace-tabs" aria-label="Khu vực quản trị">
        <button className="admin-plain" aria-pressed={workspace === 'templates'} onClick={() => setWorkspace('templates')}>Template</button>
        <button className="admin-plain" aria-pressed={workspace === 'content'} onClick={() => { setContentOpened(true); setWorkspace('content'); }}>Nội dung CV</button>
      </nav>
      {contentOpened && <div hidden={workspace !== 'content'}><VisualCvEditor activeTemplate={library.active} /></div>}
      <div hidden={workspace !== 'templates'}>
        {error && <p className="admin-error" role="alert">{error}</p>}
        {message && <p className="admin-status" role="status">{message}</p>}
        <div className="admin-grid">
          <section className="admin-card admin-catalog" aria-labelledby="catalog-title">
            <h2 id="catalog-title">Mẫu JSON Resume</h2>
            {templateRows(library.catalog ?? [], library.active)}
          </section>
          <section className="admin-card" aria-labelledby="import-title">
            <h2 id="import-title">Nhập template</h2>
            <form onSubmit={importFile}>
              <div className="admin-file-picker" data-selected={!!fileName}>
                <span className="admin-file-icon" aria-hidden="true">{fileName ? '✓' : '↑'}</span>
                <div className="admin-file-detail" aria-live="polite">
                  <strong>{fileName || 'Gói template ZIP'}</strong>
                  <span id="template-file-hint">{fileName ? 'Sẵn sàng kiểm tra' : 'Tệp .zip · Tối đa 2 MB'}</span>
                </div>
                <label className="admin-file-control">
                  <span aria-hidden="true">{fileName ? 'Đổi tệp' : 'Chọn tệp ZIP'}</span>
                  <input name="file" type="file" accept=".zip,application/zip" required disabled={busy}
                    aria-label={fileName ? 'Đổi tệp ZIP' : 'Chọn tệp ZIP'} aria-describedby="template-file-hint"
                    onChange={(event) => {
                      setFileName(event.currentTarget.files?.[0]?.name ?? '');
                      setConfiguration(null);
                      setArchive('');
                      setMessage('');
                      setError('');
                    }} />
                </label>
              </div>
              <button className="admin-file-import" disabled={busy || !fileName}>{busy ? 'Đang xử lý…' : 'Kiểm tra và nhập'}</button>
            </form>
            <div className="admin-resource">
              <a href="https://jsonresume.org/themes">Xem mẫu trên JSON Resume ↗</a>
              <a href="/api/admin/templates/sample" download>Tải ZIP tương thích</a>
            </div>
            {configuration && (
              <form onSubmit={configure}>
                <h3>Gán các mục còn thiếu</h3>
                <label>Tên mẫu<input name="name" defaultValue={configuration.name} maxLength={100} required /></label>
                {configuration.missing.map((key) => (
                  <label key={key}>{sectionNames[key]}
                    <select name={key} required defaultValue="">
                      <option value="">Chọn ID trong HTML</option>
                      {configuration.ids.map((id) => <option key={id} value={id}>{id}</option>)}
                    </select>
                  </label>
                ))}
                <button disabled={busy}>Lưu template</button>
              </form>
            )}
          </section>
          <section className="admin-card" aria-labelledby="library-title">
            <h2 id="library-title">Thư viện</h2>
            {templateRows([{ id: 'original', name: 'Mẫu hiện tại ban đầu' }, ...library.templates], library.active)}
          </section>
          {preview && (
            <dialog ref={previewDialog} className="admin-card admin-preview" aria-labelledby="preview-title"
              onClose={() => { setPreview(null); setPreviewResult(null); previewOrigin.current?.focus(); }}>
              <h2 id="preview-title">Xem trước · {preview.name}</h2>
              <button className="admin-plain" onClick={() => previewDialog.current?.close()}>Đóng</button>
              {error && <p className="admin-error" role="alert">{error}</p>}
              <div className="admin-actions">
                <label>Ngôn ngữ<select value={locale} onChange={(event) => {
                  if (event.target.value !== locale) { setError(''); setPreviewResult(null); setLocale(event.target.value); }
                }}>
                  <option value="vi">Tiếng Việt</option><option value="en">English</option>
                </select></label>
                <label>Kích thước<select value={phone ? 'phone' : 'desktop'} onChange={(event) => setPhone(event.target.value === 'phone')}>
                  <option value="desktop">Desktop</option><option value="phone">Điện thoại</option>
                </select></label>
              </div>
              {previewResult ? ('document' in previewResult
                ? <iframe title="Bản xem trước template" sandbox="" srcDoc={previewResult.document} className={phone ? 'admin-phone' : undefined} />
                : <div className={phone ? 'admin-original-preview admin-phone' : 'admin-original-preview'}><CvTemplate cv={previewResult.cv} preview /></div>)
                : !error && <p role="status">Đang tải bản xem trước…</p>}
            </dialog>
          )}
        </div>
      </div>
    </main>
  );
}
