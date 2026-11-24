'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { CvTemplate } from '../cv-template';
import type { Locale, PublicCv } from '../public-cv';
import { blank, insertItem, labels, visible, type Draft, type Section, type Translation } from './visual-cv-model';

const sections = Object.keys(labels) as Section[];
type State = { draft: Draft; revision: number; published: Record<Locale, string | null> };
type Editor = { kind: 'header' } | { kind: 'intro' } | { kind: 'heading'; section: Section } | { kind: 'item'; section: Section; id: string };
const fields: Record<Section, [keyof Translation, string][]> = {
  experience: [['title', 'Chức danh'], ['subtitle', 'Công ty'], ['details', 'Trách nhiệm, mỗi dòng một ý'], ['contribution', 'Thành tựu']],
  projects: [['title', 'Tên dự án'], ['subtitle', 'Vai trò'], ['details', 'Mô tả'], ['contribution', 'Đóng góp']],
  education: [['title', 'Bằng cấp hoặc chuyên ngành'], ['subtitle', 'Trường'], ['details', 'Ghi chú']],
  skills: [['title', 'Kỹ năng'], ['subtitle', 'Nhóm kỹ năng'], ['details', 'Mô tả']],
  certifications: [['title', 'Tên chứng chỉ'], ['subtitle', 'Đơn vị cấp'], ['details', 'Ghi chú']],
  awards: [['title', 'Tên giải thưởng'], ['subtitle', 'Đơn vị trao giải'], ['details', 'Ghi chú']],
  activities: [['title', 'Tên hoạt động'], ['subtitle', 'Vai trò hoặc tổ chức'], ['details', 'Mô tả']],
};

