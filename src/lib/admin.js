import { S, set } from './store.js';
import { db } from './data.js';

// Admin mode. The PIN is checked by the database, which hands back a session token.
// The session ends after 15 minutes without a tap, on the server and here.
const KEY = 'bh-admin-v1';
export const ADMIN_IDLE = 15 * 60e3;

try { const a = JSON.parse(localStorage.getItem(KEY)); if (a?.token && Date.now() - a.at < ADMIN_IDLE) Object.assign(S, { adminToken: a.token, adminAt: a.at }); } catch (e) { /* ignore */ }
const keep = () => { try { localStorage.setItem(KEY, JSON.stringify({ token: S.adminToken, at: S.adminAt })); } catch (e) { /* ignore */ } };

export const isAdmin = () => !!S.adminToken && Date.now() - S.adminAt < ADMIN_IDLE;

export async function unlock(pin) {
  const { data, error } = await db.rpc('admin_unlock', { p_pin: pin });
  if (error) return { ok: false, reason: 'offline' };
  if (data.ok) { set({ adminToken: data.token, adminAt: Date.now() }); keep(); }
  return data;
}

export function lock() {
  const t = S.adminToken;
  set({ adminToken: null, adminAt: 0 }); keep();
  if (t) db.rpc('admin_lock', { p_token: t }).then(() => {}, () => {});
}

// Any tap while unlocked keeps the session going. The server is told at most once a minute.
let told = 0;
export function touch() {
  if (!isAdmin()) return;
  S.adminAt = Date.now(); keep();
  if (Date.now() - told > 60e3) {
    told = Date.now();
    db.rpc('admin_touch', { p_token: S.adminToken }).then(({ data }) => { if (data === false) lock(); }, () => {});
  }
}

// Calls a database function that needs Admin. If the session has ended, Admin locks here too.
export async function adminCall(fn, args) {
  if (!isAdmin()) throw Object.assign(new Error('Admin mode is locked'), { locked: true });
  const { data, error } = await db.rpc(fn, { p_token: S.adminToken, ...args });
  if (error) {
    if (error.code === '28000') { lock(); throw Object.assign(new Error('Admin mode locked itself. Unlock it again to save.'), { locked: true }); }
    throw new Error(error.message);
  }
  touch();
  return data;
}

export const changePin = pin => adminCall('admin_change_pin', { p_new: pin });
