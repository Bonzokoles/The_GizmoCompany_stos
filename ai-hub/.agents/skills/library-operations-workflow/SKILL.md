---
name: library-operations-workflow
description: Użyj do operacji na bibliotekach wiedzy: tworzenie, aktualizacja, kategoryzacja, import/export, walidacja struktury i synchronizacja z dashboardem.
---

# Library Operations Workflow

## Kiedy używać

- Gdy dodajesz/aktualizujesz biblioteki wiedzy i ich metadane
- Gdy trzeba zbudować przepływ importu/eksportu treści bibliotecznych
- Gdy chcesz utrzymać spójność kategorii, tagów i źródeł

## Standard operacyjny

1. **Inwentaryzacja**
   - Zlistuj biblioteki i kategorie
   - Wykryj duplikaty i niespójne nazwy
2. **Normalizacja**
   - Ustal konwencję nazw (slug + tytuł)
   - Ujednolić pola: `title`, `category`, `tags`, `source`, `updatedAt`
3. **Operacje**
   - Dodawaj/edytuj rekordy atomowo
   - Zachowaj wersjonowanie zmian lub changelog
4. **Walidacja**
   - Sprawdź kompletność pól wymaganych
   - Sprawdź czy UI poprawnie odczytuje nowe rekordy
5. **Synchronizacja**
   - Upewnij się, że dashboard i wyszukiwarka widzą zmiany

## Dobre praktyki

- Jedna biblioteka = jedna odpowiedzialność tematyczna
- Tagi krótkie, przewidywalne i wielokrotnego użytku
- Operacje batch tylko z walidacją i raportem wyników

## Antywzorce

- Mieszanie różnych schematów metadanych w jednej kolekcji
- Ręczne edycje bez walidacji i bez testu odczytu w UI
- Nadpisywanie danych bez możliwości rollbacku
