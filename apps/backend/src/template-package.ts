import { load } from 'cheerio';
import { zipSync } from 'fflate';
import postcss from 'postcss';
import selectorParser from 'postcss-selector-parser';
import valueParser from 'postcss-value-parser';
import { fromBuffer } from 'yauzl';
import { matchesImageType } from './cv-image';

export const ZIP_LIMIT = 2 * 1024 * 1024;
const UNPACKED_LIMIT = 6 * 1024 * 1024;
const FILE_LIMIT = 60;
const filePath = /^(?:[a-zA-Z0-9_-][a-zA-Z0-9_.-]*\/)*[a-zA-Z0-9_-][a-zA-Z0-9_.-]*$/;
const slotOrder = ['intro', 'projects', 'experience', 'skills', 'education', 'contact'] as const;
type Slot = (typeof slotOrder)[number];
type Mapping = Partial<Record<Slot, string>>;
type Files = Map<string, Buffer>;
const tagNames = new Set('main header footer nav aside section article div h1 h2 h3 h4 h5 h6 p span strong em small b i ul ol li dl dt dd hr br figure figcaption img a time address blockquote'.split(' '));
const attributes = new Set(['id', 'class', 'title', 'alt', 'src', 'href', 'data-cv-section', 'data-cv-portrait', 'aria-label', 'aria-hidden', 'role', 'width', 'height']);
const imageTypes: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp' };

function fail(file: string, reason: string): never {
  throw new Error(`${file}: ${reason}`);
}

export async function readArchive(archive: Buffer): Promise<Files> {
  if (!archive.length || archive.length > ZIP_LIMIT) fail('ZIP', 'dung lượng tối đa 2 MiB.');
  return new Promise((resolve, reject) => {
    fromBuffer(archive, { lazyEntries: true, strictFileNames: true }, (error, zip) => {
      if (error || !zip) return reject(new Error('ZIP: không đọc được tệp nén.'));
      const files: Files = new Map();
      const seen = new Set<string>();
      let size = 0;
      const abort = (reason: Error) => { zip.close(); reject(reason); };
      zip.on('error', abort);
      zip.on('end', () => resolve(files));
      zip.on('entry', (entry) => {
        const name = entry.fileName.replace(/\/$/, '');
        const mode = (entry.externalFileAttributes >>> 16) & 0xf000;
        if (zip.entryCount > FILE_LIMIT || !filePath.test(name) || seen.has(name.toLowerCase()) ||
            (mode !== 0 && mode !== 0x8000 && mode !== 0x4000) || entry.isEncrypted()) {
          return abort(new Error(`${name}: tên, loại tệp hoặc số lượng mục trong ZIP không hợp lệ.`));
        }
        seen.add(name.toLowerCase());
        if (entry.fileName.endsWith('/')) return zip.readEntry();
        size += entry.uncompressedSize;
        if (size > UNPACKED_LIMIT) return abort(new Error('ZIP: dữ liệu giải nén vượt 6 MiB.'));
        zip.openReadStream(entry, (streamError, stream) => {
          if (streamError || !stream) return abort(new Error(`${name}: không thể giải nén.`));
          const chunks: Buffer[] = [];
          let count = 0;
          stream.on('error', abort);
          stream.on('data', (chunk: Buffer) => {
            count += chunk.length;
            if (count > entry.uncompressedSize || count > UNPACKED_LIMIT) {
              stream.destroy(new Error(`${name}: kích thước tệp không hợp lệ.`));
              return;
            }
            chunks.push(chunk);
          });
          stream.on('end', () => {
            files.set(name, Buffer.concat(chunks));
            zip.readEntry();
          });
        });
      });
      zip.readEntry();
    });
  });
}

function fileText(files: Files, file: string) {
  const bytes = files.get(file);
  if (!bytes) fail(file, 'thiếu tệp bắt buộc.');
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return fail(file, 'cần mã hóa UTF-8.');
  }
}

function imageAsset(files: Files, reference: string, source: string) {
  const extension = reference.split('.').at(-1)?.toLowerCase();
  const type = extension && imageTypes[extension];
  const bytes = files.get(reference);
  if (!filePath.test(reference) || !type || !bytes?.length) fail(source, `tài nguyên ảnh không hợp lệ: ${reference}`);
  if (!matchesImageType(bytes, type)) fail(source, `nội dung không khớp định dạng ảnh: ${reference}`);
  return `data:${type};base64,${bytes.toString('base64')}`;
}

