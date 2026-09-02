/**
 * Skrypt jednorazowego sprawdzenia i wysyłki nowych wstawek (np. dla GitHub Actions lub cron)
 */

const fs = require('fs');
const path = require('path');

function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.substring(0, idx).trim();
        const val = trimmed.substring(idx + 1).trim().replace(/(^['"]|['"]$)/g, '');
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

loadEnv();

const { TelegramClient } = require('./src/telegram');
const { PostTracker } = require('./src/storage');
const { ReleaseWatcher } = require('./src/watcher');

async function main() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.error('❌ Błąd: Brak TELEGRAM_BOT_TOKEN lub TELEGRAM_CHAT_ID w środowisku.');
    process.exit(1);
  }

  const client = new TelegramClient(token);
  const tracker = new PostTracker();

  const watcher = new ReleaseWatcher({
    client,
    tracker,
    chatId,
    initialSendLimit: 3
  });

  console.log('🚀 Uruchamiam jednorazowe sprawdzenie wstawek...');
  await watcher.checkOnce();
  console.log('🏁 Zakończono sprawdzanie.');
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Nieoczekiwany błąd:', err);
  process.exit(1);
});
