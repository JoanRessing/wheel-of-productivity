const COOKIE_PREFIX = 'wop_';
const COOKIE_SESSION_ID = COOKIE_PREFIX + 'sid';
const COOKIE_VERSION = COOKIE_PREFIX + 'v';
const COOKIE_TASKS_PREFIX = COOKIE_PREFIX + 'tasks_';
const MAX_COOKIE_CHUNK = 3800;
function setCookie(name, value) {
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; Path=/; SameSite=Lax`;
}
function deleteCookie(name) {
  document.cookie = `${encodeURIComponent(name)}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
}
function getAllCookies() {
  const out = {};
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
export function getOrCreateSessionId() {
  const cookies = getAllCookies();
  let sid = cookies[COOKIE_SESSION_ID];
  if (!sid) {
    sid = crypto.getRandomValues(new Uint32Array(4)).join('');
    setCookie(COOKIE_SESSION_ID, sid);
  }
  return sid;
}
export function clearSession() {
  const cookies = getAllCookies();
  for (const k of Object.keys(cookies)) {
    if (k.startsWith(COOKIE_PREFIX)) deleteCookie(k);
  }
}
export function loadState() {
  const cookies = getAllCookies();
  const ver = parseInt(cookies[COOKIE_VERSION] || '1', 10) || 1;
  const chunks = [];
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
      const data = JSON.parse(json);
      const tasks = data.t.map((t) => ({ id: t.i, name: t.n, time: t.tm, location: t.l, deadline: t.d, weight: t.w }));
      return { tasks };
    }
  } catch (e) {
    console.warn('Failed to parse cookie data; starting with empty state.', e);
  }
  return { tasks: [] };
}
export function saveState(state) {
  const cookies = getAllCookies();
  for (const k of Object.keys(cookies)) {
    if (k.startsWith(COOKIE_TASKS_PREFIX)) deleteCookie(k);
  }
  const data = { v: 1, t: state.tasks.map((t) => ({ i: t.id, n: t.name, tm: t.time, l: t.location, d: t.deadline, w: t.weight })) };
  const json = JSON.stringify(data);
  const enc = encodeURIComponent(json);
  setCookie(COOKIE_VERSION, '1');
  let idx = 1;
  for (let start = 0; start < enc.length; start += MAX_COOKIE_CHUNK) {
    const chunk = enc.slice(start, start + MAX_COOKIE_CHUNK);
    setCookie(`${COOKIE_TASKS_PREFIX}${idx}`, chunk);
    idx++;
    if (idx > 12) {
      console.warn('Too many tasks to fit in cookies; truncating.');
      break;
    }
  }
}
