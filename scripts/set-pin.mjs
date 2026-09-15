import { createInterface } from 'node:readline/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Store } from '../lib/store.mjs';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const rl = createInterface({ input: process.stdin, output: process.stdout });
console.log('This local recovery command changes your PIN and locks existing sessions.');
console.log('Run it privately: typed digits are visible in this terminal.');
try {
  const pin = await rl.question('New PIN (4–12 digits): ');
  const confirm = await rl.question('Repeat PIN: ');
  if (pin !== confirm) throw new Error('PINs do not match. Nothing changed.');
  const store = new Store(process.env.POCKET_DATA_DIR || join(root, 'data'), process.env.POCKET_BACKUP_DIR || join(root, 'backups'));
  try { store.setPin(pin); console.log('PIN saved. You can start Pocket now.'); } finally { store.close(); }
} catch (error) { console.error(error.message); process.exitCode = 1; } finally { rl.close(); }
