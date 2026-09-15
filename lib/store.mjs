import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, writeFileSync, renameSync, readFileSync, readdirSync, unlinkSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { initialState, validateState, mutate, fail } from './ledger.mjs';

export const WEEK = 7 * 24 * 60 * 60 * 1000;
export const SESSION_DURATION = 24 * 60 * 60 * 1000;
const digest = value => createHash('sha256').update(value).digest('hex');
export class Store {
  constructor(directory, backupDirectory, { pin, now = () => Date.now() } = {}) {
    this.directory = directory; this.backupDirectory = backupDirectory; this.now = now;
    mkdirSync(directory, { recursive: true }); mkdirSync(backupDirectory, { recursive: true });
    this.db = new DatabaseSync(join(directory, 'pocket.sqlite'));
    this.db.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT NOT NULL); CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, expires INTEGER NOT NULL);');
    if (!this.get('state')) this.set('state', initialState());
    if (!this.get('auth') && pin) this.setPin(pin);
    this.authReady = Boolean(this.get('auth'));
    validateState(this.state());
  }
  get(key) { const row = this.db.prepare('SELECT value FROM kv WHERE key = ?').get(key); return row ? JSON.parse(row.value) : null; }
  set(key, value) { this.db.prepare('INSERT INTO kv (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(key, JSON.stringify(value)); }
  state() { return this.get('state'); }
  setPin(pin) {
    fail(typeof pin === 'string' && /^\d{4,12}$/.test(pin), 'PIN must contain 4–12 digits.');
    const salt = randomBytes(24).toString('hex');
    this.set('auth', { salt, hash: scryptSync(pin, salt, 64).toString('hex') });
    this.db.exec('DELETE FROM sessions'); this.authReady = true;
  }
  checkPin(pin) {
    const auth = this.get('auth');
    if (!auth || typeof pin !== 'string' || !/^\d{4,12}$/.test(pin)) return false;
    return timingSafeEqual(scryptSync(pin, auth.salt, 64), Buffer.from(auth.hash, 'hex'));
  }
  session() {
    const token = randomBytes(32).toString('hex'), expires = this.now() + SESSION_DURATION;
    this.db.prepare('DELETE FROM sessions WHERE expires <= ?').run(this.now());
    this.db.prepare('INSERT INTO sessions (token,expires) VALUES (?,?)').run(digest(token), expires);
    return { token, expires };
  }
  authenticated(token) { return typeof token === 'string' && /^[a-f0-9]{64}$/.test(token) && Boolean(this.db.prepare('SELECT token FROM sessions WHERE token=? AND expires>?').get(digest(token), this.now())); }
  logout(token) { if (token) this.db.prepare('DELETE FROM sessions WHERE token=?').run(digest(token)); }
  update(action, input) {
    this.db.exec('BEGIN IMMEDIATE');
    try { const state = mutate(this.state(), action, input, new Date(this.now()).toISOString()); this.set('state', state); this.db.exec('COMMIT'); return state; }
    catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  backup(kind = 'manual') {
    fail(['manual', 'weekly', 'before-restore'].includes(kind), 'Invalid backup type.');
    const data = this.state(), createdAt = new Date(this.now()).toISOString();
    const backup = { app: 'Pocket', format: 1, createdAt, checksum: digest(JSON.stringify(data)), data };
    const name = `${kind}-${createdAt.replace(/[:.]/g, '-')}-${randomBytes(3).toString('hex')}.json`;
    const dest = join(this.backupDirectory, name);
    writeFileSync(dest + '.tmp', JSON.stringify(backup, null, 2), { flag: 'wx' }); renameSync(dest + '.tmp', dest);
    if (kind === 'weekly') {
      this.set('lastWeekly', this.now());
      const weekly = this.backups().filter(b => b.kind === 'weekly');
      for (const extra of weekly.slice(8)) unlinkSync(join(this.backupDirectory, extra.name));
    }
    return { name, backup };
  }
  weekly() {
    const last = this.get('lastWeekly');
    if (last === null || this.now() - last >= WEEK) return this.backup('weekly');
    return null;
  }
  backups() {
    return readdirSync(this.backupDirectory).filter(name => /^(manual|weekly|before-restore)-[\w-]+\.json$/.test(name)).sort().reverse().map(name => ({ name, kind: name.startsWith('before-restore') ? 'before-restore' : name.split('-')[0], createdAt: this.backupDate(name) })).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  backupDate(name) {
    const match = name.match(/(\d{4}-\d\d-\d\d)T(\d\d)-(\d\d)-(\d\d)-(\d{3})Z/);
    return match ? `${match[1]}T${match[2]}:${match[3]}:${match[4]}.${match[5]}Z` : '';
  }
  readBackup(name) {
    fail(typeof name === 'string' && /^(manual|weekly|before-restore)-[\w-]+\.json$/.test(name), 'Invalid backup name.');
    const path = join(this.backupDirectory, name); fail(existsSync(path), 'Backup not found.', 404);
    return JSON.parse(readFileSync(path, 'utf8'));
  }
  restore(backup, revision) {
    fail(backup && backup.app === 'Pocket' && backup.format === 1 && backup.data && digest(JSON.stringify(backup.data)) === backup.checksum, 'This is not a valid Pocket backup, or the file is damaged.');
    const restored = structuredClone(backup.data); validateState(restored);
    fail(revision === this.state().revision, 'Data changed. Refresh before restoring.', 409);
    this.backup('before-restore');
    restored.revision = revision + 1;
    this.db.exec('BEGIN IMMEDIATE');
    try { this.set('state', restored); this.db.exec('COMMIT'); } catch (error) { this.db.exec('ROLLBACK'); throw error; }
    return restored;
  }
  backupStatus() { const last = this.get('lastWeekly'); return { lastWeekly: last ? new Date(last).toISOString() : null, nextWeekly: last ? new Date(last + WEEK).toISOString() : null, items: this.backups(), error: this.backupError || null }; }
  close() { this.db.close(); }
}
