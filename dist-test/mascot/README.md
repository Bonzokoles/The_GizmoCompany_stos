# ZENO Browser - System Mascota

## Struktura folderów

Każdy **skin** to osobny folder w `public/mascot/{skinId}/`:

```
public/mascot/
├── README.md              ← ten plik
├── {skinId}/
│   ├── icon.png           ← preview skina (256x256, opcjonalnie)
│   ├── idle/              ← klipy idle loop (stoi, mruga, oddycha)
│   │   ├── stand.webm
│   │   └── blink.webm
│   ├── action/            ← klipy akcji (tańczy, macha, myśli)
│   │   ├── wave.webm
│   │   └── think.webm
│   ├── intro/             ← klipy wejścia (spawn, pojawienie)
│   │   └── spawn.webm
│   └── outro/             ← klipy wyjścia (znika, bye)
│       └── bye.webm
```

## Dodawanie nowego skina

1. Stwórz folder `public/mascot/{nazwa}/`
2. Dodaj min. jeden subfolder: `idle/`, `action/`, `intro/`, lub `outro/`
3. Wrzuć klipy `.webm` (VP9 z alpha channel) lub `.mp4`
4. Skin automatycznie pojawi się w ustawieniach

## Wymagania techniczne

- **Format**: `.webm` (VP9) z kanałem alpha (przezroczyste tło) — ZALECANY
- **Alternatywa**: `.mp4` (H.264) bez przezroczystości
- **Rozdzielczość**: 512x512 lub 256x256
- **Rozmiar**: max ~500KB per klip
- **Czas trwania**: 2-8 sekund per klip

## FSM (maszyna stanów)

```
INTRO → IDLE ↔ ACTION
              (timer 30-60s)
```

- **INTRO**: Losowy klip z `intro/`, raz na start
- **IDLE**: Losowy klip z `idle/`, zapętlony
- **ACTION**: Losowy klip z `action/`, po zakończeniu → IDLE
- **OUTRO**: Odtwarzany przy zamknięciu/ukryciu mascota
