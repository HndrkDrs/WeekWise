# WeekWise 3.0 Refactor-Analyse: app-legacy.js → modulare Struktur

> **Datum:** 01.07.2026  
> **Vergleich:** `app-legacy.js` (1115 Zeilen Monolith) vs. `app.js` + 9 JS-Module  
> **Bewertungsskala Code-Ähnlichkeit:** 0% = komplett anderer Ansatz, 100% = Copy-Paste auf Dateien verteilt  
> **Bewertungsskala Funktionalität:** wie ähnlich verhält sich die Funktion (Akzeptanzschwelle ≥98%)

---

## 1. Funktionen-Inventar aus app-legacy.js

### 1.1 Configuration & State (CONFIG, state)

| # | Legacy-Funktion | Neue Location | Code-Ähnl. | Funktionalität | Status |
|---|---|---|---|---|---|
| 1 | `CONFIG` Objekt | `js/core/constants.js` | 100% | 100% ✅ | OK |
| 2 | `state` Objekt (bookings, isLoggedIn, selectedDay, ...) | `js/core/state.js` | 90% | 95% ✅ | Neue getter/setter-API, aber gleicher State |

### 1.2 Day System

| # | Legacy-Funktion | Neue Location | Code-Ähnl. | Funktionalität | Status |
|---|---|---|---|---|---|
| 3 | `getDayCount()` | `js/models/day-model.js` | 100% | 100% ✅ | OK |
| 4 | `getDayLabel(dayNumber)` | `js/models/day-model.js` | 100% | 100% ✅ | OK |
| 5 | `getDayShortLabel(dayNumber)` | `js/models/day-model.js` | 100% | 100% ✅ | OK |
| 6 | `ensureDefaultCategory()` | `js/models/booking-model.js` | 100% | 100% ✅ | OK |
| 7 | `getDefaultCategoryName()` | `js/models/booking-model.js` | 100% | 100% ✅ | OK |
| 8 | `buildCategoryOptions(selectEl)` | `js/models/booking-model.js` | 98% | 98% ✅ | `rgbToHex` call fehlt im Modul |
| 9 | `parseDayInput(input)` | `js/models/day-model.js` | 100% | 100% ✅ | OK |
| 10 | `parseDayList(input)` | `js/models/day-model.js` | 100% | 100% ✅ | OK |
| 11 | `migrateDay(dayValue)` | `js/models/day-model.js` | 100% | 100% ✅ | OK |
| 12 | `migrateHiddenDays(hiddenDays)` | `js/models/day-model.js` | 100% | 100% ✅ | OK |

### 1.3 URL Parameter Handling

| # | Legacy-Funktion | Neue Location | Code-Ähnl. | Funktionalität | Status |
|---|---|---|---|---|---|
| 13 | `parseUrlParams()` | `js/features/url-params.js` | 100% | 100% ✅ | OK |

### 1.4 Utility Functions

| # | Legacy-Funktion | Neue Location | Code-Ähnl. | Funktionalität | Status |
|---|---|---|---|---|---|
| 14 | `stringToHash(str)` | `js/core/utils.js` | 100% | 100% ✅ | OK |
| 15 | `rgbToHex(rgb)` | `js/core/utils.js` | 100% | 100% ✅ | OK |
| 16 | `isLightColor(color)` | `js/core/utils.js` | 100% | 100% ✅ | OK |
| 17 | `formatTime(hour, minute)` | `js/core/utils.js` | 100% | 100% ✅ | OK |
| 18 | `timeToMinutes(timeStr)` | `js/core/utils.js` | 100% | 100% ✅ | OK |
| 19 | `showLoading()` / `hideLoading()` | `app.js` (Zeile 47-62) | 90% | 95% ⚠️ | `showLoading` ruft overlay nicht mehr auf (nur `Date.now()`), `hideLoading` ignoriert `hideLoadingLogo` |
| 20 | `escapeHtml(text)` | `js/core/utils.js` | 100% | 100% ✅ | OK |
| 21 | `generateBookingId()` | `js/core/utils.js` | 100% | 100% ✅ | OK |
| 22 | `ensureBookingId(booking)` | `js/core/utils.js` | 100% | 100% ✅ | OK |
| 23 | `snapTo15(minutes)` | `js/core/utils.js` | 100% | 100% ✅ | OK |
| 24 | `updateDragGhost(isCopy, bookingIndex)` | `app.js` (Zeile 66-79) | 100% | 100% ✅ | OK (wird aber nie aufgerufen, weil DnD fehlt) |

