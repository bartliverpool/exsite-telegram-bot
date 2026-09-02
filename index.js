const fs = require('fs');
const path = require('path');

// Proste wczytywanie pliku .env (działa bez konieczności instalowania dotenv)
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
const { setupBotCommands } = require('./src/bot');
const { ReleaseWatcher } = require('./src/watcher');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const INTERVAL_MIN = parseInt(process.env.CHECK_INTERVAL_MINUTES, 10) || 5;

console.log('');
console.log('╔══════════════════════════════════════════════════════╗');
console.log('║        🎬  Bot Telegram - Exsite.pl Nowości          ║');
console.log('╚══════════════════════════════════════════════════════╝');
console.log('');

if (!BOT_TOKEN || BOT_TOKEN === 'tutaj_wklej_token_bota') {
  console.error('❌ BŁĄD: Brak tokena bota w pliku .env!');
  console.error('   1. Otwórz plik .env w edytorze.');
  console.error('   2. Wklej token uzyskany od @BotFather jako TELEGRAM_BOT_TOKEN.');
  console.error('   3. Uruchom bota ponownie: npm start\n');
  process.exit(1);
}

const client = new TelegramClient(BOT_TOKEN);
const tracker = new PostTracker();

// Weryfikacja połączenia z botem
client.getMe().then(botInfo => {
  console.log(`🤖 Zalogowano jako: @${botInfo.username} (${botInfo.first_name})`);

  // Konfiguracja komend (/start, /najnowsze, /filmy, /seriale, /szukaj, /chatid)
  setupBotCommands(client);
  client.startPolling();
  console.log('📡 Nasłuchiwanie komend na Telegramie aktywne.');

  // Konfiguracja i start automatycznego monitora nowości
  if (CHAT_ID && CHAT_ID !== 'tutaj_wklej_chat_id') {
    const watcher = new ReleaseWatcher({
      client,
      tracker,
      chatId: CHAT_ID,
      intervalMinutes: INTERVAL_MIN
    });
    watcher.start();
  } else {
    console.log('');
    console.warn('⚠️  UWAGA: Brak skonfigurowanego TELEGRAM_CHAT_ID w pliku .env');
    console.warn('   Komendy bota działają, ale automatyczne powiadomienia są wstrzymane.');
    console.warn('   Napisz /start do swojego bota na Telegramie, aby poznać swoje Chat ID,');
    console.warn('   a następnie wpisz je do .env jako TELEGRAM_CHAT_ID.\n');
  }

  console.log('🟢 Bot działa pomyślnie. Naciśnij Ctrl+C, aby zatrzymać.\n');
}).catch(err => {
  console.error('❌ Błąd połączenia z Telegram API:', err.message);
  console.error('   Upewnij się, że token bota w .env jest poprawny.');
});
