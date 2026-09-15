// Isolated browser-verification environment. Never opens production data.
import http from 'node:http';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from '../server.mjs';
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const app = createApp({ dataDir: join(root, '.test-data', 'ui'), backupDir: join(root, '.test-data', 'ui-backups'), pin: '24682468' });
const server = http.createServer(app.handler);
server.listen(4311, '127.0.0.1', () => console.log('Isolated UI verification: http://127.0.0.1:4311'));
process.on('SIGINT', () => { server.close(); app.close(); process.exit(0); });
