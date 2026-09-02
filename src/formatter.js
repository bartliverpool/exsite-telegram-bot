/**
 * Moduł formatowania wiadomości Telegram dla nowości z exsite.pl
 */

function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Przygotowanie sformatowanej wiadomości oraz przycisku inline
 */
function formatReleaseMessage(item) {
  const dateStr = escapeHtml(item.formattedDate);
  const sectionStr = escapeHtml(item.fullSection || item.sectionLabel || 'Brak działu');
  const titleStr = escapeHtml(item.title);
  const plotStr = item.plotSummary ? `\n\n📖 <i>${escapeHtml(item.plotSummary)}</i>` : '';

  // Główna treść wiadomości
  const text = 
`📅 <b>Data i godzina:</b> ${dateStr}
📁 <b>Dział:</b> ${sectionStr}
📌 <b>Tytuł:</b> ${titleStr}${plotStr}`;

  // Przycisk kierujący do wstawki
  const replyMarkup = {
    inline_keyboard: [
      [
        {
          text: '🔗 Przejdź do wstawki',
          url: item.link
        }
      ]
    ]
  };

  return {
    text,
    posterUrl: item.posterUrl,
    replyMarkup
  };
}

/**
 * Formatowanie listy kilku wstawek dla komend /najnowsze, /filmy, /seriale
 */
function formatSummaryList(items, title = 'Najnowsze wstawki na Exsite.pl') {
  if (!items || items.length === 0) {
    return {
      text: `🚫 <b>${escapeHtml(title)}</b>\n\nBrak pozycji do wyświetlenia.`
    };
  }

  let text = `🔥 <b>${escapeHtml(title)}</b>\n━━━━━━━━━━━━━━━━━━━━━━\n\n`;

  const inlineKeyboard = [];

  items.slice(0, 5).forEach((item, index) => {
    const num = index + 1;
    const date = escapeHtml(item.formattedDate);
    const section = escapeHtml(item.fullSection || item.sectionLabel);
    const title = escapeHtml(item.title);

    text += `<b>${num}.</b> 📌 <b>${title}</b>\n`;
    text += `   📁 ${section}\n`;
    text += `   📅 ${date}\n\n`;

    // Skrócony tytuł do przycisku (max 30 znaków)
    let btnTitle = item.title.split('|')[0].split('/')[0].trim();
    if (btnTitle.length > 25) btnTitle = btnTitle.substring(0, 22) + '...';

    inlineKeyboard.push([
      {
        text: `🔗 [${num}] ${btnTitle}`,
        url: item.link
      }
    ]);
  });

  text += `━━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `💡 Kliknij przycisk poniżej, aby otworzyć wybraną pozycję.`;

  return {
    text,
    replyMarkup: {
      inline_keyboard: inlineKeyboard
    }
  };
}

module.exports = {
  formatReleaseMessage,
  formatSummaryList,
  escapeHtml
};