### 1.5 Print Functions

| # | Legacy-Funktion | Neue Location | Code-Ähnl. | Funktionalität | Status |
|---|---|---|---|---|---|
| 25 | `togglePrintPopup()` | `js/features/print.js` | 100% | 100% ✅ | OK |
| 26 | `executePrint()` | `js/features/print.js` | 95% | 95% ⚠️ | `analyzeEmptyHours` ohne `visibleDayNums` Parameter aufgerufen |

### 1.6 Server Communication

| # | Legacy-Funktion | Neue Location | Code-Ähnl. | Funktionalität | Status |
|---|---|---|---|---|---|
| 27 | `saveToServer(filename, data)` | `js/services/server.js` | 90% | **85%** 🔴 | Neue Signatur: `(filename, data, onLoading)`. showLoading/hideLoading werden nicht mehr automatisch aufgerufen. Alle Aufrufer in app.js übergeben keinen onLoading-Callback. |
| 28 | `loadFromServer(filename)` | `js/services/server.js` | 100% | 100% ✅ | OK |

### 1.7 Sidebar Management

| # | Legacy-Funktion | Neue Location | Code-Ähnl. | Funktionalität | Status |
|---|---|---|---|---|---|
| 29 | `toggleSidebar(updateVisibility)` | `app.js` (Zeile 83-86) | 100% | 100% ✅ | OK |
| 30 | `openSidebar(updateVisibility)` | `app.js` (Zeile 88-104) | 100% | 100% ✅ | OK |
| 31 | `closeSidebar(updateVisibility)` | `app.js` (Zeile 106-122) | 100% | 100% ✅ | OK |

### 1.8 Time Options

| # | Legacy-Funktion | Neue Location | Code-Ähnl. | Funktionalität | Status |
|---|---|---|---|---|---|
| 32 | `createTimeOptions()` | `app.js` (Zeile 126-141) | 100% | 100% ✅ | OK |
| 33 | `populateTimeOptions()` | `app.js` (Zeile 143-154) | 100% | 100% ✅ | OK |

### 1.9 Day Visibility

| # | Legacy-Funktion | Neue Location | Code-Ähnl. | Funktionalität | Status |
|---|---|---|---|---|---|
| 34 | `getDaysToShow()` | `app.js` (Zeile 158-178) | 100% | 100% ✅ | OK |

### 1.10 Empty Hour Collapse

| # | Legacy-Funktion | Neue Location | Code-Ähnl. | Funktionalität | Status |
|---|---|---|---|---|---|
| 35 | `shouldCollapseEmpty()` | `js/features/empty-collapse.js` | 98% | 98% ✅ | Importiert `getState` statt direkt `state` |
| 36 | `analyzeEmptyHours(bookings, startHour, endHour)` | `js/features/empty-collapse.js` | 90% | **85%** 🔴 | **Neue Signatur:** 4. Parameter `visibleDayNums` hinzugefügt. Legacy hatte 3 Parameter. Aufrufer in app.js/print.js rufen teils mit 3, teils mit 4 Parametern auf → Laufzeitfehler möglich. |
| 37 | `buildYMapper(emptyHours, startHour)` | `js/features/empty-collapse.js` | 100% | 100% ✅ | OK |

### 1.11 Dynamic UI Generation

| # | Legacy-Funktion | Neue Location | Code-Ähnl. | Funktionalität | Status |
|---|---|---|---|---|---|
| 38 | `buildMobileTiles()` | `app.js` (Zeile 279-299) | 100% | 100% ✅ | OK |
| 39 | `buildDaySelect()` | `app.js` (Zeile 301-316) | 100% | 100% ✅ | OK |
| 40 | `buildHiddenDaysCheckboxes()` | `app.js` (Zeile 318-334) | 100% | 100% ✅ | OK |

