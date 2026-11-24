export function matchesImageType(bytes: Buffer, type: string) {
  switch (type) {
    case 'image/png':
      return bytes.subarray(0, 8).toString('hex') === '89504e470d0a1a0a';
    case 'image/jpeg':
      return bytes.subarray(0, 3).toString('hex') === 'ffd8ff';
    case 'image/webp':
      return bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP';
    default:
      return false;
  }
}

const portraitLimit = 512 * 1024;

export function isPortrait(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 32 + 4 * Math.ceil(portraitLimit / 3)) return false;
  const parts = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!parts) return false;
  const [, type, encoded] = parts;
  const bytes = Buffer.from(encoded, 'base64');
  return bytes.length <= portraitLimit && bytes.toString('base64') === encoded && matchesImageType(bytes, type);
}
