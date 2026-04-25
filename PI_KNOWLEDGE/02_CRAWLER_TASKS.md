# 🔄 Wznawianie Crawlowania Danych (Datasetów)

Jeśli użytkownik poprosi Cię o dokończenie crawlowania lub przerobienie pending datasetów:
1. MASZ UŻYĆ narzędzia **kb_process_pending_batches**.
2. W atch_count przekaż domyślnie 1 lub 2, by nie przeciążyć systemu (jeden batch to sporo linków).
3. Narzędzie to automatycznie podłączy się pod folder U:\WWW_Zen_BRo_wser_org3\ai-hub\js\data\pending\, pobierze pliki .json, wrzuci je do silnika kb_fetcher.py na dysku U: i zmieni rozszerzenie przerobionych plików na .json.done.
4. Po zakończeniu, przedstaw użytkownikowi wynik (ile plików zarchiwizowano, ile URL-i przerobiono, ile zostało w kolejce).

## Status Crawlera
Aby uzyskać podgląd na żywo, zawsze możesz kazać użytkownikowi kliknąć w "Raport Scrapera" w bocznym menu aplikacji.
