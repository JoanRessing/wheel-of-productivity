import { AppState, CookieBundleMeta, CookieDataV1, Task } from './types.js';
import { uid } from './util.js';

const COOKIE_PREFIX = 'wop_';
const COOKIE_SESSION_ID = COOKIE_PREFIX + 'sid';
const COOKIE_VERSION = COOKIE_PREFIX + 'v';
const COOKIE_TASKS_PREFIX = COOKIE_PREFIX + 'tasks_';
const MAX_COOKIE_CHUNK = 3800; // bytes; conservative under typical ~4KB limit

function setCookie(name: string, value: string): void {
  // Session cookie: no expires or max-age. Path=/ for site-wide.
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; Path=/; SameSite=Lax`;
}

function deleteCookie(name: string): void {
  // Expire immediately to clear
  document.cookie = `${encodeURIComponent(name)}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
}

function getAllCookies(): Record<string, string> {
  const out: Record<string, string> = {};
  const parts = document.cookie ? document.cookie.split('; ') : [];
  for (const p of parts) {
    const idx = p.indexOf('=');
    if (idx === -1) continue;
    const k = decodeURIComponent(p.slice(0, idx));
    const v = decodeURIComponent(p.slice(idx + 1));
    out[k] = v;
  }
  return out;
}

export function getOrCreateSessionId(): string {
  const cookies = getAllCookies();
  let sid = cookies[COOKIE_SESSION_ID];
  if (!sid) {
    sid = uid();
    setCookie(COOKIE_SESSION_ID, sid);
  }
  return sid;
}

export function clearSession(): void {
  const cookies = getAllCookies();
  for (const k of Object.keys(cookies)) {
    if (k.startsWith(COOKIE_PREFIX)) deleteCookie(k);
  }
}

export function loadState(): AppState {
  const cookies = getAllCookies();
  const ver = parseInt(cookies[COOKIE_VERSION] || '1', 10) || 1;
  const chunks: string[] = [];
  let i = 1;
  while (true) {
    const k = `${COOKIE_TASKS_PREFIX}${i}`;
    if (!(k in cookies)) break;
    chunks.push(cookies[k]);
    i++;
  }
  if (chunks.length === 0) {
    return { tasks: [] };
  }
  try {
    const joined = chunks.join('');
    const json = decodeURIComponent(joined);
    if (ver === 1) {
      const data = JSON.parse(json) as CookieDataV1;
      const tasks: Task[] = data.t.map(t => ({
        id: t.i,
        name: t.n,
        time: t.tm,
        location: t.l,
        deadline: t.d,
        weight: t.w,
      }));
      return { tasks };
    }
  } catch (e) {
    console.warn('Failed to parse cookie data; starting with empty state.', e);
  }
  return { tasks: [] };
}

export function saveState(state: AppState): void {
  // Clear previous chunks first
  const cookies = getAllCookies();
  for (const k of Object.keys(cookies)) {
    if (k.startsWith(COOKIE_TASKS_PREFIX)) deleteCookie(k);
  }

  const data: CookieDataV1 = {
    v: 1,
    t: state.tasks.map(t => ({ i: t.id, n: t.name, tm: t.time, l: t.location, d: t.deadline, w: t.weight })),
  };
  const json = JSON.stringify(data);
  const enc = encodeURIComponent(json);
  setCookie(COOKIE_VERSION, '1');

  // Chunking
  let idx = 1;
  for (let start = 0; start < enc.length; start += MAX_COOKIE_CHUNK) {
    const chunk = enc.slice(start, start + MAX_COOKIE_CHUNK);
    setCookie(`${COOKIE_TASKS_PREFIX}${idx}`, chunk);
    idx++;
    if (idx > 12) { // 12 * 3800 ~ 45KB; avoid excessive cookie bloat
      console.warn('Too many tasks to fit in cookies; truncating.');
      break;
    }
  }
}
