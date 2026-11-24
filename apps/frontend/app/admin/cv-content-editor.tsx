'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { CvTemplate } from '../cv-template';
import { ResumeDocument } from '../resume-document';
import type { Locale, PublicCv } from '../public-cv';

const sectionNames = { experience: 'Kinh nghiệm', projects: 'Dự án', education: 'Học vấn', skills: 'Kỹ năng', certifications: 'Chứng chỉ', awards: 'Giải thưởng', activities: 'Hoạt động' };
type Section = keyof typeof sectionNames;
const sections = Object.keys(sectionNames) as Section[];
type Item = { id: string; start: string; end: string; url: string; github?: string; technologies?: string; current?: boolean; hidden?: boolean; gpa?: string };
type Translation = { title: string; subtitle: string; details: string; contribution?: string };
type Localized = { role: string; intro: string; location: string; seoTitle: string; seoDescription: string; items: Record<string, Translation>; headings?: Partial<Record<Section, string>> };
type Draft = { shared: { name: string; email: string; phone: string; website: string; github?: string; facebook?: string; portrait?: string; sections: Record<Section, Item[]> }; localized: Record<Locale, Localized> };
const portraitTypes = ['image/png', 'image/jpeg', 'image/webp'];
const portraitHint = 'PNG, JPEG hoặc WebP, tối đa 512 KiB.';
type State = { draft: Draft; revision: number; published: Record<Locale, string | null> };
type FieldErrors = Record<string, string>;
const empty: Translation = { title: '', subtitle: '', details: '' };
const languages = { vi: 'Tiếng Việt', en: 'English' };
const supplementary: Section[] = ['certifications', 'awards', 'activities'];
const itemFields: Record<Section, [keyof Translation, string][]> = {
  projects: [['title', 'Tên dự án'], ['details', 'Mô tả dự án'], ['subtitle', 'Vai trò trong dự án'], ['contribution', 'Đóng góp hoặc kết quả']],
  experience: [['title', 'Chức danh công việc'], ['subtitle', 'Công ty'], ['details', 'Trách nhiệm (mỗi dòng một ý)'], ['contribution', 'Thành tựu']],
  education: [['title', 'Bằng cấp hoặc chuyên ngành'], ['subtitle', 'Trường hoặc đơn vị'], ['details', 'Ghi chú']],
  skills: [['title', 'Kỹ năng'], ['subtitle', 'Nhóm kỹ năng'], ['details', 'Mô tả ngắn']],
  certifications: [['title', 'Tên chứng chỉ'], ['subtitle', 'Đơn vị cấp'], ['details', 'Ghi chú']],
  awards: [['title', 'Tên giải thưởng'], ['subtitle', 'Đơn vị trao giải'], ['details', 'Ghi chú']],
  activities: [['title', 'Tên hoạt động'], ['subtitle', 'Vai trò hoặc tổ chức'], ['details', 'Mô tả hoạt động']],
};

class RequestError extends Error {
  constructor(message: string, readonly fields: FieldErrors = {}, readonly status = 0) { super(message); }
}

async function request<T>(path = '', method = 'GET', body?: object): Promise<T> {
  const response = await fetch(`/api/admin/content${path}`, {
    method,
    ...(body && { body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } }),
  });
  const data = await response.json();
  if (!response.ok) throw new RequestError(data.message || 'Không xử lý được yêu cầu.', data.fieldErrors, response.status);
  return data;
}

function Field({ label, value, change, path, errors, multiline = false, inputMode }: {
  label: string; value: string; change: (value: string) => void; path: string;
  errors: FieldErrors; multiline?: boolean; inputMode?: 'email' | 'tel' | 'url' | 'numeric';
}) {
  const props = {
    id: path, value, onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => change(event.currentTarget.value),
    'aria-invalid': Boolean(errors[path]), 'aria-describedby': errors[path] ? `${path}-error` : undefined,
  };
  return <div className="cv-editor-field">
    <label htmlFor={path}>{label}</label>
    {multiline ? <textarea rows={4} {...props} /> : <input inputMode={inputMode} {...props} />}
    {errors[path] && <p className="cv-editor-error" id={`${path}-error`}>{errors[path]}</p>}
  </div>;
}

