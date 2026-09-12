const STORAGE_KEY = 'wheel-of-productivity:tasks:v1';
const COOKIE_PREFIX = 'wop_';
const COOKIE_VERSION = COOKIE_PREFIX + 'v';
const COOKIE_TASKS_PREFIX = COOKIE_PREFIX + 'tasks_';
function isLocation(value) {
    return value === 'any' || value === 'indoor' || value === 'outdoor';
}
function parseTask(value) {
    if (!value || typeof value !== 'object')
        return null;
    const record = value;
    if (typeof record.id !== 'string' || typeof record.name !== 'string')
        return null;
    const location = isLocation(record.location) ? record.location : 'any';
    const task = {
        id: record.id,
        name: record.name,
        location,
    };
    if (typeof record.time === 'number' && Number.isFinite(record.time))
        task.time = record.time;
    if (typeof record.deadline === 'string' && record.deadline)
        task.deadline = record.deadline;
    if (Array.isArray(record.prerequisiteIds)) {
        const prerequisiteIds = record.prerequisiteIds.filter((id) => typeof id === 'string');
        if (prerequisiteIds.length > 0)
            task.prerequisiteIds = [...new Set(prerequisiteIds)];
    }
    if (typeof record.weight === 'number' && Number.isFinite(record.weight))
        task.weight = record.weight;
    return task;
}
function getAllCookies() {
    const out = {};
    const parts = document.cookie ? document.cookie.split('; ') : [];
    for (const p of parts) {
        const idx = p.indexOf('=');
        if (idx === -1)
            continue;
        const k = decodeURIComponent(p.slice(0, idx));
        const v = decodeURIComponent(p.slice(idx + 1));
        out[k] = v;
    }
    return out;
}
function deleteCookie(name) {
    document.cookie = `${encodeURIComponent(name)}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
}
function readCookieMigrationState() {
    const cookies = getAllCookies();
    const version = Number.parseInt(cookies[COOKIE_VERSION] || '1', 10) || 1;
    if (version !== 1)
        return null;
    const chunks = [];
    let i = 1;
    while (true) {
        const key = `${COOKIE_TASKS_PREFIX}${i}`;
        if (!(key in cookies))
            break;
        chunks.push(cookies[key]);
        i++;
    }
    if (chunks.length === 0)
        return null;
    try {
        const json = decodeURIComponent(chunks.join(''));
        const data = JSON.parse(json);
        const tasks = data.t.map((t) => ({
            id: t.i,
            name: t.n,
            time: t.tm,
            location: t.l,
            deadline: t.d,
            prerequisiteIds: t.p,
            weight: t.w,
        })).map(parseTask).filter((task) => task !== null);
        return { tasks };
    }
    catch (e) {
        console.warn('Failed to migrate tasks from cookies.', e);
        return null;
    }
}
function clearLegacyCookies() {
    const cookies = getAllCookies();
    for (const key of Object.keys(cookies)) {
        if (key.startsWith(COOKIE_PREFIX))
            deleteCookie(key);
    }
}
export function loadState() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            const data = JSON.parse(raw);
            const tasks = Array.isArray(data.tasks)
                ? data.tasks.map(parseTask).filter((task) => task !== null)
                : [];
            return { tasks };
        }
    }
    catch (e) {
        console.warn('Failed to load tasks from localStorage.', e);
    }
    const migrated = readCookieMigrationState();
    if (migrated) {
        saveState(migrated);
        clearLegacyCookies();
        return migrated;
    }
    return { tasks: [] };
}
export function saveState(state) {
    const data = { v: 1, tasks: state.tasks };
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
    catch (e) {
        console.warn('Failed to save tasks to localStorage.', e);
    }
}
export function clearStoredTasks() {
    try {
        localStorage.removeItem(STORAGE_KEY);
    }
    catch (e) {
        console.warn('Failed to clear localStorage tasks.', e);
    }
    clearLegacyCookies();
}