### 1.12 Day Columns (Desktop View) — **KRITISCHER FEHLER**

| # | Legacy-Funktion | Neue Location | Code-Ähnl. | Funktionalität | Status |
|---|---|---|---|---|---|
| 41 | `createDayColumns()` | `app.js` (Zeile 182-275) | **40%** | **30%** 🔴🔴 | **Drag & Drop komplett entfernt.** Nur ein Platzhalter-Kommentar in Zeile 271. `scroll-wrapper-container`/`scroll-hint` Logik fehlt. `dragover`/`dragleave`/`drop` Listener fehlen auf `.day-column`. |

**Fehlende DnD-Features in createDayColumns:**
- `column.addEventListener('dragover', ...)` — Drag-Target Highlighting
- `column.addEventListener('dragleave', ...)` — Highlight entfernen
- `column.addEventListener('drop', ...)` — Drop-Handler (Move + Copy mit Shift/Ctrl)
- `scroll-wrapper-container` + `scroll-hint` dynamische Erstellung
- `needsScroll` Handling für Event-Modus mit vielen Tagen

### 1.13 Booking Overlap Detection

| # | Legacy-Funktion | Neue Location | Code-Ähnl. | Funktionalität | Status |
|---|---|---|---|---|---|
| 42 | `detectOverlaps(bookings, day)` | `js/models/booking-model.js` | 100% | 100% ✅ | OK |

### 1.14 Booking Element Creation — **KRITISCHER FEHLER**

| # | Legacy-Funktion | Neue Location | Code-Ähnl. | Funktionalität | Status |
|---|---|---|---|---|---|
| 43 | `createBookingElement(booking, index, isMobile)` | `app.js` (Zeile 338-417) | **30%** | **20%** 🔴🔴 | **Drag & Drop + Resize komplett entfernt.** |

**Fehlende DnD-Features in createBookingElement:**
- `el.setAttribute('draggable', 'true')` — Elemente sind nicht draggable
- `el.addEventListener('dragstart', ...)` — Drag-Start-Handler
- `el.addEventListener('dragend', ...)` — Drag-End-Handler
- `resizeHandle` + `mousedown`/`mousemove`/`mouseup` — Resize komplett fehlt

### 1.15 Render Bookings

| # | Legacy-Funktion | Neue Location | Code-Ähnl. | Funktionalität | Status |
|---|---|---|---|---|---|
| 44 | `renderBookings()` | `app.js` (Zeile 421-441) | 100% | 100% ✅ | OK |
| 45 | `renderMobileBookings(bookings)` | `app.js` (Zeile 443-469) | 100% | 100% ✅ | OK |
| 46 | `renderDesktopBookings(bookings)` | `app.js` (Zeile 471-512) | 100% | 100% ✅ | OK |
| 47 | `renderSidebarBookings(bookings)` | `app.js` (Zeile 514-522) | **50%** | **30%** 🔴 | **DnD auf Sidebar-Bookings fehlt.** Kein `draggable='true'`, kein `dragstart`/`dragend`. |

### 1.16 Booking Details Modal

| # | Legacy-Funktion | Neue Location | Code-Ähnl. | Funktionalität | Status |
|---|---|---|---|---|---|
| 48 | `showBookingDetails(booking)` | `app.js` (Zeile 526-548) | 98% | 98% ✅ | OK (Reihenfolge der DOM-Manipulation leicht anders) |
| 49 | `closeViewBookingModal()` | `app.js` (Zeile 550-552) | 100% | 100% ✅ | OK |

### 1.17 Booking CRUD

| # | Legacy-Funktion | Neue Location | Code-Ähnl. | Funktionalität | Status |
|---|---|---|---|---|---|
| 50 | `editBooking(index)` | `app.js` (Zeile 556-577) | 100% | 100% ✅ | OK |
| 51 | `deleteBooking(index)` | `app.js` (Zeile 579-587) | 100% | 100% ✅ | OK |
| 52 | `deleteSelectedBookings()` | `app.js` (Zeile 589-599) | 100% | 100% ✅ | OK |
| 53 | `clearMultiSelection()` | Implizit über `js/core/state.js` | 100% | 100% ✅ | OK |
| 54 | `duplicateBooking(index)` | `app.js` (Zeile 601-612) | 100% | 100% ✅ | OK |
| 55 | `closeBookingModal()` | `app.js` (Zeile 614-621) | 100% | 100% ✅ | OK |

