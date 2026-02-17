# WeekWise 2.0 - Fahrplan

## Übersicht

WeekWise 2.0 ist eine grundlegend überarbeitete Version, die sich auf drei Hauptziele konzentriert:

1. **Maximale Kompatibilität** - Läuft auf jedem Webspace (HTML, JS, PHP)
2. **Zero Maintenance** - Nach der Einrichtung muss nichts mehr angefasst werden
3. **Flexible Einbettung** - Optimiert für Subdomain und iFrame-Integration

---

## 1. Webspace-Kompatibilität (Run Everywhere)

### Bereits implementiert:
- ✅ Reines HTML/CSS/JS für Frontend
- ✅ Minimales PHP nur für Datei-Speicherung
- ✅ Keine externen Abhängigkeiten (CDNs, Google Fonts)
- ✅ SVG Icons lokal eingebunden

### Verbesserungen für v2.0:
- [ ] **Fallback für PHP-lose Umgebungen**: LocalStorage als Alternative
- [ ] **Relative Pfade** für alle Ressourcen (keine absoluten /ico/ Pfade)
- [ ] **Selbstständige Initialisierung**: HTML erstellt fehlende JSON-Dateien automatisch
- [ ] **Keine Abhängigkeit von .htaccess** (optional, nicht erforderlich)

---

## 2. Zero Maintenance (Nie wieder anfassen)

### Robuste Datenverarbeitung:
- [ ] **Graceful Degradation**: Fehlende Felder werden mit Defaults aufgefüllt
- [ ] **Automatische Migration**: Alte Datenformate werden automatisch konvertiert
- [ ] **Fehlerresistente JSON-Verarbeitung**: Korrupte Daten werden behandelt

### Sichere Passwort-Verwaltung:
- [ ] **Hash-Overflow Fix**: Sicherer Hash-Algorithmus für lange Passwörter
- [ ] **Installer und Frontend nutzen gleichen Algorithmus**

### Selbstheilung:
- [ ] **Automatische Erstellung von settings.json und bookings.json**
- [ ] **Validierung beim Laden mit Default-Werten**

---

## 3. Embedded/iFrame Modus

### URL-Parameter Support:
- [ ] `?embedded=true` - Versteckt alle Bedienelemente (Login, Add-Button)
- [ ] `?category=Jugend` - Zeigt nur Termine einer bestimmten Kategorie
- [ ] `?day=Montag` - Zeigt nur einen bestimmten Tag
- [ ] `?readonly=true` - Deaktiviert Interaktion komplett
- [ ] `?compact=true` - Kompakte Darstellung ohne Header

### Design-Anpassungen für iFrames:
- [ ] **Transparenter Hintergrund-Modus**
- [ ] **Kein Body-Padding im embedded Modus**
- [ ] **Anpassbare Header-Höhe/Sichtbarkeit**

---

## 4. Optik - Überlappende Termine

### Aktuelles Problem:
Termine, die sich zeitlich überlappen, werden übereinander dargestellt und verdecken sich gegenseitig.

### Lösung für v2.0:
- [ ] **Kollisionserkennung**: Erkennt überlappende Termine pro Tag
- [ ] **Nebeneinander-Darstellung**: Überlappende Termine werden nebeneinander angezeigt
- [ ] **Dynamische Breitenanpassung**: `width: calc(100% / n - margin)` wobei n = Anzahl paralleler Termine
- [ ] **Z-Index Management**: Angeklickte Termine kommen in den Vordergrund

---

## 5. Usability-Verbesserungen

### Benutzerfreundlichkeit:
- [x] **Drag & Drop** zum Verschieben von Terminen (Desktop, + Shift zum Duplizieren)
- [ ] **Tooltip** beim Hover über Termine
- [ ] **Bessere Farbkontraste**: Automatische Textfarbe basierend auf Hintergrund
- [ ] **Bestätigungsdialoge** konsistent gestalten
- [ ] **Ladeindikator** bei Speichern/Laden

### Editor-Verbesserungen:
- [x] **DEL-Taste** zum Löschen von ausgewählten Terminen
- [x] **Multi-Select** mit Strg+Klick + DEL für Massenlöschen
- [ ] **Keyboard Navigation** im Formular
- [ ] **Auto-Complete** für Trainer-Namen
- [x] **Schnelles Duplizieren** von Terminen (Button im Modal + Shift+Drag)

---

## 6. Responsive/Mobile

### Aktuelle Probleme:
- Sidebar-Buttons (⏮/⏭) werden auf Android nicht korrekt angezeigt
- Mobile-Ansicht hat separate Rendering-Logik

### Verbesserungen:
- [ ] **SVG-Icons** für Sidebar-Toggle statt Unicode-Zeichen
- [ ] **Touch-optimierte Interaktion**: Größere Klickbereiche
- [ ] **Swipe-Gesten** für Navigation zwischen Tagen
- [ ] **Responsive Font-Sizes**: `clamp()` für skalierbare Schriften
- [ ] **Mobile-First Breakpoints**: Überarbeitung der Media Queries

---

## 7. Codequalität

### Struktur:
- [ ] **Separation of Concerns**: JavaScript in eigene Datei auslagern
- [ ] **Modularisierung**: Funktionen in logische Blöcke aufteilen
- [ ] **Konstanten** für wiederverwendete Werte

### Cleanup:
- [ ] **Konsistente Namenskonventionen**: camelCase durchgehend
- [ ] **Unused Code entfernen**: mockBookings Initial-Daten
- [ ] **Comments hinzufügen**: JSDoc für wichtige Funktionen
- [ ] **Inline-Styles minimieren**: Alles in CSS auslagern

### Sicherheit:
- [ ] **PHP Input Sanitization**: filename Parameter validieren
- [ ] **XSS Prevention**: HTML-Encoding für User-Input
- [ ] **Path Traversal Schutz**: Nur erlaubte Dateinamen

---

## Implementierungsreihenfolge

### Phase 1: Foundation (Kritisch)
1. ✅ Ordnerstruktur v2.0 anlegen
2. Relative Pfade für Icons
3. PHP Sicherheits-Fixes
4. Auto-Initialisierung von JSON-Dateien

### Phase 2: Embedded Mode
1. URL-Parameter Parsing
2. Embedded-Styles implementieren
3. Kategorie-Filter

### Phase 3: Visual Improvements
1. Überlappende Termine - Kollisionserkennung
2. Nebeneinander-Darstellung
3. Bessere Farbkontraste

### Phase 4: Mobile & UX
1. SVG Sidebar-Icons
2. Touch-Optimierung
3. Responsive Verbesserungen

### Phase 5: Code Quality
1. JavaScript auslagern
2. Cleanup & Dokumentation
3. Sicherheits-Audit

---

## Dateien in v2.0

```
v2.0/
├── index.html          # Haupt-Anwendung
├── style.css           # Alle Styles
├── app.js              # JavaScript (ausgelagert)
├── save_json.php       # Server-Interaktion
├── ico/                # SVG Icons
│   ├── add.svg
│   ├── del.svg
│   ├── edit.svg
│   ├── link.svg
│   ├── settings.svg
│   ├── chevron-left.svg
│   └── chevron-right.svg
└── ROADMAP.md          # Diese Datei
```
