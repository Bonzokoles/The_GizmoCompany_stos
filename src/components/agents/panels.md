1.  **`BrowserUI.tsx`**: To główna powłoka przeglądarki.
    *   Zarządza stanem `openPanels`, który określa, które panele są aktualnie otwarte.
    *   W swoim renderowaniu używa komponentu `<PanelHost openPanels={openPanels} getContext={getContext} />`.
    *   Posiada logikę `onSpawnAgent`, która dodaje agentów do `workspaceAgents` i otwiera panel `agent-workspace`.

2.  **`PanelHost.tsx`**: Ten komponent jest odpowiedzialny za hostowanie wszystkich otwartych "pływających" paneli.
    *   Iteruje przez `openPanels` i dla każdego `PanelId` (identyfikatora panelu) pobiera odpowiedni komponent z `PANEL_BY_ID` (z `panel-registry.tsx`).
    *   Renderuje te komponenty wewnątrz `<Suspense>` i `<ErrorBoundary>`.
    *   Sam `PanelHost` nie definiuje konkretnego pozycjonowania ani stylu dla poszczególnych paneli.

3.  **`panel-registry.tsx`**: Ten plik jest rejestrem wszystkich dostępnych paneli.
    *   Zawiera definicję dla `id: "agent-workspace"`.
    *   Mapuje `agent-workspace` do komponentu `AgentWorkspacePanel`.

**Wniosek:**

Pliki w `U:\WWW_Zen_BRo_wser_org3\src\components\browser-core` (takie jak `BrowserUI.tsx`, `PanelHost.tsx`, `panel-registry.tsx`) odpowiadają za:
*   **Wykrywanie, które panele mają być otwarte (`BrowserUI.tsx`).**
*   **Ładowanie i hostowanie odpowiednich komponentów paneli (`PanelHost.tsx`).**
*   **Mapowanie identyfikatora panelu do konkretnego komponentu (`panel-registry.tsx`).**

Jednakże, **szczegółowe rozpisanie położenia i UI *trzech terminali* (czyli ich wewnętrzny układ, rozmiar, style i zachowanie)** nie znajduje się bezpośrednio w `browser-core`. Te aspekty są definiowane w:

*   **`U:\WWW_Zen_BRo_wser_org3\src\components\agents\AgentWorkspacePanel.tsx`**: Ten komponent jest głównym kontenerem dla trzech terminali. To w nim definiuje się, jak terminale są ułożone (np. w rzędzie), ich ogólny styl, sposób skalowania (np. `flex: 1` dla każdego terminala) oraz kontrolę nad ich wysokością (`cardHeight`).
*   **`U:\WWW_Zen_BRo_wser_org3\src\components\agents\AGENT_Pi_0X\index.tsx` (dla X=01, 02, 03)**: Każdy z tych plików definiuje UI i zachowanie pojedynczego terminala, w tym wyświetlanie konsoli `xterm.js` i jego wewnętrzny styl.

Podsumowując, `browser-core` zapewnia ramę do osadzania `AgentWorkspacePanel`, ale to `AgentWorkspacePanel` i jego potomne komponenty 
terminali kontrolują faktyczny układ i wygląd poszczególnych terminali.

==========================================================================
POPRAWIĆ:
                           
Read [](file:///u%3A/WWW_Zen_BRo_wser_org3/src/components/agents)

Read [](file:///u%3A/WWW_Zen_BRo_wser_org3/src/components/agents/panels.md)

Read [](file:///u%3A/WWW_Zen_BRo_wser_org3/src/components/browser-core/PanelHost.tsx)

Read [](file:///u%3A/WWW_Zen_BRo_wser_org3/src/components/browser-core/panel-registry.tsx#1-1), lines 1 to 60

Read [](file:///u%3A/WWW_Zen_BRo_wser_org3/src/components/browser-core/panel-registry.tsx#60-60), lines 60 to 97

Searched for text `PanelId` (`**/src/components/browser-core/shell.types.ts`), 1 result

Read [](file:///u%3A/WWW_Zen_BRo_wser_org3/src/components/browser-core/shell.types.ts)

Searched for regex `openPanels|getContext|PanelHost|agent-workspace|position|absolute|inset|zIndex` (`**/src/components/browser-core/BrowserUI.tsx`), 20 results

Read [](file:///u%3A/WWW_Zen_BRo_wser_org3/src/components/browser-core/BrowserUI.tsx#370-370), lines 370 to 420

Mam pełny obraz. Ocena w panels.md jest **zasadniczo prawidłowa**, ale ma kilka luk. Oto pełna i dokładna analiza:

---

## Co jest prawidłowe w panels.md

✅ BrowserUI.tsx zarządza `openPanels` i otwiera `agent-workspace`  
✅ PanelHost.tsx iteruje po panelach i renderuje z `PANEL_REGISTRY`  
✅ AgentWorkspacePanel.tsx kontroluje układ kart terminali  
✅ `AGENT_Pi_0X/index.tsx` definiuje wygląd pojedynczego terminala  

---

## Co panels.md pomija (ważne!)

**`PanelHost` NIE dodaje żadnego wrappera z pozycjonowaniem** — renderuje surowe komponenty przez `<Suspense>`. To oznacza że każdy panel **musi sam się pozycjonować** względem `<main>`.

Pełny łańcuch pozycjonowania:

```
<main>  ← position: relative, flex: 1
  │
  ├── <StartPage>          ← position: absolute, inset: 0, zIndex: 10
  │     └── ZenoCenterGraphic (radar) — w środku StartPage
  │
  └── <PanelHost>          ← brak wrappera, renderuje prosto do <main>
        └── <AgentWorkspacePanel>
              └── <div>   ← position: absolute, inset: 0, zIndex: 10
                           flex-column: [nagłówek] + [karty] + [transparent dół]
```

---



AgentWorkspacePanel.tsx nakłada się na cały `<main>` z `inset: 0`:

```
┌─────────────────────────────────────────┐
│  AGENT WORKSPACE  [slider] [Pipeline] [+Agent] [✕]   ← nagłówek 34px
├──────────┬──────────┬───────────────────┤
│ [SLOT 01]│ [SLOT 02]│    [SLOT 03]      │  ← karty: flex row, height=cardHeight
│  π PI    │ ◈ CLAUDE │    ⌘ CODEX        │    każda: flex:1, position static
│ [xterm]  │ [xterm]  │    [xterm]        │
├──────────┴──────────┴───────────────────┤
│   transparent (pointer-events: none)    │  ← radar widoczny przez tu
│         🎯 THE_ZENON_OORT_OUTER_SHELL   │
└─────────────────────────────────────────┘
```

Obszar poniżej kart jest transparentny (`background: transparent`, `pointerEvents: none`) — dlatego radar jest widoczny jak na screenshotach z żółtymi ramkami.

---

## Jedyna rzecz którą trzeba wiedzieć do zmiany pozycji

Pozycja kart jest kontrolowana **tylko przez dwa miejsca**:

| Co | Gdzie |
|---|---|
| Wysokość kart | AgentWorkspacePanel.tsx → state `cardHeight` (suwak w headerze) |
| Ile miejsca zajmują | AgentWorkspacePanel.tsx → sekcja kart ma `alignItems: 'flex-start'` — karty nie rozciągają się do dołu |
| Pozycja całego panelu nad radarem | AgentWorkspacePanel.tsx → `position: absolute, inset: 0` |

                           
                           
                           