### 1.18 Authentication

| # | Legacy-Funktion | Neue Location | Code-Ähnl. | Funktionalität | Status |
|---|---|---|---|---|---|
| 56 | `login()` | `app.js` (Zeile 625-641) via `authLogin` | 95% | 95% ✅ | OK |
| 57 | `logout()` | `app.js` (Zeile 643-658) via `authLogout` | 95% | 95% ✅ | OK |
| 58 | `closeLoginModal()` | `app.js` (Zeile 660-663) | 100% | 100% ✅ | OK |

### 1.19 Settings Modal — **FEHLER**

| # | Legacy-Funktion | Neue Location | Code-Ähnl. | Funktionalität | Status |
|---|---|---|---|---|---|
| 59 | `showOptionsModal()` | `app.js` (Zeile 667-699) | 95% | 95% ⚠️ | Header/Secondary color swatch population fehlt (aus DOM CSS variables) |
| 60 | `updateModeUI()` | `app.js` (Zeile 701-705) | 100% | 100% ✅ | OK |
| 61 | `updateEventPreview()` | `app.js` (Zeile 707-720) | 100% | 100% ✅ | OK |
| 62 | `sanitizeColor(color)` | `js/core/utils.js` | 100% | 100% ✅ | OK |
| 63 | `renderColorOptions()` | `js/models/settings-model.js` | 100% | 100% ✅ | OK |
| 64 | `closeOptionsModal()` | `app.js` (Zeile 789-791) | 100% | 100% ✅ | OK |
| 65 | `saveSettings()` | `app.js` (Zeile 722-787) | **55%** | **40%** 🔴 | **Mehrere Features entfernt:** Passwortvalidierung (Länge≥8, Groß/Klein/Zahlen), Startdatum-Änderungsdialog, Modus-Wechsel-Booking-Migration, ICS-Token-Regeneration bei Datumsänderung, `loadingLogoCheckbox`, `updateCategorySelect` |
| 66 | `updateCategorySelect()` | **Entfernt** | 0% | 0% 🔴 | Funktion komplett gelöscht |

### 1.20 Import/Export

| # | Legacy-Funktion | Neue Location | Code-Ähnl. | Funktionalität | Status |
|---|---|---|---|---|---|
| 67 | `exportBookings()` | `js/features/import-export.js` | 98% | 98% ✅ | OK |
| 68 | `importBookings()` | `js/features/import-export.js` | 90% | 90% ⚠️ | Neue Signatur: `(file, onComplete)` statt `()`. Event-Handler in app.js aktualisiert. `buildFullConfigData`-Aufruf nach Kategorie-Erstellung fehlt (Settings-Save). `hideLoadingLogo` in `initializeDefaults` statt `bookings.save` |

### 1.21 Validation

| # | Legacy-Funktion | Neue Location | Code-Ähnl. | Funktionalität | Status |
|---|---|---|---|---|---|
| 69 | `validateBooking(booking)` | `js/models/booking-model.js` | 100% | 100% ✅ | OK |
| 70 | `buildFullConfigData()` | `js/models/settings-model.js` | 95% | 95% ⚠️ | Holt `title` von `getCalendarTitle()` (aus localStorage) statt `document.querySelector('.calendar-header h2')?.textContent` |

### 1.22 Initialization

| # | Legacy-Funktion | Neue Location | Code-Ähnl. | Funktionalität | Status |
|---|---|---|---|---|---|
| 71 | `initializeDefaults()` | `js/models/settings-model.js` | 95% | 95% ⚠️ | Fügt `hideLoadingLogo` hinzu. Setzt keine CSS variablen (`--header-color`, `--secondary`). Ruft keine UI-Funktionen auf (createTimeOptions etc.) |
| 72 | `initialize()` | `app.js` (Zeile 876-927) | 98% | 98% ✅ | `showLoading()` zu Beginn hinzugefügt. `icsPublic`/`icsDayFilter` über state statt eigener Variablen |

