/**
 * Parser kanałów RSS serwisu exsite.pl
 */

const RSS_FEEDS = [
  { url: 'https://exsite.pl/filmy-movies/rss.xml', type: 'film', section: '🎬 Filmy' },
  { url: 'https://exsite.pl/seriale/rss.xml', type: 'serial', section: '📺 Seriale' },
  { url: 'https://exsite.pl/index.php?mod=rss', type: 'all', section: '🔥 Nowości' }
];

// Dekodowanie encji HTML
function decodeEntities(str) {
  if (!str) return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(code))
    .trim();
}

// Wyciąganie zawartości tagu (np. <title>...</title> lub <![CDATA[...]]>)
function getTagContent(xml, tagName) {
  const regex = new RegExp(`<${tagName}[^>]*>(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([\\s\\S]*?))<\\/${tagName}>`, 'i');
  const match = xml.match(regex);
  if (!match) return '';
  return decodeEntities((match[1] !== undefined ? match[1] : match[2]) || '');
}

// Formatowanie daty na czas polski (Europe/Warsaw)
function formatPublishDate(dateString) {
  if (!dateString) return 'Brak daty';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;

    const formatter = new Intl.DateTimeFormat('pl-PL', {
      timeZone: 'Europe/Warsaw',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    return formatter.format(date);
  } catch (err) {
    return dateString;
  }
}

// Wyciąganie linku do plakatu z opisu HTML
function extractPosterUrl(html) {
  if (!html) return null;
  const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi;
  let match;
  while ((match = imgRegex.exec(html)) !== null) {
    let src = match[1].trim();
    if (src.startsWith('//')) {
      src = 'https:' + src;
    }
    // Ignoruj ikonki, emotikony i miniatury reklamowe
    if (!src.includes('emoticons') && !src.includes('smiles') && !src.includes('/templates/')) {
      return src;
    }
  }
  return null;
}

// Wyciąganie czystego tekstu opisu (gatunek, produkcja, krótki zarys)
function extractPlotSummary(html) {
  if (!html) return '';
  // Usuń tagi <style>, <script>, <img>
  let text = html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<img[^>]*>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?[^>]+(>|$)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Wytnij pierwsze 180 znaków
  if (text.length > 200) {
    text = text.substring(0, 197) + '...';
  }
  return text;
}

// Parsowanie pojedynczego bloku <item>...</item>
function parseItem(itemXml) {
  const title = getTagContent(itemXml, 'title');
  const link = getTagContent(itemXml, 'link');
  const guid = getTagContent(itemXml, 'guid') || link;
  const rawCategory = getTagContent(itemXml, 'category');
  const pubDateRaw = getTagContent(itemXml, 'pubDate');
  const descriptionRaw = getTagContent(itemXml, 'description');
  const turboContent = getTagContent(itemXml, 'turbo:content');
  const contentEncoded = getTagContent(itemXml, 'content:encoded');

  const fullContent = `${descriptionRaw} ${turboContent} ${contentEncoded}`;
  const posterUrl = extractPosterUrl(fullContent);
  const formattedDate = formatPublishDate(pubDateRaw);
  const plotSummary = extractPlotSummary(descriptionRaw);

  // Rozpoznanie czy to film, czy serial
  let sectionType = 'inne';
  let sectionLabel = '📁 Inne';

  if (link.includes('/filmy-movies/') || rawCategory.toLowerCase().includes('film') || rawCategory.toLowerCase().includes('bdrip')) {
    sectionType = 'film';
    sectionLabel = '🎬 Filmy';
  } else if (link.includes('/seriale/') || rawCategory.toLowerCase().includes('serial')) {
    sectionType = 'serial';
    sectionLabel = '📺 Seriale';
  }

  const fullSection = rawCategory ? `${sectionLabel} • ${rawCategory}` : sectionLabel;

  return {
    guid,
    title,
    link,
    pubDateRaw,
    formattedDate,
    sectionType,
    sectionLabel,
    fullSection,
    category: rawCategory,
    posterUrl,
    plotSummary
  };
}

// Pobieranie i parsowanie feedu RSS
async function fetchRssFeed(url = 'https://exsite.pl/index.php?mod=rss') {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/rss+xml, application/xml, text/xml, */*'
  };

  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`Błąd HTTP ${response.status} podczas pobierania feedu RSS: ${url}`);
  }

  const xmlText = await response.text();
  const itemMatches = xmlText.match(/<item[\s\S]*?<\/item>/gi) || [];

  const items = itemMatches.map(parseItem);
  return items;
}

// Pobranie tylko najnowszych filmów i seriali (z pominięciem programów/gier itp.)
async function fetchLatestReleases() {
  const allItems = await fetchRssFeed('https://exsite.pl/index.php?mod=rss');
  // Filtrujemy tylko filmy i seriale
  return allItems.filter(item => item.sectionType === 'film' || item.sectionType === 'serial');
}

// Pobranie konkretnie najnowszych filmów
async function fetchLatestMovies() {
  return fetchRssFeed('https://exsite.pl/filmy-movies/rss.xml');
}

// Pobranie konkretnie najnowszych seriali
async function fetchLatestSeries() {
  return fetchRssFeed('https://exsite.pl/seriale/rss.xml');
}

module.exports = {
  fetchRssFeed,
  fetchLatestReleases,
  fetchLatestMovies,
  fetchLatestSeries,
  formatPublishDate,
  parseItem
};
