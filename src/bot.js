/**
 * Konfiguracja i obsługa komend bota Telegram
 */

const { fetchLatestReleases, fetchLatestMovies, fetchLatestSeries } = require('./parser');
const { formatSummaryList, formatReleaseMessage } = require('./formatter');

function setupBotCommands(client) {
  // /start
  client.onCommand('start', async (msg) => {
    const chatId = msg.chat.id;
    const welcomeText = 
`👋 <b>Cześć! Jestem botem Exsite.pl</b>

Informuję o najnowszych filmach i serialach dodawanych na stronę.

📌 <b>Dostępne komendy:</b>
▶️ /najnowsze – lista 5 ostatnich wstawek (filmy i seriale)
▶️ /filmy – najnowsze wydania filmowe
▶️ /seriale – najnowsze odcinki i sezony seriali
▶️ /szukaj &lt;nazwa&gt; – wyszukiwanie w najświeższych wstawkach
▶️ /chatid – sprawdź ID tego czatu

💡 <i>Twoje Chat ID:</i> <code>${chatId}</code>`;

    await client.sendMessage(chatId, welcomeText);
  });

  // /chatid
  client.onCommand('chatid', async (msg) => {
    const chatId = msg.chat.id;
    await client.sendMessage(
      chatId, 
      `💡 Twoje Chat ID: <code>${chatId}</code>\n\nMożesz wpisać je do pliku <code>.env</code> jako <code>TELEGRAM_CHAT_ID</code>.`
    );
  });

  // /najnowsze
  client.onCommand('najnowsze', async (msg) => {
    const chatId = msg.chat.id;
    await client.sendMessage(chatId, '⏳ Pobieram najnowsze wstawki z Exsite.pl...');

    try {
      const items = await fetchLatestReleases();
      const summary = formatSummaryList(items, 'Ostatnie wstawki (Filmy i Seriale)');
      await client.sendMessage(chatId, summary.text, { reply_markup: summary.replyMarkup });
    } catch (err) {
      await client.sendMessage(chatId, `❌ Błąd podczas pobierania danych: ${err.message}`);
    }
  });

  // /filmy
  client.onCommand('filmy', async (msg) => {
    const chatId = msg.chat.id;
    await client.sendMessage(chatId, '⏳ Pobieram najnowsze filmy...');

    try {
      const items = await fetchLatestMovies();
      const summary = formatSummaryList(items, 'Najnowsze Filmy na Exsite.pl');
      await client.sendMessage(chatId, summary.text, { reply_markup: summary.replyMarkup });
    } catch (err) {
      await client.sendMessage(chatId, `❌ Błąd podczas pobierania filmów: ${err.message}`);
    }
  });

  // /seriale
  client.onCommand('seriale', async (msg) => {
    const chatId = msg.chat.id;
    await client.sendMessage(chatId, '⏳ Pobieram najnowsze seriale...');

    try {
      const items = await fetchLatestSeries();
      const summary = formatSummaryList(items, 'Najnowsze Seriale na Exsite.pl');
      await client.sendMessage(chatId, summary.text, { reply_markup: summary.replyMarkup });
    } catch (err) {
      await client.sendMessage(chatId, `❌ Błąd podczas pobierania seriali: ${err.message}`);
    }
  });

  // /szukaj <fraza>
  client.onCommand('szukaj', async (msg, args) => {
    const chatId = msg.chat.id;
    const query = args.join(' ').trim().toLowerCase();

    if (!query) {
      return client.sendMessage(chatId, 'ℹ️ Podaj tytuł do wyszukania, np:\n<code>/szukaj Gladiator</code>');
    }

    await client.sendMessage(chatId, `🔎 Szukam "${query}" w najnowszych wstawkach...`);

    try {
      const allItems = await fetchLatestReleases();
      const matched = allItems.filter(item => 
        item.title.toLowerCase().includes(query) || 
        (item.category && item.category.toLowerCase().includes(query))
      );

      if (matched.length === 0) {
        return client.sendMessage(chatId, `🚫 Nie znaleziono pozycji pasujących do "<b>${query}</b>" w ostatnich wstawkach.`);
      }

      const summary = formatSummaryList(matched, `Wyniki wyszukiwania dla: "${query}"`);
      await client.sendMessage(chatId, summary.text, { reply_markup: summary.replyMarkup });
    } catch (err) {
      await client.sendMessage(chatId, `❌ Błąd wyszukiwania: ${err.message}`);
    }
  });
}

module.exports = {
  setupBotCommands
};
