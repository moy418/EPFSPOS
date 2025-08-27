import fs from 'fs';
import path from 'path';
import dayjs from 'dayjs';
import cron from 'node-cron';
import { DB_PATH } from './db.js';

const BACKUP_DIR = '/app/backups';

export function scheduleBackups(cronExpr = process.env.BACKUP_CRON || '0 2 * * *') {
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
  cron.schedule(cronExpr, () => {
    try {
      const ts = dayjs().format('YYYYMMDD-HHmmss');
      const dest = path.join(BACKUP_DIR, `pos-${ts}.db`);
      fs.copyFileSync(DB_PATH, dest);
      console.log(`[backup] DB copied to ${dest}`);
    } catch (e) {
      console.error('[backup] failed:', e);
    }
  });
}