class ApiError extends Error {
  constructor(message: string, readonly status: number, readonly fields: Record<string, string>) { super(message); }
}
async function request<T>(path: string, method = 'GET', body?: object): Promise<T> {
  const response = await fetch(`/api/admin/content${path}`, {
    method, ...(body && { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  });
  const data = await response.json();
  if (!response.ok) throw new ApiError(data.message || 'Không xử lý được yêu cầu.', response.status, data.fieldErrors ?? {});
  return data as T;
}

type Action = (action: 'edit' | 'intro' | 'delete' | 'clone' | 'above' | 'below' | 'move-up' | 'move-down' | 'heading', section?: Section, id?: string) => void;
type EditorControl = { label: string; run: () => void };

const pencil = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m14 6 4 4M4 20l4.5-1 11-11a2.8 2.8 0 0 0-4-4l-11 11L4 20Z"/></svg>';
const ellipsis = '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="19" cy="12" r="1.7"/></svg>';

function decorate(root: ParentNode, doc: Document, draft: Draft, locale: Locale, action: Action, upstream: boolean) {
  root.querySelectorAll('[data-editor-controls]').forEach((node) => node.remove());
  doc.querySelector('style[data-visual-editor-style]')?.remove();
  const style = doc.createElement('style');
  style.dataset.visualEditorStyle = 'true';
  style.textContent = `
    [data-editor-target] { position: relative; outline: 1px solid transparent; }
    [data-editor-target]:is(:hover, :focus-within):not(:has([data-editor-target]:is(:hover, :focus-within))) { z-index: 2; outline-color: #549276; outline-offset: 4px; }
    [data-editor-target]:focus-within:not(:has([data-editor-target]:focus-within)) { z-index: 3; }
    .visual-actions { position: absolute; z-index: 10; inset: auto 0 calc(100% - 2px) auto; display: flex; align-items: center; gap: 4px; opacity: 0; pointer-events: none; }
    [data-editor-target="intro-section"] > .visual-actions { inset: 0 0 auto auto; }
    @media (hover: hover) {
      [data-editor-target="intro-text"]:is(:hover, :focus-within) > .visual-actions { inset: auto 0 0 auto; }
      [data-editor-target="intro-text"] { padding-inline-end: 40px; }
    }
    [data-editor-target]:is(:hover, :focus-within):not(:has([data-editor-target]:is(:hover, :focus-within))) > .visual-actions,
    .visual-actions:is(:hover, :focus-within, :has(:popover-open)) { opacity: 1; pointer-events: auto; }
    .visual-actions button { box-sizing: border-box; font: 600 13px/1.2 sans-serif; letter-spacing: normal; text-transform: none; color: #18372b; background: #fff; border: 1px solid #a8baaf; border-radius: 7px; margin: 0; cursor: pointer; }
    .visual-actions button:hover { background: #edf4ef; }
    .visual-actions button:focus-visible { outline: 2px solid #327054; outline-offset: 2px; }
    .visual-actions > button { display: grid; place-items: center; width: 34px; min-width: 34px; height: 34px; min-height: 34px; padding: 0; }
    .visual-action-menu { position: fixed; box-sizing: border-box; inset: auto; width: min(210px, calc(100% - 16px)); max-height: calc(100dvh - 16px); overflow: auto; margin: 0; padding: 4px; background: #fff; border: 1px solid #a8baaf; border-radius: 9px; box-shadow: 0 8px 22px #172f2530; }
    .visual-action-menu button { display: block; width: 100%; min-height: 36px; padding: 6px 10px; text-align: start; border-color: transparent; }
    .visual-action-menu button:last-child { color: #9b3028; }
    @media (hover: none) {
      .visual-actions { position: static; width: fit-content; margin-inline-start: auto; opacity: 1; pointer-events: auto; }
      .visual-actions > button { width: 44px; height: 44px; }
      .visual-actions > button[data-touch-label] { width: auto; max-width: 100%; display: inline-flex; gap: 6px; padding-inline: 8px; text-align: start; }
      .visual-actions > button[data-touch-label]::after { content: attr(data-touch-label); }
      .visual-action-menu button { min-height: 44px; }
    }
  `;
  (doc.head || doc.documentElement).append(style);
  function addControls(element: Element, edit: EditorControl, actions: EditorControl[] = [], target = 'true') {
    element.setAttribute('data-editor-target', target);
    const bar = doc.createElement('span');
    bar.className = 'visual-actions';
    bar.dataset.editorControls = 'true';
    function createButton(label: string) {
      const button = doc.createElement('button');
      button.type = 'button';
      button.setAttribute('aria-label', label);
      return button;
    }
    const editButton = createButton(edit.label);
    editButton.title = edit.label;
    if (!actions.length) editButton.dataset.touchLabel = edit.label;
    editButton.innerHTML = pencil;
    editButton.addEventListener('click', edit.run);
    bar.append(editButton);
    if (actions.length) {
      const more = createButton('Thao tác khác');
      more.title = 'Thao tác khác';
      more.innerHTML = ellipsis;
      more.setAttribute('aria-expanded', 'false');
      const menu = doc.createElement('span');
      menu.className = 'visual-action-menu';
      menu.setAttribute('popover', 'auto');
      menu.setAttribute('role', 'group');
      menu.setAttribute('aria-label', 'Thao tác khác');
      for (const entry of actions) {
        const button = createButton(entry.label);
        button.textContent = entry.label;
        button.addEventListener('click', () => { menu.hidePopover(); more.focus(); entry.run(); });
        menu.append(button);
      }
      menu.addEventListener('toggle', () => more.setAttribute('aria-expanded', String(menu.matches(':popover-open'))));
      more.addEventListener('click', () => {
        if (menu.matches(':popover-open')) { menu.hidePopover(); return; }
        menu.showPopover();
        const anchor = more.getBoundingClientRect();
        const viewport = doc.documentElement;
        const width = menu.offsetWidth;
        const spaceBelow = viewport.clientHeight - anchor.bottom - 12;
        const spaceAbove = anchor.top - 12;
        const placeAbove = menu.scrollHeight > spaceBelow && spaceAbove > spaceBelow;
        menu.style.maxHeight = `${Math.max(0, placeAbove ? spaceAbove : spaceBelow)}px`;
        const height = menu.offsetHeight;
        menu.style.left = `${Math.max(8, Math.min(anchor.right - width, viewport.clientWidth - width - 8))}px`;
        menu.style.top = `${placeAbove ? anchor.top - height - 4 : anchor.bottom + 4}px`;
        menu.querySelector('button')?.focus();
      });
      menu.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') { event.preventDefault(); menu.hidePopover(); more.focus(); }
      });
      bar.append(more, menu);
    }
    element.append(bar);
  }
  const header = upstream ? root.querySelector('main > div') : root.querySelector('#intro') ?? root.querySelector('.hero');
  const intro = upstream ? root.querySelector('#intro') : root.querySelector('.hero .intro, #intro .jr-profile, #intro p:not(.cv-role)');
  if (header && header !== intro) addControls(header, { label: 'Sửa thông tin đầu trang', run: () => action('edit') });
  if (intro) addControls(intro, { label: 'Sửa Giới thiệu', run: () => action('intro') }, [], upstream ? 'intro-section' : 'intro-text');
  const contact = root.querySelector('#contact');
  if (contact) addControls(contact, { label: 'Sửa thông tin liên hệ', run: () => action('edit') });
  for (const section of sections) {
    const element = root.querySelector(`#${section}`);
    if (!element) continue;
    const title = element.querySelector('h2');
    if (title) addControls(title, { label: `Sửa tiêu đề ${labels[section]}`, run: () => action('heading', section) });
    const candidates = section === 'skills'
      ? Array.from(element.querySelectorAll('ul > li'))
      : upstream
        ? Array.from(element.children).filter((child) => child.tagName === 'DIV')
        : Array.from(element.querySelectorAll(':scope > article, :scope > .resume-section-content > article, :scope > .projects > article'));
    const items = visible(draft, locale, section);
    candidates.slice(0, items.length).forEach((node, index) => {
      const item = items[index];
      addControls(node, { label: `Sửa ${labels[section]}`, run: () => action('edit', section, item.id) }, [
        { label: `Nhân bản ${labels[section]}`, run: () => action('clone', section, item.id) },
        { label: `Thêm phía trên ${labels[section]}`, run: () => action('above', section, item.id) },
        { label: `Thêm phía dưới ${labels[section]}`, run: () => action('below', section, item.id) },
        { label: `Di chuyển lên ${labels[section]}`, run: () => action('move-up', section, item.id) },
        { label: `Di chuyển xuống ${labels[section]}`, run: () => action('move-down', section, item.id) },
        { label: `Xóa ${labels[section]}`, run: () => action('delete', section, item.id) },
      ]);
    });
  }
  root.querySelectorAll('a').forEach((anchor) => anchor.addEventListener('click', (event) => event.preventDefault()));
}

