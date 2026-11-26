import { BackupPayload } from '../types/schema';
import { sanitizeSyncUrl } from './security';

export interface CloudPullResult {
  payload: BackupPayload;
  cloudTimestamp: string;
}

export function isValidAppsScriptUrl(url: string): boolean {
  const clean = sanitizeSyncUrl(url);
  if (!clean) return false;
  try {
    const parsed = new URL(clean);
    return parsed.protocol === 'https:' && parsed.hostname.length > 0;
  } catch {
    return false;
  }
}

export function isOfficialAppsScriptHost(url: string): boolean {
  const clean = sanitizeSyncUrl(url);
  if (!clean) return false;
  try {
    const parsed = new URL(clean);
    return (
      parsed.hostname === 'script.google.com' ||
      parsed.hostname === 'script.googleusercontent.com'
    );
  } catch {
    return false;
  }
}

export function extractPayloadTimestamp(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return new Date(0).toISOString();
  const obj = payload as Record<string, unknown>;
  const stateObj = obj.state as Record<string, unknown> | undefined;
  const candidate =
    (typeof stateObj?.lastModifiedAt === 'string' && stateObj.lastModifiedAt) ||
    (typeof obj.exportedAt === 'string' && obj.exportedAt) ||
    '';
  return candidate && !Number.isNaN(Date.parse(candidate))
    ? candidate
    : new Date(0).toISOString();
}

export function isCloudNewer(cloudIso?: string, localIso?: string): boolean {
  const cloudMs = cloudIso ? Date.parse(cloudIso) : NaN;
  const localMs = localIso ? Date.parse(localIso) : NaN;
  if (Number.isNaN(cloudMs)) return false;
  if (Number.isNaN(localMs)) return true;
  return cloudMs > localMs;
}

/**
 * Push BackupPayload JSON to Google Apps Script Web App via POST.
 * Uses text/plain;charset=utf-8 to avoid CORS OPTIONS preflight rejection on Apps Script.
 */
export async function pushStateToCloud(
  rawUrl: string,
  payload: BackupPayload
): Promise<{ syncedAt: string }> {
  const url = sanitizeSyncUrl(rawUrl);
  if (!url) {
    throw new Error('Web App URL không hợp lệ (bắt buộc sử dụng giao thức HTTPS).');
  }

  const res = await fetch(url, {
    method: 'POST',
    mode: 'cors',
    redirect: 'follow',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`Máy chủ Apps Script trả về lỗi HTTP ${res.status}.`);
  }

  const text = await res.text();
  if (text.trim()) {
    try {
      const parsed = JSON.parse(text) as { ok?: boolean; error?: string };
      if (parsed.ok === false) {
        throw new Error(parsed.error || 'Apps Script báo lỗi khi lưu dữ liệu.');
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes('Apps Script')) throw err;
      // Non-JSON 200 OK text response from custom script is still acceptable
    }
  }

  return { syncedAt: new Date().toISOString() };
}

/**
 * Pull latest BackupPayload JSON from Google Apps Script Web App via GET.
 */
export async function pullStateFromCloud(rawUrl: string): Promise<CloudPullResult> {
  const url = sanitizeSyncUrl(rawUrl);
  if (!url) {
    throw new Error('Web App URL không hợp lệ (bắt buộc sử dụng giao thức HTTPS).');
  }

  const sep = url.includes('?') ? '&' : '?';
  const res = await fetch(`${url}${sep}_ts=${Date.now()}`, {
    method: 'GET',
    mode: 'cors',
    redirect: 'follow',
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`Không thể tải dữ liệu từ Apps Script (HTTP ${res.status}).`);
  }

  const rawJson = (await res.json()) as unknown;
  if (!rawJson || typeof rawJson !== 'object') {
    throw new Error('Phản hồi từ Apps Script không phải JSON hợp lệ.');
  }

  const wrapper = rawJson as Record<string, unknown>;
  if (wrapper.ok === false) {
    throw new Error(
      typeof wrapper.error === 'string'
        ? wrapper.error
        : 'Chưa có dữ liệu sao lưu trên Google Drive.'
    );
  }

  const payload = (
    wrapper.data && typeof wrapper.data === 'object' ? wrapper.data : wrapper
  ) as BackupPayload;

  const cloudTimestamp = extractPayloadTimestamp(payload);
  return { payload, cloudTimestamp };
}

export const APPS_SCRIPT_CODE_TEMPLATE = `// Dán vào Google Apps Script (script.google.com) -> Deploy -> Web App
// Execute as: Me | Who has access: Anyone (bảo mật qua link URL bí mật cá nhân)
const FILE_NAME = 'raddsa-studio-sync.json';

function getOrCreateSyncFile() {
  const files = DriveApp.getFilesByName(FILE_NAME);
  if (files.hasNext()) return files.next();
  return DriveApp.createFile(FILE_NAME, '{}', MimeType.PLAIN_TEXT);
}

function doGet() {
  try {
    const file = getOrCreateSyncFile();
    const content = file.getBlob().getDataAsString('UTF-8') || '{}';
    return ContentService.createTextOutput(content).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    const body = e && e.postData && e.postData.contents ? e.postData.contents : '{}';
    JSON.parse(body); // xác thực JSON hợp lệ trước khi ghi
    const file = getOrCreateSyncFile();
    file.setContent(body);
    return ContentService.createTextOutput(JSON.stringify({ ok: true, updatedAt: new Date().toISOString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;
