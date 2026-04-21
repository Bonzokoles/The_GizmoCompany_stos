# Prompt dla MOA: Przepisz artykuł o ZENO-Browser w stylu przystępnym

## Zadanie

Przepisz artykuł "ZENO-Browser Oort Outer Shell: Architektura i warstwy przeglądarki przyszłości" w bardziej przystępnym, ludzkim języku. Zachowaj wszystkie informacje merytoryczne, ale zmień styl tak, aby był zrozumiały dla osoby znającej się na biznesie, ale niekoniecznie na programowaniu.

## Styl referencyjny

Wzorcowy styl to ten użyty w sekcji o narzędziach analitycznych (warstwa 4 / mybonzo.com):

> "Zachowania klientów w sklepie internetowym i w sklepie stacjonarnym na pierwszy rzut oka wyglądają podobnie. Ale właśnie tutaj kryje się prawdziwa wartość: przyjrzenie się wzorcom zachowań na stronach produktowych pozwala znaleźć odpowiedzi na pytania — na której zmianie pracowników osiągamy najlepsze wyniki? W jakich godzinach, dniach i porach roku sprzedajemy najwięcej?"

Chodzi o: praktyczne przykłady z życia, skupienie na korzyściach, narracja zamiast technicznej listy.

## Zasady przepisywania

1. **Konwersacyjny ton** — zamiast "nodeIntegration: false eliminuje potencjalne wektory ataku", napisz "każdy moduł działa w swojej własnej piaskownicy — żaden błąd nie może zarazić całego systemu"

2. **Korzyści, nie cechy** — każda sekcja powinna odpowiadać na pytanie "co z tego ma użytkownik?" a nie tylko "co to technicznie robi?"

3. **Przykłady z życia** — tam gdzie możliwe, pokaż jak dana funkcja działa w praktycznym kontekście biznesowym

4. **Ochrona prywatności klientów** — nie używaj nazw firm klientów ani ich systemów. Zamiast konkretnych nazw: "firma klienta", "lokalna baza danych", "system analityczny klienta"

5. **Ograniczenie żargonu** — nazwy techniczne (IPC, contextBridge, CSP) można wymienić raz z krótkim wyjaśnieniem w nawiasie, ale nie budować wokół nich całych akapitów

6. **Narracja, nie lista** — zamiast bullet listy z nazwami plików i funkcji, opowiedz historię: co się dzieje gdy użytkownik otwiera przeglądarkę, co robi każda warstwa po kolei

7. **Zachowaj strukturę sekcji** — te same nagłówki i numery warstw, ale z przepisaną treścią w nowym stylu

## Co zachować bez zmian

- Nazwy warstw (Warstwa 1, Warstwa 2, itd.)
- Grupowe nazwy narzędzi (fs-tools, rag-tools, net-tools itd.) — ale z ludzkim opisem co to robi
- Sekcję Prywatności danych — ona jest już dobrze napisana
- Wszystkie informacje o mybonzo.com i czwartej warstwie
- Fakt że żadne surowe dane nie opuszczają lokalnego komputera

## Artykuł do przepisania

[wklej tutaj treść pliku: ZENO-Browser Oort Outer Shell.md]