function compileCss(files: Files) {
  const source = fileText(files, 'styles.css');
  const parsed = postcss.parse(source, { from: undefined });
  parsed.walkAtRules((rule) => {
    if (!['media', 'supports'].includes(rule.name.toLowerCase()) || /[\\<>]/.test(rule.params)) {
      fail('styles.css', `quy tắc @${rule.name} không được hỗ trợ.`);
    }
  });
  parsed.walkRules((rule) => {
    if (rule.parent?.type === 'rule' || /[\\<]/.test(rule.selector)) fail('styles.css', 'selector lồng hoặc ký tự không được hỗ trợ.');
    rule.selector = selectorParser((selectors) => {
      for (const selector of selectors.nodes) {
        if (selector.nodes.find((node) => node.type !== 'comment')?.type === 'combinator') {
          fail('styles.css', 'selector tương đối không được hỗ trợ.');
        }
        selector.prepend(selectorParser.combinator({ value: ' ' }));
        selector.prepend(selectorParser.className({ value: 'imported-template' }));
      }
    }).processSync(rule.selector);
  });
  parsed.walkDecls((declaration) => {
    if (/[\\<>]/.test(declaration.value + declaration.prop) ||
        /^(behavior|-moz-binding)$/i.test(declaration.prop) ||
        (/^position$/i.test(declaration.prop) && /^(fixed|sticky)$/i.test(declaration.value.trim()))) {
      fail('styles.css', `giá trị không được hỗ trợ cho ${declaration.prop}.`);
    }
    const value = valueParser(declaration.value);
    value.walk((node) => {
      if (node.type !== 'function') return;
      const name = node.value.toLowerCase();
      if (['image', 'image-set', '-webkit-image-set', 'src', 'paint', 'expression'].includes(name)) fail('styles.css', `hàm ${name} không được hỗ trợ.`);
      if (name !== 'url') return;
      const resource = node.nodes[0];
      if (node.nodes.length !== 1 || (resource.type !== 'word' && resource.type !== 'string')) fail('styles.css', 'đường dẫn url() không hợp lệ.');
      node.nodes = [{ type: 'string', quote: '"', value: imageAsset(files, resource.value, 'styles.css'), sourceIndex: 0, sourceEndIndex: 0 }];
      return false;
    });
    declaration.value = value.toString();
  });
  const css = parsed.toString();
  if (/<\//i.test(css)) fail('styles.css', 'ký tự đóng thẻ không hợp lệ.');
  return css;
}

function manifest(files: Files) {
  if (!files.has('template.json')) return { name: '' };
  let value: unknown;
  try { value = JSON.parse(fileText(files, 'template.json')); } catch { fail('template.json', 'JSON không hợp lệ.'); }
  if (!value || typeof value !== 'object' || !('schemaVersion' in value) || value.schemaVersion !== 1 ||
      !('name' in value) || typeof value.name !== 'string' || !value.name.trim() || value.name.trim().length > 100 ||
      Object.keys(value).some((key) => !['schemaVersion', 'name'].includes(key))) {
    fail('template.json', 'cần schemaVersion 1 và name dài từ 1 đến 100 ký tự.');
  }
  return { name: value.name.trim() };
}

export async function inspectTemplate(archive: Buffer, setup?: { name: string; mapping: Mapping }) {
  const files = await readArchive(archive);
  for (const file of files.keys()) {
    if (!['template.json', 'index.html', 'styles.css', 'LICENSE', 'LICENSE.txt'].includes(file) &&
        !(file.startsWith('assets/') && imageTypes[file.split('.').at(-1)?.toLowerCase() ?? ''])) {
      fail(file, 'loại tệp không được hỗ trợ. Gói chỉ dùng HTML, CSS và ảnh cục bộ.');
    }
  }
  const info = manifest(files);
  const source = fileText(files, 'index.html');
  if (/<(?:script|iframe|object|embed|base|svg|math|form|link)\b/i.test(source) || /<meta\b[^>]*http-equiv/i.test(source)) {
    fail('index.html', 'chứa script, tệp liên kết hoặc thành phần chủ động không được hỗ trợ.');
  }
  const $ = load(source);
  const ids = new Set<string>();
  const slots = new Set<Slot>();
  $('body *').each((_, node) => {
    if (!tagNames.has(node.tagName)) fail('index.html', `thẻ <${node.tagName}> không được hỗ trợ.`);
    for (const attr of Object.keys(node.attribs)) {
      if (!attributes.has(attr)) fail('index.html', `thuộc tính ${attr} không được hỗ trợ.`);
    }
    const element = $(node);
    const id = element.attr('id');
    if (id && (!/^[A-Za-z][A-Za-z0-9_-]{0,79}$/.test(id) || ids.has(id))) fail('index.html', `ID không hợp lệ hoặc trùng: ${id}`);
    if (id) ids.add(id);
    const href = element.attr('href');
    if (href !== undefined && (node.tagName !== 'a' || !/^#[A-Za-z][A-Za-z0-9_-]*$/.test(href))) {
      fail('index.html', `liên kết tĩnh không hợp lệ: ${href}`);
    }
    const src = element.attr('src');
    if (src !== undefined && (node.tagName !== 'img' || !src.startsWith('assets/'))) fail('index.html', `chỉ hỗ trợ ảnh dưới assets/: ${src}`);
    if (src) imageAsset(files, src, 'index.html');
    const slot = element.attr('data-cv-section') as Slot | undefined;
    if (slot && (!slotOrder.includes(slot) || slots.has(slot) || element.parents('[data-cv-section]').length)) {
      fail('index.html', `mục CV không hợp lệ, trùng hoặc lồng nhau: ${slot}`);
    }
    if (slot) slots.add(slot);
  });
  const portraits = $('body [data-cv-portrait]');
  if (portraits.length > 1 || (portraits.length && (!portraits.is('img') || portraits.attr('src') !== undefined))) {
    fail('index.html', 'chỉ dùng một thẻ <img data-cv-portrait> không có src.');
  }
  const css = compileCss(files);
  if (setup) {
    if (!setup.name.trim() || setup.name.trim().length > 100) fail('template.json', 'cần tên mẫu từ 1 đến 100 ký tự.');
    for (const [slot, id] of Object.entries(setup.mapping)) {
      if (!slotOrder.includes(slot as Slot) || slots.has(slot as Slot) || typeof id !== 'string' || !ids.has(id)) fail('index.html', `gán mục không hợp lệ: ${slot}`);
      const element = $('[id]').filter((_, node) => $(node).attr('id') === id);
      if (!element.is('section, article, div, aside, header, footer') || element.is('[data-cv-section]') ||
          element.parents('[data-cv-section]').length || element.find('[data-cv-section]').length) fail('index.html', `khối gán không hợp lệ: ${id}`);
      element.attr('data-cv-section', slot);
      slots.add(slot as Slot);
    }
    files.set('template.json', Buffer.from(JSON.stringify({ schemaVersion: 1, name: setup.name.trim() })));
    files.set('index.html', Buffer.from($('body').html() ?? ''));
  }
  const portraitSection = portraits.closest('[data-cv-section]').attr('data-cv-section');
  if (portraitSection && portraitSection !== 'intro') fail('index.html', 'đặt vị trí ảnh đại diện trong phần giới thiệu hoặc bên ngoài các mục CV.');
  const missing = slotOrder.filter((slot) => !slots.has(slot));
  if ((!info.name && !setup) || missing.length) {
    return { status: 'configuration' as const, name: setup?.name ?? info.name, missing, ids: [...ids] };
  }
  const compiled = load(files.get('index.html') ?? source);
  compiled('body img[src]').each((_, node) => {
    const image = compiled(node);
    image.attr('src', imageAsset(files, image.attr('src') ?? '', 'index.html'));
  });
  return {
    status: 'valid' as const,
    name: setup?.name.trim() ?? info.name,
    markup: compiled('body').html() ?? '',
    css,
    archive: setup ? Buffer.from(zipSync(Object.fromEntries(files))) : archive,
  };
}