### 1.23 ICS Calendar Export

| # | Legacy-Funktion | Neue Location | Code-Ähnl. | Funktionalität | Status |
|---|---|---|---|---|---|
| 73 | `generateToken()` | `js/services/ics-service.js` | 100% | 100% ✅ | OK |
| 74 | `generateIcsToken()` | `app.js` (Zeile 811-819) | 95% | 95% ✅ | OK |
| 75 | `updateIcsTokenDisplay()` | `app.js` (Zeile 795-809) | 100% | 100% ✅ | OK |
| 76 | `getIcsBaseUrl()` | `js/services/ics-service.js` | 100% | 100% ✅ | OK |
| 77 | `countFilteredIcsBookings()` | `js/services/ics-service.js` | 90% | 90% ⚠️ | Neue Signatur: `(bookings, categoryChecks, dayChecks)` statt direkter DOM-Zugriff |
| 78 | `buildIcsUrls()` | `js/services/ics-service.js` | 95% | 95% ⚠️ | Neue Signatur: `(categoryChecks, dayChecks)` |
| 79 | `updateIcsModal()` | `app.js` (Zeile 858-868) | 95% | 95% ✅ | OK |
| 80 | `showIcsModal()` | `app.js` (Zeile 821-856) | 100% | 100% ✅ | OK |
| 81 | `closeIcsModal()` | `app.js` (Zeile 870) | 100% | 100% ✅ | OK |
| 82 | `showHelpModal()` | `app.js` (Zeile 871) | 100% | 100% ✅ | OK |
| 83 | `closeHelpModal()` | `app.js` (Zeile 872) | 100% | 100% ✅ | OK |

### 1.24 Context Menu — **KOMPLETT FEHLEND**

| # | Legacy-Funktion | Neue Location | Code-Ähnl. | Funktionalität | Status |
|---|---|---|---|---|---|
| 84 | `closeContextMenu()` | **Fehlt** | 0% | 0% 🔴 | Nicht migriert |
| 85 | `showBookingContextMenu(e, bookingIndex)` | **Fehlt** | 0% | 0% 🔴 | Nicht migriert |
| 86 | `createCtxItem(icon, label, onclick, isDanger)` | **Fehlt** | 0% | 0% 🔴 | Nicht migriert |
| 87 | `createCtxDivider()` | **Fehlt** | 0% | 0% 🔴 | Nicht migriert |
| 88 | `createCategorySubmenu(bookingIndices)` | **Fehlt** | 0% | 0% 🔴 | Nicht migriert |
| 89 | `applyCategoryToBookings(indices, categoryId)` | **Fehlt** | 0% | 0% 🔴 | Nicht migriert |
| 90 | `duplicateBookingDirect(index)` | **Fehlt** | 0% | 0% 🔴 | Nicht migriert |
| 91 | `positionContextMenu(menu, x, y)` | **Fehlt** | 0% | 0% 🔴 | Nicht migriert |

### 1.25 Event Listeners

| # | Legacy-Funktion | Neue Location | Code-Ähnl. | Funktionalität | Status |
|---|---|---|---|---|---|
| 92 | DOMContentLoaded Event-Handler | `app.js` (Zeile 934-1051) | **70%** | **60%** 🔴 | Sidebar DnD-Listener [sidebarEl, contentSidebarEl] fehlen. `icsCopyDownloadBtn`/`icsDownloadBtn`/`icsCopyAboBtn` Listener fehlen. Delete-Key-Listener für einzelne expanded Bookings fehlt. `importFile` Handler-Signatur geändert. |

### 1.26 Globale Exports

| # | Legacy-Funktion | Neue Location | Code-Ähnl. | Funktionalität | Status |
|---|---|---|---|---|---|
| 93 | `window.*` Exports | `app.js` (Zeile 27-38 + 1045-1051) | 95% | 95% ⚠️ | Einige Funktionen doppelt (utility re-exports + onclick handler). `updateIcsModal` und `showIcsModal`/`showHelpModal` neu in onclick-exports. |

