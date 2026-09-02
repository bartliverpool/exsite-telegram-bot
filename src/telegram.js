/**
 * Lekki, wbudowany klient Telegram Bot API (używa natywnego fetch z Node 18+)
 * Działa bez konieczności instalowania zewnętrznych bibliotek npm.
 */

class TelegramClient {
  constructor(token) {
    if (!token) {
      throw new Error('Wymagany jest token bota Telegram!');
    }
    this.token = token;
    this.baseUrl = `https://api.telegram.org/bot${token}`;
    this.isPolling = false;
    this.offset = 0;
    this.commandHandlers = new Map();
  }

  async request(method, body = {}) {
    const url = `${this.baseUrl}/${method}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    if (!data.ok) {
      throw new Error(`Błąd Telegram API [${method}]: ${data.description || 'Nieznany błąd'}`);
    }
    return data.result;
  }

  // Wysłanie wiadomości tekstowej
  async sendMessage(chatId, text, options = {}) {
    return this.request('sendMessage', {
      chat_id: chatId,
      text: text,
      parse_mode: options.parse_mode || 'HTML',
      reply_markup: options.reply_markup,
      disable_web_page_preview: options.disable_web_page_preview ?? false
    });
  }

  // Wysłanie zdjęcia z podpisem i przyciskiem
  async sendPhoto(chatId, photoUrl, options = {}) {
    try {
      return await this.request('sendPhoto', {
        chat_id: chatId,
        photo: photoUrl,
        caption: options.caption || '',
        parse_mode: options.parse_mode || 'HTML',
        reply_markup: options.reply_markup
      });
    } catch (err) {
      // Jeśli Telegram nie może pobrać zdjęcia ze wskazanego hosta, wyślij jako wiadomość tekstową
      console.warn(`⚠️ sendPhoto nie powiodło się dla "${photoUrl}" (${err.message}). Wysyłam tekst z przyciskiem...`);
      return this.sendMessage(chatId, options.caption || '', options);
    }
  }

  // Rejestracja obsługi komendy (np. /start, /filmy)
  onCommand(command, handler) {
    const cleanCmd = command.startsWith('/') ? command.substring(1) : command;
    this.commandHandlers.set(cleanCmd.toLowerCase(), handler);
  }

  // Sprawdzenie poprawności tokena bota
  async getMe() {
    return this.request('getMe');
  }

  // Uruchomienie nasłuchiwania komend (Long Polling)
  startPolling(onMessage) {
    if (this.isPolling) return;
    this.isPolling = true;

    const poll = async () => {
      while (this.isPolling) {
        try {
          const updates = await this.request('getUpdates', {
            offset: this.offset,
            timeout: 25,
            allowed_updates: ['message']
          });

          for (const update of updates) {
            this.offset = update.update_id + 1;
            if (update.message && update.message.text) {
              const msg = update.message;
              const text = msg.text.trim();

              if (text.startsWith('/')) {
                const parts = text.split(/\s+/);
                const cmdWithAt = parts[0].substring(1).toLowerCase();
                const cmd = cmdWithAt.split('@')[0]; // obsługa /komenda@NazwaBota
                const args = parts.slice(1);

                const handler = this.commandHandlers.get(cmd);
                if (handler) {
                  try {
                    await handler(msg, args);
                  } catch (handlerErr) {
                    console.error(`❌ Błąd obsługi komendy /${cmd}:`, handlerErr.message);
                    await this.sendMessage(msg.chat.id, `❌ Wystąpił błąd podczas wykonywania komendy: ${handlerErr.message}`);
                  }
                }
              }

              if (onMessage) {
                try {
                  await onMessage(msg);
                } catch (msgErr) {
                  console.error('❌ Błąd obsługi wiadomości:', msgErr.message);
                }
              }
            }
          }
        } catch (err) {
          if (this.isPolling) {
            console.error('⚠️ Błąd Telegram getUpdates:', err.message);
            // Odczekaj chwilę przed kolejną próbą
            await new Promise(resolve => setTimeout(resolve, 5000));
          }
        }
      }
    };

    poll();
  }

  stopPolling() {
    this.isPolling = false;
  }
}

module.exports = {
  TelegramClient
};