export function CvContentEditor() {
  const [state, setState] = useState<State | null>(null);
  const [panel, setPanel] = useState<'shared' | Locale>('shared');
  const [sharedLocale, setSharedLocale] = useState<Locale>('vi');
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [notice, setNotice] = useState('');
  const [failure, setFailure] = useState('');
  const [conflict, setConflict] = useState(false);
  const [preview, setPreview] = useState<PublicCv | null>(null);
  const previewDialog = useRef<HTMLDialogElement>(null);
  const previewButton = useRef<HTMLButtonElement>(null);
  const [openItems, setOpenItems] = useState<Partial<Record<Section, string>>>({});
  const [sectionLocales, setSectionLocales] = useState<Partial<Record<Section, Locale>>>({});

  function openItem(section: Section, id: string) {
    setOpenItems((previous) => ({ ...previous, [section]: id }));
  }

  useEffect(() => {
    let cancelled = false;
    void request<State>().then((value) => { if (!cancelled) setState(value); })
      .catch((error: Error) => { if (!cancelled) setFailure(error.message); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const dialog = previewDialog.current;
    if (preview && dialog && !dialog.open) dialog.showModal();
  }, [preview]);

  function edit(change: (draft: Draft) => void) {
    setState((previous) => {
      if (!previous) return previous;
      const draft = structuredClone(previous.draft);
      change(draft);
      return { ...previous, draft };
    });
    setDirty(true);
    setPreview(null);
    setNotice('');
    setErrors({});
    setFailure('');
  }

  async function selectPortrait(file: File) {
    if (!portraitTypes.includes(file.type) || !file.size || file.size > 512 * 1024) {
      throw new Error(`Chọn tệp ảnh hợp lệ. ${portraitHint}`);
    }
    const portrait = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('Không đọc được tệp ảnh.'));
      reader.readAsDataURL(file);
    });
    const image = new window.Image();
    image.src = portrait;
    await image.decode().catch(() => { throw new Error('Không mở được tệp ảnh.'); });
    edit((draft) => { draft.shared.portrait = portrait; });
  }

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setFailure('');
    setErrors({});
    setNotice('');
    try { await action(); } catch (error) {
      setFailure(error instanceof Error ? error.message : 'Không xử lý được yêu cầu.');
      if (error instanceof RequestError) {
        setErrors(error.fields);
        setConflict(error.status === 409);
        for (const section of sections) {
          const rowError = Object.keys(error.fields).find((key) => key.startsWith(`shared.sections.${section}.`));
          const item = rowError && state?.draft.shared.sections[section]?.[Number(rowError.split('.')[3])];
          if (item) openItem(section, item.id);
        }
        if (!Object.keys(error.fields).some((key) => key.startsWith(panel === 'shared' ? 'shared.' : `localized.${panel}.`))) {
          const first = Object.keys(error.fields)[0]?.split('.');
          if (first?.[0] === 'shared') setPanel('shared');
          else if (first?.[1] === 'vi' || first?.[1] === 'en') setPanel(first[1]);
        }
      }
    } finally { setBusy(false); }
  }

  function reload() {
    return run(async () => {
      setState(await request<State>());
      setDirty(false);
      setConflict(false);
      setPreview(null);
    });
  }

  if (!state) return <section className="admin-card">
    <h2>Nội dung CV</h2>
    {failure ? <><p role="alert">{failure}</p><button onClick={() => void reload()}>Tải lại</button></> : <p role="status">Đang tải bản nháp…</p>}
  </section>;

  const { draft, revision, published } = state;
  const shared = draft.shared;
  const locale = panel === 'shared' ? sharedLocale : panel;
  const localized = draft.localized[locale];
  const itemsFor = (section: Section) => shared.sections[section] ?? [];

  function headingField(section: Section, language: Locale) {
    return <Field label={`Tiêu đề mục ${sectionNames[section]}`} path={`localized.${language}.headings.${section}`}
      value={draft.localized[language].headings?.[section] ?? ''} errors={errors}
      change={(value) => edit((next) => {
        next.localized[language].headings = { ...next.localized[language].headings, [section]: value };
      })} />;
  }

  function translationFields(section: Section, item: Item, language: Locale, number?: number) {
    const values = draft.localized[language].items[item.id] ?? empty;
    return itemFields[section].map(([key, label]) =>
      <Field key={key} label={number === undefined ? label : `${number}. ${label}`} path={`localized.${language}.items.${item.id}.${key}`} value={values[key] ?? ''} errors={errors}
        multiline={key === 'details' || key === 'contribution'} change={(value) => edit((next) => {
          const items = next.localized[language].items;
          items[item.id] = { ...(items[item.id] ?? empty), [key]: value };
        })} />);
  }

  function move(section: Section, index: number, offset: number) {
    edit((next) => {
      const items = next.shared.sections[section];
      const [item] = items.splice(index, 1);
      items.splice(index + offset, 0, item);
    });
  }

  async function saveDraft() {
    if (!dirty) return revision;
    const saved = await request<Pick<State, 'draft' | 'revision'>>('', 'PUT', { draft, revision });
    setState((current) => current && { ...current, ...saved });
    setDirty(false);
    return saved.revision;
  }

  return <section className="cv-editor" aria-labelledby="content-title">
    <h2 id="content-title">Nội dung CV</h2>
    <nav className="cv-editor-tabs" aria-label="Phần nội dung CV">
      {([['shared', 'Thông tin chung'], ['vi', 'Tiếng Việt'], ['en', 'English']] as const).map(([id, label]) =>
        <button key={id} disabled={busy} className="admin-plain" aria-pressed={panel === id} onClick={() => { setPanel(id); setPreview(null); }}>{label}</button>)}
    </nav>
    <fieldset disabled={busy} className="cv-editor-body">
      {panel === 'shared' ? <>
        <section className="admin-card">
          <h3>Thông tin chung</h3>
          <div className="cv-editor-fields">
            {([['name', 'Tên hiển thị'], ['email', 'Email'], ['phone', 'Điện thoại'], ['website', 'Website'], ['github', 'GitHub cá nhân'], ['facebook', 'Facebook']] as const).map(([key, label]) =>
              <Field key={key} label={label} path={`shared.${key}`} value={shared[key] ?? ''} errors={errors}
                inputMode={key === 'email' ? 'email' : key === 'phone' ? 'tel' : ['website', 'github', 'facebook'].includes(key) ? 'url' : undefined}
                change={(value) => edit((next) => { next.shared[key] = value; })} />)}
          </div>
          <div className="cv-editor-portrait">
            <label htmlFor="cv-portrait-file">Ảnh đại diện</label>
            <p id="cv-portrait-hint">{portraitHint}</p>
            {shared.portrait && <Image className="cv-portrait" src={shared.portrait} alt="Ảnh đại diện bản nháp"
              width={112} height={112} unoptimized />}
            <div className="cv-editor-portrait-actions">
              <input type="file" id="cv-portrait-file" accept={portraitTypes.join(',')}
                aria-describedby={errors['shared.portrait'] ? 'cv-portrait-hint cv-portrait-error' : 'cv-portrait-hint'}
                aria-invalid={Boolean(errors['shared.portrait'])} onChange={(event) => {
                  const file = event.currentTarget.files?.[0];
                  event.currentTarget.value = '';
                  if (file) void run(() => selectPortrait(file));
                }} />
              {shared.portrait && <button type="button" className="admin-plain"
                onClick={() => edit((next) => { delete next.shared.portrait; })}>Xóa ảnh</button>}
            </div>
            {errors['shared.portrait'] && <p id="cv-portrait-error" className="cv-editor-error">{errors['shared.portrait']}</p>}
          </div>
        </section>
        {sections.map((section) => {
          const language = sectionLocales[section] ?? 'vi';
          const languagePicker = <div className="cv-editor-tabs" role="group" aria-label={`Ngôn ngữ ${sectionNames[section].toLowerCase()}`}>
            {(['vi', 'en'] as const).map((option) =>
              <button key={option} className="admin-plain" aria-pressed={language === option}
                onClick={() => setSectionLocales((previous) => ({ ...previous, [section]: option }))}>
                {section === 'projects' ? `Dự án ${option.toUpperCase()}` : languages[option]}
              </button>)}
          </div>;
          return <section className="admin-card" key={section}>
          <div className="cv-editor-section-title"><h3>{sectionNames[section]}</h3><button className="admin-plain"
            aria-label={`Thêm ${sectionNames[section].toLowerCase()}`} disabled={itemsFor(section).length >= 50}
            onClick={() => {
              const id = `${section}-${crypto.randomUUID()}`;
              edit((next) => { (next.shared.sections[section] ??= []).push({ id, start: '', end: '', url: '' }); });
              openItem(section, id);
            }}>+ Thêm mục</button></div>
          {section === 'projects' && <div className="cv-editor-project-language">
            {languagePicker}
            {headingField(section, language)}
          </div>}
          {itemsFor(section).map((item, index) => {
            const expanded = openItems[section] === item.id;
            const otherLanguage = language === 'vi' ? 'en' : 'vi';
            const title = draft.localized[language].items[item.id]?.title?.trim()
              || draft.localized[otherLanguage].items[item.id]?.title?.trim()
              || `${sectionNames[section]} chưa đặt tên`;
            return <div key={item.id} className="cv-editor-item">
            <div className="cv-editor-section-title">
              <button className="admin-plain cv-editor-item-toggle" aria-expanded={expanded}
                aria-controls={`editor-${item.id}`} onClick={() => openItem(section, expanded ? '' : item.id)}>
                <span aria-hidden="true">{expanded ? '−' : '+'}</span>
                <span>{title}</span>
              </button>
              <div className="cv-editor-item-actions">
                <button className="admin-plain" aria-label="Lên một vị trí" disabled={index === 0} onClick={() => move(section, index, -1)}>↑</button>
                <button className="admin-plain" aria-label="Xuống một vị trí" disabled={index === itemsFor(section).length - 1} onClick={() => move(section, index, 1)}>↓</button>
                <button className="admin-plain" onClick={() => edit((next) => {
                  next.shared.sections[section].splice(index, 1);
                  delete next.localized.vi.items[item.id];
                  delete next.localized.en.items[item.id];
                })}>Xóa</button>
              </div>
            </div>
            <div id={`editor-${item.id}`} hidden={!expanded}>
            {expanded && section !== 'projects' && <div className="cv-editor-project-language">{languagePicker}</div>}
            <div className="cv-editor-fields">
              {translationFields(section, item, language, section === 'projects' ? index + 1 : undefined)}
              {section !== 'skills' && (['start', 'end'] as const).filter((key) =>
                (key !== 'end' || (!item.current && section !== 'certifications' && section !== 'awards'))).map((key) =>
                <Field key={key} label={key === 'start' ? 'Bắt đầu (YYYY-MM)' : 'Kết thúc (YYYY-MM)'} path={`shared.sections.${section}.${index}.${key}`}
                  value={item[key]} errors={errors} inputMode="numeric"
                  change={(value) => edit((next) => { next.shared.sections[section][index][key] = value; })} />)}
              {section === 'experience' && <label className="cv-editor-checkbox"><input type="checkbox" checked={item.current ?? false}
                onChange={(event) => { const checked = event.currentTarget.checked; edit((next) => {
                  const target = next.shared.sections[section][index];
                  target.current = checked;
                  if (checked) target.end = '';
                }); }} /> Đang làm</label>}
              {section === 'education' && <Field label="GPA" path={`shared.sections.${section}.${index}.gpa`} value={item.gpa ?? ''} errors={errors}
                change={(value) => edit((next) => { next.shared.sections[section][index].gpa = value; })} />}
              {(section === 'projects' || supplementary.includes(section)) && <Field label={section === 'projects' ? 'Liên kết dự án / Demo' : 'Liên kết minh chứng'}
                path={`shared.sections.${section}.${index}.url`} value={item.url} errors={errors} inputMode="url"
                change={(value) => edit((next) => { next.shared.sections[section][index].url = value; })} />}
              {section === 'projects' && (['github', 'technologies'] as const).map((key) =>
                <Field key={key} label={key === 'github' ? 'GitHub' : 'Công nghệ'} path={`shared.sections.${section}.${index}.${key}`}
                  value={item[key] ?? ''} errors={errors} inputMode={key === 'github' ? 'url' : undefined}
                  change={(value) => edit((next) => { next.shared.sections[section][index][key] = value; })} />)}
              {supplementary.includes(section) && <label className="cv-editor-checkbox"><input type="checkbox" checked={item.hidden ?? false}
                onChange={(event) => { const checked = event.currentTarget.checked; edit((next) => { next.shared.sections[section][index].hidden = checked; }); }} /> Ẩn mục này</label>}
            </div>
            </div>
          </div>;
          })}
        </section>;
        })}
      </> : <>
        <section className="admin-card">
          <div className="cv-editor-section-title"><h3>{languages[locale]}</h3>
            <span>{published[locale] ? `Xuất bản ${new Date(published[locale]).toLocaleString('vi-VN')}` : 'Đang hiển thị dữ liệu mẫu'}</span>
          </div>
          <div className="cv-editor-fields">
            {([['role', 'Chức danh'], ['location', 'Địa điểm'], ['intro', 'Giới thiệu'], ['seoTitle', 'Tiêu đề SEO'], ['seoDescription', 'Mô tả SEO']] as const).map(([key, label]) =>
              <Field key={key} label={label} path={`localized.${locale}.${key}`} value={localized[key]} errors={errors} multiline={key === 'intro' || key === 'seoDescription'}
                change={(value) => edit((next) => { next.localized[locale][key] = value; })} />)}
          </div>
        </section>
        {sections.filter((section) => itemsFor(section).length).map((section) =>
          <section className="admin-card" key={section}>
            <h3>{sectionNames[section]}</h3>
            <div className="cv-editor-fields">{headingField(section, locale)}</div>
            {itemsFor(section).map((item, index) => <div key={item.id} className="cv-editor-item cv-editor-fields">
              {translationFields(section, item, locale, index + 1)}
            </div>)}
          </section>)}
      </>}
    </fieldset>
    <div className="cv-editor-toolbar" role="group" aria-label="Thao tác nội dung CV">
      <p role="status">{notice || (busy ? 'Đang xử lý…' : dirty ? 'Có thay đổi chưa lưu.' : 'Bản nháp đã lưu.')}</p>
      {failure && <p className="cv-editor-error" role="alert">{failure}</p>}
      {conflict && <button className="admin-plain" onClick={() => void reload()} disabled={busy}>Tải lại bản nháp đã lưu</button>}
      <div className="cv-editor-actions">
        {panel === 'shared' && <select aria-label="Ngôn ngữ xem trước và xuất bản" value={locale} disabled={busy}
          onChange={(event) => setSharedLocale(event.currentTarget.value === 'en' ? 'en' : 'vi')}>
          <option value="vi">{languages.vi}</option>
          <option value="en">{languages.en}</option>
        </select>}
        <button className="admin-plain" disabled={busy || !dirty || conflict} onClick={() => void run(async () => {
          await saveDraft();
          setNotice('Đã lưu bản nháp.');
        })}>Lưu nháp</button>
        <button ref={previewButton} className="admin-plain" disabled={busy || conflict} onClick={() => void run(async () => {
          await saveDraft();
          setPreview(await request<PublicCv>(`/${locale}/preview`));
        })}>Xem trước</button>
        <button disabled={busy || conflict} onClick={() => void run(async () => {
          const revision = await saveDraft();
          const result = await request<{ revision: number; publishedAt: string }>(`/${locale}/publish`, 'POST', { revision });
          setState((current) => current && ({
            ...current, revision: result.revision, published: { ...current.published, [locale]: result.publishedAt },
          }));
          setNotice(`Đã xuất bản ${languages[locale]}.`);
        })}>Xuất bản {languages[locale]}</button>
      </div>
    </div>
    {preview && <dialog ref={previewDialog} className="admin-card cv-content-preview" aria-labelledby="cv-preview-title"
      onClose={() => { setPreview(null); previewButton.current?.focus({ preventScroll: true }); }}>
      <div className="cv-editor-section-title"><h3 id="cv-preview-title">Xem trước bản nháp · {languages[preview.locale]}</h3>
        <button className="admin-plain" onClick={() => previewDialog.current?.close()}>Đóng</button></div>
      {preview.template && 'document' in preview.template
        ? <ResumeDocument document={preview.template.document} title="Bản xem trước Sidebar" />
        : preview.template ? <>
        <style dangerouslySetInnerHTML={{ __html: preview.template.css }} />
        <div className="imported-template" dangerouslySetInnerHTML={{ __html: preview.template.html }} />
      </> : <CvTemplate cv={preview} preview />}
    </dialog>}
  </section>;
}
