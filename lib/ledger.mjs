import { randomUUID } from 'node:crypto';

export const ZONE = 'Africa/Cairo';
export const MAX_MONEY = 100_000_000; // 1 million in major units, stored as integer minor units.
export const CURRENCIES = {
  EGP: 'Egyptian pound', USD: 'US dollar', EUR: 'Euro', GBP: 'British pound',
  SAR: 'Saudi riyal', AED: 'UAE dirham', KWD: 'Kuwaiti dinar', BHD: 'Bahraini dinar',
  QAR: 'Qatari riyal', JOD: 'Jordanian dinar', MAD: 'Moroccan dirham', DZD: 'Algerian dinar',
  TND: 'Tunisian dinar', LYD: 'Libyan dinar', SDG: 'Sudanese pound', TRY: 'Turkish lira',
  INR: 'Indian rupee', PKR: 'Pakistani rupee', PHP: 'Philippine peso', CAD: 'Canadian dollar',
  AUD: 'Australian dollar', JPY: 'Japanese yen'
};
export const validCurrency = code => typeof code === 'string' && Object.hasOwn(CURRENCIES, code);
export const currencyLabel = code => (validCurrency(code) ? `${code} · ${CURRENCIES[code]}` : 'EGP · Egyptian pound');
export class UserError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}
export function fail(condition, message, status) { if (!condition) throw new UserError(message, status); }
export function money(value, allowZero = false) {
  fail(typeof value === 'string' && /^\d{1,7}(\.\d{1,2})?$/.test(value.trim()), 'Enter a valid amount with up to two decimal places.');
  const [whole, fraction = ''] = value.trim().split('.');
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  fail(cents <= MAX_MONEY && (allowZero ? cents >= 0 : cents > 0), `Enter an amount ${allowZero ? 'from 0' : 'above 0'} and no more than 1,000,000.`);
  return cents;
}
export function cleanText(value = '', max = 500) {
  fail(typeof value === 'string' && value.length <= max, `Text must be ${max} characters or fewer.`);
  return value.trim();
}
export function initialState() {
  return { schema: 1, revision: 0, initialized: false, currency: null, categories: [
    { id: 'lessons', name: 'Lessons', color: '#ac9af7', icon: 'book', subjects: true, archived: false },
    { id: 'transport', name: 'Transport', color: '#71b6f9', icon: 'bus', subjects: false, archived: false },
    { id: 'food', name: 'Food', color: '#f1ba77', icon: 'food', subjects: false, archived: false }
  ], subjects: [{ id: 'chemistry', name: 'Chemistry', archived: false }], transactions: [] };
}
export function effect(t) { return t.type === 'expense' ? -t.amount : t.amount; }
export function balance(state) { return state.transactions.reduce((sum, t) => sum + effect(t), 0); }
export function refunded(state, id) { return state.transactions.filter(t => t.type === 'refund' && t.expenseId === id).reduce((sum, t) => sum + t.amount, 0); }
export function dateKey(iso = new Date().toISOString()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso));
}
export function shiftDate(key, days) { const date = new Date(key + 'T12:00:00Z'); date.setUTCDate(date.getUTCDate() + days); return date.toISOString().slice(0, 10); }
export function validDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}
export function periodRange(period = 'week', from, to, now = new Date().toISOString()) {
  const today = dateKey(now);
  if (period === 'today') return { from: today, to: today, label: 'Today' };
  if (period === 'month') return { from: today.slice(0, 7) + '-01', to: today, label: 'This month' };
  if (period === 'all') return { from: '0001-01-01', to: today, label: 'All time' };
  if (period === 'custom') {
    fail(validDate(from) && validDate(to) && from <= to, 'Choose a valid start and end date.');
    return { from, to, label: 'Custom range' };
  }
  fail(period === 'week', 'Unknown period.');
  const weekday = new Date(today + 'T12:00:00Z').getUTCDay();
  return { from: shiftDate(today, -weekday), to: shiftDate(today, 6 - weekday), label: 'This week' };
}
function selectedCategory(state, id, subjectId, old) {
  const category = state.categories.find(c => c.id === id);
  fail(category && (!category.archived || old?.categoryId === id), 'Choose an active category.');
  if (subjectId) {
    const subject = state.subjects.find(s => s.id === subjectId);
    fail(category.subjects && subject && (!subject.archived || old?.subjectId === subjectId), 'Choose an active lesson subject.');
  }
  return { categoryId: id, subjectId: category.subjects ? (subjectId || null) : null };
}
export function validateState(state) {
  fail(state && state.schema === 1 && Number.isSafeInteger(state.revision) && state.revision >= 0 && typeof state.initialized === 'boolean', 'Unsupported or invalid backup format.');
  if (state.currency == null && !state.initialized) state.currency = null;
  else { if (state.currency == null) state.currency = 'EGP'; fail(validCurrency(state.currency), 'Unknown currency.'); }
  fail(Array.isArray(state.categories) && state.categories.length <= 200 && Array.isArray(state.subjects) && state.subjects.length <= 200 && Array.isArray(state.transactions) && state.transactions.length <= 100_000, 'Invalid or oversized data.');
  const ids = new Set();
  const checkId = id => { fail(typeof id === 'string' && /^[a-zA-Z0-9-]{1,80}$/.test(id) && !ids.has(id), 'Invalid or duplicate record ID.'); ids.add(id); };
  for (const list of [state.categories, state.subjects]) {
    const names = new Set();
    for (const item of list) {
      checkId(item.id); fail(cleanText(item.name, 40).length > 0 && typeof item.archived === 'boolean', 'Invalid category or subject.');
      fail(!names.has(item.name.toLowerCase()), 'Category and subject names must be unique.'); names.add(item.name.toLowerCase());
    }
  }
  for (const c of state.categories) fail(/^#[0-9a-fA-F]{6}$/.test(c.color) && typeof c.subjects === 'boolean' && ['book', 'bus', 'food', 'tag'].includes(c.icon), 'Invalid category appearance.');
  let cash = 0, previousTime = '', openingCount = 0;
  const seen = new Map();
  const returns = new Map();
  for (const t of state.transactions) {
    checkId(t.id);
    fail(['opening', 'income', 'expense', 'refund', 'adjustment'].includes(t.type), 'Invalid transaction type.');
    fail(Number.isSafeInteger(t.amount) && Math.abs(t.amount) <= MAX_MONEY && (['opening', 'adjustment'].includes(t.type) || t.amount > 0) && (t.type === 'adjustment' || t.amount >= 0), 'Invalid transaction amount.');
    fail(typeof t.createdAt === 'string' && !Number.isNaN(Date.parse(t.createdAt)) && new Date(t.createdAt).toISOString() === t.createdAt && t.createdAt >= previousTime, 'Invalid transaction date or order.');
    previousTime = t.createdAt; cleanText(t.description, 500);
    if (t.type === 'opening') { openingCount++; fail(seen.size === 0, 'Opening balance must be first.'); }
    if (t.type === 'expense') {
      const c = state.categories.find(c => c.id === t.categoryId);
      fail(c && (!t.subjectId || (c.subjects && state.subjects.some(s => s.id === t.subjectId))), 'Expense has an unknown category or subject.');
    }
    if (t.type === 'refund') {
      const original = seen.get(t.expenseId);
      fail(original?.type === 'expense', 'Refund must follow its original expense.');
      const total = (returns.get(t.expenseId) || 0) + t.amount;
      fail(total <= original.amount, 'Refunds cannot exceed the original expense.'); returns.set(t.expenseId, total);
    }
    cash += effect(t);
    fail(Number.isSafeInteger(cash) && cash >= 0 && cash <= MAX_MONEY, 'This change would leave a negative or oversized cash balance. Add missing money or correct related records first.');
    seen.set(t.id, t);
  }
  fail(state.initialized ? openingCount === 1 : state.transactions.length === 0, 'Invalid opening balance.');
  return state;
}
export function mutate(source, action, input, now = new Date().toISOString()) {
  const state = structuredClone(source);
  fail(input && typeof input === 'object' && !Array.isArray(input), 'Invalid request.');
  fail(input.revision === state.revision, 'Your data changed on another screen. Refresh and try again.', 409);
  const add = data => {
    const timestamp = state.transactions.at(-1)?.createdAt > now ? state.transactions.at(-1).createdAt : now;
    const t = { id: randomUUID(), createdAt: timestamp, description: '', ...data };
    state.transactions.push(t); return t;
  };
  if (action === 'opening') {
    fail(!state.initialized, 'Opening balance has already been set.');
    const code = input.currency ?? state.currency ?? 'EGP';
    fail(validCurrency(code), 'Choose a valid currency.');
    state.currency = code;
    add({ type: 'opening', amount: money(input.amount, true), description: 'Opening cash balance' }); state.initialized = true;
  } else {
    fail(state.initialized, 'Set your opening balance first.');
    if (action === 'currency') {
      fail(validCurrency(input.currency), 'Choose a valid currency.');
      fail(input.currency !== state.currency, 'This currency is already selected.');
      state.currency = input.currency;
    } else if (action === 'expense' || action === 'income') {
      const amount = money(input.amount);
      if (action === 'expense') fail(amount <= balance(state), 'Not enough cash. This expense exceeds your available balance.');
      add({ type: action, amount, description: cleanText(input.description), ...(action === 'expense' ? selectedCategory(state, input.categoryId, input.subjectId) : {}) });
    } else if (action === 'adjust') {
      const target = money(input.amount, true), amount = target - balance(state);
      fail(amount !== 0, 'Your balance is already this amount.');
      add({ type: 'adjustment', amount, description: cleanText(input.description) || 'Cash balance corrected' });
    } else if (action === 'refund') {
      const original = state.transactions.find(t => t.id === input.expenseId && t.type === 'expense');
      fail(original, 'Original expense not found.');
      const amount = money(input.amount);
      fail(amount <= original.amount - refunded(state, original.id), 'This refund exceeds the amount still refundable.');
      add({ type: 'refund', amount, expenseId: original.id, description: cleanText(input.description) });
    } else if (action === 'edit' || action === 'delete') {
      const index = state.transactions.findIndex(t => t.id === input.id), old = state.transactions[index];
      fail(old && old.type !== 'opening', 'This record cannot be changed. Use Edit balance for opening cash.');
      if (action === 'delete') {
        fail(old.type !== 'expense' || refunded(state, old.id) === 0, 'Delete linked refunds before deleting this expense.'); state.transactions.splice(index, 1);
      } else {
        fail(old.type !== 'adjustment', 'Use Edit balance to make another correction.');
        const amount = money(input.amount);
        if (old.type === 'expense') fail(amount >= refunded(state, old.id), 'The expense cannot be smaller than its refunds.');
        state.transactions[index] = { ...old, amount, description: cleanText(input.description), ...(old.type === 'expense' ? selectedCategory(state, input.categoryId, input.subjectId, old) : {}) };
      }
    } else if (action === 'taxonomy') {
      fail(['category', 'subject'].includes(input.kind), 'Unknown category type.');
      const list = input.kind === 'category' ? state.categories : state.subjects;
      if (input.operation === 'add') {
        fail(list.length < 200, 'You have reached the limit of 200 items.');
        const name = cleanText(input.name, 40); fail(name.length > 0, 'Enter a name.');
        list.push({ id: randomUUID(), name, archived: false, ...(input.kind === 'category' ? { color: input.color || '#75dbc6', icon: 'tag', subjects: false } : {}) });
      } else {
        const index = list.findIndex(i => i.id === input.id), item = list[index]; fail(item, 'Item not found.');
        if (input.operation === 'rename') { item.name = cleanText(input.name, 40); fail(item.name.length > 0, 'Enter a name.'); }
        else if (input.operation === 'archive') item.archived = true;
        else if (input.operation === 'unarchive') item.archived = false;
        else if (input.operation === 'delete') {
          fail(!state.transactions.some(t => input.kind === 'category' ? t.categoryId === item.id : t.subjectId === item.id), 'This item has history. Archive it instead.');
          list.splice(index, 1);
        } else throw new UserError('Unknown category action.');
      }
    } else throw new UserError('Unknown action.');
  }
  state.revision++;
  return validateState(state);
}
export function decorate(state, t) {
  const original = t.type === 'refund' ? state.transactions.find(x => x.id === t.expenseId) : t;
  const category = state.categories.find(c => c.id === original?.categoryId);
  const subject = state.subjects.find(s => s.id === original?.subjectId);
  return { ...t, categoryId: category?.id || null, category: category?.name || null, color: category?.color || '#75dbc6', icon: category?.icon || (t.type === 'income' ? 'plus' : 'wallet'), subjectId: subject?.id || null, subject: subject?.name || null, effect: effect(t), refundable: t.type === 'expense' ? t.amount - refunded(state, t.id) : 0, refunded: t.type === 'expense' ? refunded(state, t.id) : 0 };
}
export function history(state, filters = {}) {
  let rows = state.transactions.map(t => decorate(state, t)).reverse();
  const query = String(filters.q || '').trim().toLowerCase();
  rows = rows.filter(t => (!query || [t.description, t.category, t.subject, t.type].some(v => v?.toLowerCase().includes(query))) && (!filters.type || t.type === filters.type) && (!filters.category || t.categoryId === filters.category) && (!filters.subject || t.subjectId === filters.subject) && (!filters.from || dateKey(t.createdAt) >= filters.from) && (!filters.to || dateKey(t.createdAt) <= filters.to));
  const total = rows.length;
  const offset = Math.max(0, Number(filters.offset) || 0);
  return { rows: rows.slice(offset, offset + 50), total };
}
export function analytics(state, filters = {}, now) {
  const range = periodRange(filters.period, filters.from, filters.to, now);
  const today = dateKey(now), byDay = new Map(), categories = new Map(), subjects = new Map();
  let gross = 0, refunds = 0, income = 0, count = 0, running = 0, before = 0;
  const balanceDays = new Map();
  for (const t of state.transactions) {
    const day = dateKey(t.createdAt); running += effect(t);
    if (day < range.from) before = running;
    if (day < range.from || day > range.to) continue;
    balanceDays.set(day, running);
    if (t.type === 'income') income += t.amount;
    if (!['expense', 'refund'].includes(t.type)) continue;
    const d = decorate(state, t), amount = t.type === 'expense' ? t.amount : -t.amount;
    if (t.type === 'expense') { gross += t.amount; count++; } else refunds += t.amount;
    byDay.set(day, (byDay.get(day) || 0) + amount);
    categories.set(d.categoryId, (categories.get(d.categoryId) || 0) + amount);
    if (d.subjectId) subjects.set(d.subjectId, (subjects.get(d.subjectId) || 0) + amount);
  }
  const firstDate = range.from === '0001-01-01' ? (state.transactions[0] ? dateKey(state.transactions[0].createdAt) : today) : range.from;
  const trackingStarted = state.transactions[0] ? dateKey(state.transactions[0].createdAt) : null;
  const end = range.to > today ? today : range.to;
  const daily = [], cash = [];
  let lastBalance = before;
  // Aggregate long histories by month to bound the chart payload.
  const span = Math.max(0, Math.round((Date.parse(end) - Date.parse(firstDate)) / 86_400_000));
  const monthly = span > 120;
  if (firstDate <= end) {
    if (!monthly) {
      for (let d = firstDate; d <= end; d = shiftDate(d, 1)) {
        if (balanceDays.has(d)) lastBalance = balanceDays.get(d);
        daily.push({ date: d, amount: byDay.get(d) || 0 });
        if (trackingStarted && d >= trackingStarted) cash.push({ date: d, amount: lastBalance });
      }
    } else {
      const monthSpending = new Map(), monthCash = new Map();
      for (const [d, v] of byDay) monthSpending.set(d.slice(0, 7), (monthSpending.get(d.slice(0, 7)) || 0) + v);
      for (const [d, v] of balanceDays) monthCash.set(d.slice(0, 7), v);
      let d = firstDate.slice(0, 7) + '-01';
      while (d <= end && daily.length < 2400) {
        const m = d.slice(0, 7); if (monthCash.has(m)) lastBalance = monthCash.get(m);
        daily.push({ date: d, amount: monthSpending.get(m) || 0 });
        if (trackingStarted && m >= trackingStarted.slice(0, 7)) cash.push({ date: d, amount: lastBalance });
        const next = new Date(d + 'T12:00:00Z'); next.setUTCMonth(next.getUTCMonth() + 1); d = next.toISOString().slice(0, 10);
      }
    }
  }
  const breakdown = state.categories.filter(c => categories.has(c.id)).map(c => ({ ...c, amount: categories.get(c.id) })).sort((a, b) => b.amount - a.amount);
  const subjectBreakdown = state.subjects.filter(s => subjects.has(s.id)).map(s => ({ ...s, amount: subjects.get(s.id) })).sort((a, b) => b.amount - a.amount);
  return { range, balance: balance(state), spent: gross - refunds, gross, refunds, income, count, categories: breakdown, subjects: subjectBreakdown, daily, cash, monthly, biggest: breakdown.find(c => c.amount > 0) || null };
}
