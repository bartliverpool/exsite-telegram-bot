/**
 * Automatyczny monitor nowości na exsite.pl
 */

const { fetchLatestReleases } = require('./parser');
const { formatReleaseMessage } = require('./formatter');

class ReleaseWatcher {
  constructor({ client, tracker, chatId, intervalMinutes = 5, initialSendLimit = 3 }) {
    this.client = client;
    this.tracker = tracker;
    this.chatId = chatId;
    this.intervalMs = Math.max(1, intervalMinutes) * 60 * 1000;
    this.initialSendLimit = initialSendLimit;
    this.timer = null;
    this.isChecking = false;
  }

  async checkOnce() {
    if (this.isChecking) {
      console.log('⏳ Poprzednie sprawdzanie w toku, pomijam...');
      return;
    }

    if (!this.chatId) {
      console.warn('⚠️ Brak TELEGRAM_CHAT_ID w konfiguracji. Automatyczne powiadomienia są wstrzymane.');
      return;
    }

    this.isChecking = true;
    try {
      console.log(`\n🔍 [${new Date().toLocaleTimeString('pl-PL')}] Sprawdzam nowe wstawki na Exsite.pl...`);
      const releases = await fetchLatestReleases();

      // Odwracamy kolejność, aby wysyłać od najstarszej niewysłanej do najnowszej
      const chronological = [...releases].reverse();

      const newReleases = chronological.filter(item => !this.tracker.isSeen(item.guid));

      if (newReleases.length === 0) {
        console.log('✅ Brak nowych wstawek.');
        return;
      }

      console.log(`📢 Znaleziono ${newReleases.length} nowych wstawek.`);

      // Zabezpieczenie przed pierwszym uruchomieniem (gdy baza jest pusta)
      let toSend = newReleases;
      if (this.tracker.count() === 0 && newReleases.length > this.initialSendLimit) {
        console.log(`ℹ️ Pierwsze uruchomienie: wysyłam tylko ${this.initialSendLimit} najnowsze wstawki, resztę oznaczam jako przeczytaną.`);
        // Wszystkie poza ostatnimi `initialSendLimit` oznacz jako przeczytane bez wysyłania
        const skipped = newReleases.slice(0, newReleases.length - this.initialSendLimit);
        for (const item of skipped) {
          this.tracker.markSeen(item.guid);
        }
        toSend = newReleases.slice(newReleases.length - this.initialSendLimit);
      }

      for (const item of toSend) {
        await this.sendRelease(item);
        this.tracker.markSeen(item.guid);
        // Odczekaj 1.5 sekundy między wiadomościami (Telegram rate limits)
        await new Promise(resolve => setTimeout(resolve, 1500));
      }

    } catch (err) {
      console.error('❌ Błąd podczas sprawdzania nowości:', err.message);
    } finally {
      this.isChecking = false;
    }
  }

  async sendRelease(item) {
    const formatted = formatReleaseMessage(item);

    try {
      if (formatted.posterUrl) {
        await this.client.sendPhoto(this.chatId, formatted.posterUrl, {
          caption: formatted.text,
          parse_mode: 'HTML',
          reply_markup: formatted.replyMarkup
        });
      } else {
        await this.client.sendMessage(this.chatId, formatted.text, {
          parse_mode: 'HTML',
          reply_markup: formatted.replyMarkup
        });
      }
      console.log(`  ➕ Wysłano: [${item.sectionLabel}] ${item.title}`);
    } catch (sendErr) {
      console.error(`  ❌ Błąd wysyłki wstawki "${item.title}":`, sendErr.message);
      // Próba wysłania samego tekstu w razie problemów z grafiką
      try {
        await this.client.sendMessage(this.chatId, formatted.text, {
          parse_mode: 'HTML',
          reply_markup: formatted.replyMarkup
        });
        console.log(`  ➕ Wysłano (fallback tekst): ${item.title}`);
      } catch (fallbackErr) {
        console.error(`  ❌ Nie udało się wysłać nawet tekstu:`, fallbackErr.message);
      }
    }
  }

  start() {
    console.log(`⏰ Uruchomiono automatyczny monitor nowości (interwał: ${this.intervalMs / 60000} min).`);
    // Pierwsze sprawdzenie zaraz po uruchomieniu
    this.checkOnce();
    // Kolejne cyklicznie
    this.timer = setInterval(() => this.checkOnce(), this.intervalMs);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      console.log('🛑 Zatrzymano monitor nowości.');
    }
  }
}

module.exports = {
  ReleaseWatcher
};
