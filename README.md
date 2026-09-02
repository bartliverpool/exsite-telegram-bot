# 🎬 Exsite.pl Telegram Bot

Bot na Telegrama, który monitoruje nowo dodane filmy i seriale na portalu **exsite.pl** i wysyła powiadomienia na czat lub kanał wraz z datą, godziną publikacji, plakatem, działem i przyciskiem do bezpośredniego przejścia do wstawki.

---

## 🚀 Możliwości bota

- ⏱ **Automatyczny monitor nowości:** co 5 minut sprawdza serwis exsite.pl i wysyła każdą nową wstawkę (filmy i seriale).
- 📅 **Dokładna data i godzina:** czas publikacji wstawki w strefie polskiej (np. `02.09.2026, 18:57`).
- 📁 **Kategoria i dział:** informacja czy to film, serial i jaka jakość (np. `🎬 Filmy • BDRip | BRRip | NF` lub `📺 Seriale • Lektor | Dubbing`).
- 🖼 **Plakaty:** automatyczne pobieranie okładki/plakatu i wysyłanie jako zdjęcie z podpisem.
- 🔘 **Przycisk pod wiadomością:** elegancki przycisk `[ 🔗 Przejdź do wstawki ]` kierujący bezpośrednio do wpisu na exsite.pl.
- 🚫 **Brak duplikatów:** historia wysłanych pozycji zapisywana jest w `data/seen_posts.json`.
- 💬 **Komendy na żądanie:**
  - `/start` – informacje o bocie
  - `/najnowsze` – lista ostatnich 5 wstawek
  - `/filmy` – najnowsze wydania filmowe
  - `/seriale` – najnowsze seriale
  - `/szukaj <fraza>` – wyszukiwarka po tytule
  - `/chatid` – wyświetlenie ID czatu

---

## ⚙️ Konfiguracja (.env)

Plik `.env` zawiera podstawowe ustawienia:

```env
# Token Twojego bota Telegram od @BotFather
TELEGRAM_BOT_TOKEN=twoj_token_bota

# ID Twojego czatu lub kanału
TELEGRAM_CHAT_ID=twoje_chat_id

# Częstotliwość sprawdzania nowości w minutach (domyślnie 5)
CHECK_INTERVAL_MINUTES=5
```

---

## 🏁 Uruchomienie

Projekt nie wymaga instalowania żadnych zewnętrznych bibliotek (działa na natywnym `fetch` w Node.js 18+).

### 1. Tryb ciągły (24/7):
```bash
node index.js
```
Bot będzie działał w tle, nasłuchiwał komend i automatycznie wysyłał nowe wstawki co 5 minut.

### 2. Jednorazowe sprawdzenie (np. cron):
```bash
node run-once.js
```

### 3. Działanie w tle na serwerze / Macu (PM2):
```bash
npx pm2 start index.js --name "exsite-bot"
```

### 4. GitHub Actions (darmowe działanie w chmurze bez włączonego komputera):
W repozytorium znajduje się skonfigurowany plik `.github/workflows/check-releases.yml`. Wystarczy dodać w ustawieniach repozytorium (Settings -> Secrets and variables -> Actions) dwa sekrety:
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`
GitHub Actions będzie uruchamiał bota automatycznie co 30 minut.
