import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promises as fileSystem } from 'node:fs';
import type { Source } from '@/types';

function toInferredMimeType(bytes: Buffer): string {
  if (
    bytes.length >= 4 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return 'image/png';
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    bytes.length >= 6 &&
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38 &&
    (bytes[4] === 0x37 || bytes[4] === 0x39) &&
    bytes[5] === 0x61
  ) {
    return 'image/gif';
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return 'image/webp';
  }
  return 'application/octet-stream';
}

function toBytesFromDataUrl(url: string): Buffer {
  const commaIndex = url.indexOf(',');
  if (commaIndex < 0) {
    throw new Error('Malformed data URL input: missing payload separator.');
  }
  const metadata = url.slice(5, commaIndex);
  const payload = url.slice(commaIndex + 1);

  if (!/;base64(?:;|$)/i.test(metadata)) {
    throw new Error('Malformed data URL input: only base64-encoded payloads are supported.');
  }
  if (payload.trim().length === 0) {
    throw new Error('Malformed data URL input: empty base64 payload.');
  }
  if (!/^[A-Za-z0-9+/=\s]+$/.test(payload)) {
    throw new Error('Malformed data URL input: invalid base64 payload.');
  }

  const normalizedPayload = payload.replace(/\s+/g, '');
  if (normalizedPayload.length % 4 !== 0) {
    throw new Error('Malformed data URL input: invalid base64 payload length.');
  }

  const bytes = Buffer.from(normalizedPayload, 'base64');
  if (bytes.length === 0) {
    throw new Error('Malformed data URL input: base64 payload could not be decoded.');
  }
  return bytes;
}

export async function toSourceBuffer(input: Source): Promise<Buffer> {
  if (Buffer.isBuffer(input)) {
    return input;
  }
  if (input instanceof Uint8Array) {
    return Buffer.from(input);
  }
  if (input instanceof ArrayBuffer) {
    return Buffer.from(input);
  }
  if (typeof input === 'string') {
    if (input.startsWith('data:')) {
      return toBytesFromDataUrl(input);
    }
    return fileSystem.readFile(input);
  }
  if (input instanceof URL) {
    if (input.protocol !== 'file:') {
      throw new Error(`Unsupported URL protocol for asset export: "${input.protocol}"`);
    }
    return fileSystem.readFile(fileURLToPath(input));
  }

  throw new Error('Unsupported asset source for export.');
}

export function toBase64DataUrl(bytes: Buffer, mimeType?: string): string {
  const resolvedMimeType = mimeType?.trim() ? mimeType : toInferredMimeType(bytes);
  return `data:${resolvedMimeType};base64,${bytes.toString('base64')}`;
}

export async function saveBytesToFile(bytes: Buffer, outputPath: string): Promise<string> {
  await fileSystem.mkdir(path.dirname(outputPath), { recursive: true });
  await fileSystem.writeFile(outputPath, bytes);
  return outputPath;
}