export function VisualCvEditor({ activeTemplate }: { activeTemplate: string }) {
  const [state, setState] = useState<State | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [locale, setLocale] = useState<Locale>('vi');
  const [editLocale, setEditLocale] = useState<Locale>('vi');
  const [editor, setEditor] = useState<Editor | null>(null);
  const [working, setWorking] = useState<Draft | null>(null);
  const [rendered, setPreview] = useState<{ template: string; cv: PublicCv } | null>(null);
  const preview = rendered?.template === activeTemplate ? rendered.cv : null;
  const [busy, setBusy] = useState(false);
  const [readingImage, setReadingImage] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [previewError, setPreviewError] = useState('');
  const [conflict, setConflict] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);
  const canvas = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const origin = useRef<HTMLElement | null>(null);
  const imageRequest = useRef(0);
  const updateWorking = (change: (value: Draft) => void) => setWorking((previous) => {
    if (!previous) return previous;
    const next = structuredClone(previous);
    change(next);
    return next;
  });
  async function reload() {
    try {
      const next = await request<State>('');
      setState(next); setDraft(next.draft); setPreview(null); setDirty(false); setConflict(false); setError('');
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Không tải được nội dung.'); }
  }
  useEffect(() => {
    let cancelled = false;
    void request<State>('').then((next) => {
      if (!cancelled) { setState(next); setDraft(next.draft); }
    }).catch((failure) => { if (!cancelled) setError(failure.message); });
    return () => { cancelled = true; };
  }, []);
  useEffect(() => {
    if (!draft) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void request<PublicCv>(`/${locale}/preview`, 'POST', { draft })
        .then((value) => { if (!cancelled) { setPreview({ template: activeTemplate, cv: value }); setPreviewError(''); } })
        .catch((failure) => { if (!cancelled) setPreviewError(failure.message); });
    }, 250);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [draft, locale, activeTemplate]);
  useEffect(() => {
    if (editor && dialog.current && !dialog.current.open) dialog.current.showModal();
  }, [editor]);
  const open = useCallback((choice: Editor, source = draft) => {
    if (!source) return;
    origin.current = document.activeElement === frame.current
      ? frame.current?.contentDocument?.activeElement as HTMLElement | null
      : document.activeElement as HTMLElement | null;
    setWorking(structuredClone(source)); setEditLocale(locale); setEditor(choice);
  }, [draft, locale]);
  const act = useCallback<Action>((action, section, id) => {
    if (!draft || busy || conflict) return;
    if (action === 'intro') { open({ kind: 'intro' }); return; }
    if (!section) { open({ kind: 'header' }); return; }
    if (action === 'heading') { open({ kind: 'heading', section }); return; }
    if (!id) return;
    if (action === 'edit') { open({ kind: 'item', section, id }); return; }
    const next = structuredClone(draft);
    const items = next.shared.sections[section];
    const index = items.findIndex((item) => item.id === id);
    if (index < 0) return;
    if (action === 'move-up' || action === 'move-down') {
      const destination = index + (action === 'move-up' ? -1 : 1);
      if (destination < 0 || destination >= items.length) return;
      const [item] = items.splice(index, 1);
      items.splice(destination, 0, item);
      setPreview(null); setDraft(next); setDirty(true); return;
    }
    if (action === 'delete') {
      if (!window.confirm('Xóa mục này khỏi bản nháp?')) return;
      items.splice(index, 1);
      delete next.localized.vi.items[id]; delete next.localized.en.items[id];
      setPreview(null); setDraft(next); setDirty(true); return;
    }
    const newId = `${section}-${crypto.randomUUID()}`;
    const inserted = insertItem(draft, section, id, newId, action);
    if (!inserted) { setError('Không thể thêm mục. Mỗi nhóm hỗ trợ tối đa 50 mục.'); return; }
    open({ kind: 'item', section, id: newId }, inserted);
  }, [draft, open, busy, conflict]);
  const decorateCanvas = useCallback(() => {
    if (!draft || !preview) return;
    const documentPreview = frame.current?.contentDocument;
    if (documentPreview?.body) decorate(documentPreview.body, documentPreview, draft, locale, act, Boolean(preview.template && 'document' in preview.template));
    else if (canvas.current) decorate(canvas.current, document, draft, locale, act, false);
  }, [draft, preview, locale, act]);
  useEffect(() => { decorateCanvas(); }, [decorateCanvas]);

  async function save(publish: boolean) {
    if (!draft || !state) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const payload = { draft, revision: state.revision };
      const result = publish
        ? await request<State>('/publish', 'POST', payload)
        : await request<Pick<State, 'draft' | 'revision'>>('', 'PUT', payload);
      setState((current) => current && { ...current, ...result });
      setPreview(null); setDraft(result.draft); setDirty(false);
      setNotice(publish ? 'Đã xuất bản cả tiếng Việt và tiếng Anh.' : 'Đã lưu bản nháp.');
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Không lưu được nội dung.');
      if (failure instanceof ApiError) {
        if (failure.status === 409) setConflict(true);
        const details = Object.entries(failure.fields).map(([field, message]) => {
          if (field.startsWith('localized.vi.')) return `Tiếng Việt: ${message}`;
          if (field.startsWith('localized.en.')) return `Tiếng Anh: ${message}`;
          return message;
        });
        if (details.length) setError(details.join(' '));
      }
    } finally { setBusy(false); }
  }
  function addEmpty(section: Section) {
    if (!draft) return;
    const next = structuredClone(draft);
    const items = next.shared.sections[section] ??= [];
    if (items.length >= 50) { setError('Mỗi nhóm hỗ trợ tối đa 50 mục.'); return; }
    const id = `${section}-${crypto.randomUUID()}`;
    items.push({ id, start: '', end: '', url: '' });
    for (const language of ['vi', 'en'] as const) next.localized[language].items[id] = { ...blank };
    open({ kind: 'item', section, id }, next);
  }
  if (!state || !draft) return <section className="admin-card">{error || 'Đang tải bản nháp…'}</section>;
  const item = editor?.kind === 'item' ? working?.shared.sections[editor.section]?.find((value) => value.id === editor.id) : undefined;
  const entry = editor?.kind === 'item' ? working?.localized[editLocale].items[editor.id] ?? blank : blank;
  return <section className="visual-editor">
    <div className="visual-editor-top">
      <h2>Nội dung CV</h2>
      <label>Ngôn ngữ xem trước<select value={locale} disabled={busy} onChange={(event) => {
        const next = event.target.value as Locale;
        if (next !== locale) { setPreview(null); setLocale(next); }
      }}>
        <option value="vi">Tiếng Việt</option><option value="en">English</option>
      </select></label>
    </div>
    <div className="cv-editor-toolbar" role="group" aria-label="Thao tác nội dung CV">
      <p role="status">{notice || (busy ? 'Đang xử lý…' : dirty ? 'Có thay đổi chưa lưu.' : 'Bản nháp đã lưu.')}</p>
      {error && <p role="alert" className="cv-editor-error">{error}</p>}
      {conflict && <button className="admin-plain" onClick={() => void reload()}>Tải lại bản nháp đã lưu</button>}
      <div className="cv-editor-actions">
        <button className="admin-plain" disabled={busy || !dirty || conflict} onClick={() => void save(false)}>Lưu vào nháp</button>
        <button disabled={busy || conflict} onClick={() => void save(true)}>Lưu</button>
        <small>Lưu sẽ xuất bản cả tiếng Việt và tiếng Anh.</small>
      </div>
    </div>
    <div className="visual-canvas">
      {preview?.template && 'document' in preview.template
        ? <iframe ref={frame} title="CV để chỉnh sửa" sandbox="allow-same-origin" srcDoc={preview.template.document} onLoad={decorateCanvas} />
        : preview?.template && 'html' in preview.template
          ? <iframe ref={frame} title="CV để chỉnh sửa" sandbox="allow-same-origin"
            srcDoc={`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${preview.template.css}</style></head><body><div class="imported-template">${preview.template.html}</div></body></html>`} onLoad={decorateCanvas} />
          : preview && <div ref={canvas}><CvTemplate cv={preview} preview /></div>}
      {!preview && <p role="status">{previewError || 'Đang tải bản xem trước…'}</p>}
    </div>
    <details className="admin-card visual-extra">
      <summary>Thêm hoặc quản lý mục chưa hiển thị</summary>
      <div className="visual-extra-body">
        <div className="visual-extra-actions">
          <button className="admin-plain" disabled={busy || conflict} onClick={() => open({ kind: 'header' })}>Sửa thông tin đầu trang</button>
          <button className="admin-plain" disabled={busy || conflict} onClick={() => open({ kind: 'intro' })}>Sửa Giới thiệu</button>
        </div>
        {sections.map((section) => <div className="visual-extra-row" key={section}>
          <strong>{labels[section]}</strong>
          <div className="visual-extra-actions">
            <button className="admin-plain" disabled={busy || conflict} onClick={() => addEmpty(section)}>+ Thêm</button>
            {(draft.shared.sections[section] ?? []).filter((value) => !preview || !visible(draft, locale, section).some((shown) => shown.id === value.id)).map((value) =>
              <button key={value.id} className="admin-plain" disabled={busy || conflict} onClick={() => open({ kind: 'item', section, id: value.id })}>
                Sửa {draft.localized[locale].items[value.id]?.title || draft.localized[locale === 'vi' ? 'en' : 'vi'].items[value.id]?.title || 'mục chưa đặt tên'}
              </button>)}
          </div>
        </div>)}
      </div>
    </details>
    {editor && working && <dialog ref={dialog} className="admin-card visual-dialog" aria-labelledby="visual-dialog-title"
      onClose={() => { imageRequest.current += 1; setReadingImage(false); setEditor(null); setWorking(null); origin.current?.focus(); }}>
      <h3 id="visual-dialog-title">{editor.kind === 'header' ? 'Sửa thông tin đầu trang' : editor.kind === 'intro' ? 'Sửa Giới thiệu' : editor.kind === 'heading' ? `Sửa tiêu đề ${labels[editor.section]}` : `Chỉnh sửa ${labels[editor.section]}`}</h3>
      {error && <p role="alert" className="cv-editor-error">{error}</p>}
      <div className="cv-editor-tabs" role="group" aria-label="Ngôn ngữ chỉnh sửa">
        {(['vi', 'en'] as const).map((language) => <button key={language} className="admin-plain" aria-pressed={editLocale === language}
          onClick={() => setEditLocale(language)}>{language === 'vi' ? 'Tiếng Việt' : 'English'}</button>)}
      </div>
      <div className="visual-dialog-fields">
        {editor.kind === 'intro' && <label>Giới thiệu<textarea rows={6} value={working.localized[editLocale].intro}
          onChange={(event) => updateWorking((next) => { next.localized[editLocale].intro = event.target.value; })} /></label>}
        {editor.kind === 'header' && <>
          {([['name', 'Tên hiển thị'], ['email', 'Email'], ['phone', 'Điện thoại'], ['website', 'Website'], ['github', 'GitHub cá nhân'], ['facebook', 'Facebook']] as const).map(([key, label]) =>
            <label key={key}>{label}<input value={working.shared[key] ?? ''} onChange={(event) => updateWorking((next) => { next.shared[key] = event.target.value; })} /></label>)}
          {([['role', 'Chức danh'], ['intro', 'Giới thiệu'], ['location', 'Địa điểm'], ['seoTitle', 'Tiêu đề SEO'], ['seoDescription', 'Mô tả SEO']] as const).map(([key, label]) =>
            <label key={key}>{label}<textarea rows={key === 'intro' ? 4 : 2} value={working.localized[editLocale][key]}
              onChange={(event) => updateWorking((next) => { next.localized[editLocale][key] = event.target.value; })} /></label>)}
          <label>Ảnh đại diện<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            if (!file) return;
            if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 512 * 1024 || !file.size) { setError('Chọn ảnh PNG, JPEG hoặc WebP tối đa 512 KiB.'); return; }
            const requestId = ++imageRequest.current;
            setReadingImage(true);
            const reader = new FileReader();
            reader.onload = () => {
              const portrait = String(reader.result);
              const image = new window.Image();
              image.src = portrait;
              void image.decode().then(() => {
                if (requestId === imageRequest.current) updateWorking((next) => { next.shared.portrait = portrait; });
              }).catch(() => { if (requestId === imageRequest.current) setError('Không mở được tệp ảnh.'); })
                .finally(() => { if (requestId === imageRequest.current) setReadingImage(false); });
            };
            reader.onerror = () => { if (requestId === imageRequest.current) { setReadingImage(false); setError('Không đọc được ảnh.'); } };
            reader.readAsDataURL(file);
          }} /></label>
          {working.shared.portrait && <><Image src={working.shared.portrait} alt="Ảnh đại diện bản nháp" width={112} height={112} unoptimized />
            <button className="admin-plain" onClick={() => updateWorking((next) => { delete next.shared.portrait; })}>Xóa ảnh</button></>}
        </>}
        {editor.kind === 'heading' && <label>Tiêu đề mục<input value={working.localized[editLocale].headings?.[editor.section] ?? ''}
          onChange={(event) => updateWorking((next) => { next.localized[editLocale].headings = { ...next.localized[editLocale].headings, [editor.section]: event.target.value }; })} /></label>}
        {editor.kind === 'item' && item && <>
          {fields[editor.section].map(([key, label]) => <label key={key}>{label}<textarea rows={key === 'details' || key === 'contribution' ? 4 : 2} value={entry[key] ?? ''}
            onChange={(event) => updateWorking((next) => { next.localized[editLocale].items[editor.id] = { ...(next.localized[editLocale].items[editor.id] ?? blank), [key]: event.target.value }; })} /></label>)}
          {editor.section !== 'skills' && (['start', 'end'] as const).map((key) => <label key={key}>{key === 'start' ? 'Bắt đầu (YYYY-MM)' : 'Kết thúc (YYYY-MM)'}
            <input value={item[key]} disabled={key === 'end' && item.current} onChange={(event) => updateWorking((next) => {
              const target = next.shared.sections[editor.section].find((value) => value.id === editor.id);
              if (target) target[key] = event.target.value;
            })} /></label>)}
          {editor.section === 'experience' && <label className="visual-check"><input type="checkbox" checked={item.current ?? false} onChange={(event) => updateWorking((next) => {
            const target = next.shared.sections[editor.section].find((value) => value.id === editor.id);
            if (target) { target.current = event.target.checked; if (target.current) target.end = ''; }
          })} />Đang làm</label>}
          {([...(editor.section === 'projects' || ['certifications', 'awards', 'activities'].includes(editor.section) ? [['url', 'Liên kết']] : []),
            ...(editor.section === 'projects' ? [['github', 'GitHub'], ['technologies', 'Công nghệ']] : []),
            ...(editor.section === 'education' ? [['gpa', 'GPA']] : [])] as ['url' | 'github' | 'technologies' | 'gpa', string][]).map(([key, label]) =>
              <label key={key}>{label}<input value={item[key] ?? ''} onChange={(event) => updateWorking((next) => {
                const target = next.shared.sections[editor.section].find((value) => value.id === editor.id);
                if (target) target[key] = event.target.value;
              })} /></label>)}
          <label className="visual-check"><input type="checkbox" checked={item.hidden ?? false} onChange={(event) => updateWorking((next) => {
            const target = next.shared.sections[editor.section].find((value) => value.id === editor.id);
            if (target) target.hidden = event.target.checked;
          })} />Ẩn mục này</label>
        </>}
      </div>
      <div className="admin-actions">
        <button className="admin-plain" onClick={() => dialog.current?.close()}>Hủy</button>
        <button disabled={readingImage} onClick={() => { setPreview(null); setDraft(working); setDirty(true); setError(''); dialog.current?.close(); }}>Xong</button>
      </div>
    </dialog>}
  </section>;
}