---

## 2. Zusammenfassung der kritischen Defekte

### 🔴🔴 KRITISCH (Funktionalität 0-30%)

| ID | Funktion | Problem |
|---|---|---|
| **F1** | Drag & Drop (createDayColumns) | `dragover`, `dragleave`, `drop` Listener auf `.day-column` komplett entfernt |
| **F2** | Drag & Drop (createBookingElement) | `draggable="true"`, `dragstart`, `dragend` Listener entfernt |
| **F3** | Resize (Booking) | `mousedown`/`mousemove`/`mouseup` auf `.resize-handle` entfernt |
| **F4** | Sidebar DnD (renderSidebarBookings) | `draggable`, `dragstart`, `dragend` auf Ablage-Bookings entfernt |
| **F5** | Context Menu (8 Funktionen) | Komplett nicht migriert |
| **F6** | `saveSettings()` Validierungen | Passwortvalidierung, Modus-Wechsel-Dialoge, Startdatum-Änderungsdialog entfernt |

### 🟡 MITTEL (Funktionalität 40-85%)

| ID | Funktion | Problem |
|---|---|---|
| **F7** | `saveToServer` Signatur | Neuer `onLoading` Parameter wird nie übergeben → kein Loading-Indikator |
| **F8** | `analyzeEmptyHours` Signatur | Neuer 4. Parameter; Aufrufer inkonsistent (3 vs 4 Parameter) |
| **F9** | `buildCategoryOptions` | `rgbToHex` nicht auf Category-Farben angewendet |
| **F10** | `showLoading`/`hideLoading` | `hideLoadingLogo` Check fehlt in `hideLoading` |
| **F11** | Sidebar-DnD Event-Listener | `dragover`/`dragleave`/`drop` auf `sidebarEl` und `contentSidebarEl` fehlen |

### 🟢 GERING (Funktionalität 85-98%)

| ID | Funktion | Problem |
|---|---|---|
| **F12** | `initializeDefaults` | Setzt keine CSS-Variablen, ruft keine UI-Funktionen auf |
| **F13** | `buildFullConfigData` | Holt title aus localStorage statt DOM |
| **F14** | `exportBookings` Save-Aufruf | In Legacy wird saveToServer **vor** Download aufgerufen (Sicherung), in neuer Version auch |

---

## 3. Test-Abdeckung

| Test-Datei | Testet | Lädt von | Status |
|---|---|---|---|
| `test_utils.js` | Utility pure functions | `app-legacy.js` (via runner eval) | ✅ Läuft |
| `test_utils_module.js` | Module structure + parity | Modul-Datei direkt | ✅ Läuft |
| `test_constants.js` | CONFIG Werte | Modul-Datei direkt | ✅ Läuft |
| `test_booking_model.js` | detectOverlaps | Modul-Datei direkt (imports gestrippt) | ✅ Läuft |
| `test_day_model.js` | Module structure + parity | Beide (Modul + Legacy via runner) | ✅ Läuft |
| `test_empty_collapse.js` | buildYMapper | Modul-Datei direkt | ✅ Läuft |
| **Fehlt** | Drag & Drop | — | 🔴 Kein Test |
| **Fehlt** | Resize | — | 🔴 Kein Test |
| **Fehlt** | Context Menu | — | 🔴 Kein Test |
| **Fehlt** | analyzeEmptyHours mit 4 Parametern | — | 🔴 Kein Test |
| **Fehlt** | saveSettings | — | 🔴 Kein Test |
| **Fehlt** | importBookings (neue Signatur) | — | 🔴 Kein Test |

rage**Wichtiger Hinweis:** Der Test-Runner (`tests/js/runner.js`) lädt aktuell `app-legacy.js` per `eval()`. Für Modul-Tests werden die Module-Dateien direkt per `fs.readFileSync` + gestrippte `import`/`export` Statements geladen. Es gibt keinen dedizierten Test-Runner für die ES-Modul-Struktur.