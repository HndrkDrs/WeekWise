# WeekWise – Wochenpläne zum flexiblen Verwalten und Einbinden in deine Website

WeekWise ist ein benutzerfreundliches Tool zur Erstellung und Verwaltung von Wochenplänen. Es ermöglicht eine individuelle Anpassung von Farben und Kategorien direkt im UI und kann fast ohne Programmierkenntnisse genutzt werden.

<img width="800" height="600" alt="grafik" src="https://github.com/user-attachments/assets/09d71fc1-36df-4db1-a4c4-26d255abb11d" />


## 🆕 Version 2.3

### Neue Features
- **ICS-Kalender-Export** – Termine als ICS-Datei herunterladen oder als Abo-URL (webcal://) in Kalender-Apps abonnieren.
- **Token-basiertes Abo** – Im Event-Modus werden Abo-Links über generierbare Tokens gesteuert. Token-Verlauf in settings.json.
- **Öffentlicher ICS-Zugang** – Export-Dialog kann für nicht eingeloggte Nutzer freigeschaltet werden.
- **Filter im Export** – Kategorie- und Tages-Chips zum selektiven Export.
- **Embedded ICS-Modal** – `?embedded=true&view=ics` zeigt nur den Export-Dialog.
- **Persistente Booking-IDs** – Jedes Booking erhält eine UUID für stabile Identifikation (ICS, Sync).
- **Drag & Drop auf Uhrzeit** – Termine können auf eine andere Uhrzeit gezogen werden (15-Min-Raster).
- **Resize-Handle** – Dauer eines Termins per Ziehen am unteren Rand ändern.
- **Kontextmenü** – Rechtsklick auf Termine für schnelle Aktionen (Bearbeiten, Duplizieren, Kategorie ändern, Löschen). Unterstützt Einzel- und Mehrfachauswahl.
- **Hilfe-Button** – Neuer FAB mit Übersicht aller Tastenkürzel und URL-Parameter.
- **Shift/Strg + Drag = Kopieren** – Modifier-Taste kann auch während des Drags gedrückt werden.
- **Scroll-Hinweis** – Optischer Pfeil bei horizontal scrollbaren Event-Ansichten.
- **Editierbare Standard-Kategorie** – Name und Farbe der Default-Kategorie sind jetzt änderbar.
- **Kategorie-Zähler** – In den Einstellungen wird pro Kategorie die Anzahl zugeordneter Termine angezeigt.

> Vollständiges Changelog: [CHANGELOG.md](CHANGELOG.md)

## Version 2.0

- **Überlappende Termine** werden nebeneinander dargestellt statt übereinander
- **iFrame-Einbettung** mit URL-Parametern (siehe unten)
- **Verbesserte Mobile-Ansicht** mit Touch-optimierten Elementen
- **Automatische Textfarben** – Text wird automatisch hell/dunkel je nach Hintergrundfarbe
- **Sicheres PHP-Backend** (Whitelist für Dateinamen, File-Locking)
- **Loading-Indikator** beim Speichern/Laden
- **SVG-Icons** für Sidebar statt Unicode-Zeichen (bessere Kompatibilität)

### Optimiert für
- ✅ **Jeden Webspace** – Nur HTML, CSS, JS und minimales PHP erforderlich
- ✅ **Zero Maintenance** – Nach Einrichtung kein Eingriff mehr nötig
- ✅ **iFrame-Integration** – Ideal zum Einbetten auf bestehenden Websites

## Funktionen

- **Individuelle Anpassung:** Farben und Kategorien können frei gewählt und angepasst werden
- **Benutzerfreundliche Oberfläche:** Einfache und intuitive Bedienung zur schnellen Erstellung und Bearbeitung von Einträgen
- **Flexible Einsatzmöglichkeiten:** Geeignet für Sportvereine, Familien, Gemeinden und mehr
- **Übersichtliche Darstellung:** Klar strukturierte Anzeige des Wochenplans
- **Mobile Ansicht:** Für Mobilgeräte optimierte Darstellung
- **Ablage:** Termine können "geparkt" werden und sind nur für Admins sichtbar
- **Drucken:** Plan als A4 Landscape drucken, mit wählbaren Optionen
- **Tage ein-/ausblenden:** Bestimmte Tage können ausgeblendet werden. Leere Tage können automatisch ausgeblendet werden
- **Kalender-Export:** ICS-Download und Abo-URLs (webcal://) für Kalender-Integration
- **Kontextmenü:** Rechtsklick für schnelle Aktionen (Einzel- und Mehrfachauswahl)
- **Hilfe-Overlay:** Tastenkürzel und URL-Parameter auf einen Blick

## Installation

### Option 1: Git Clone (empfohlen für Plesk/cPanel)
Das Repository ist so strukturiert, dass es direkt geklont und verwendet werden kann:

1. Repository auf den Webspace klonen (z.B. über Plesk Git-Integration)
2. `settings.json` mit folgendem Inhalt erstellen:
   ```json
   {
     "title": "Wochenplan",
     "headerColor": "#2196F3",
     "secondaryColor": "#FFC107",
     "startHour": "8",
     "endHour": "22",
     "bookingColors": [],
     "hiddenDays": [],
     "hideEmptyDays": false,
     "loginhash": 108819879,
     "mode": "week",
     "eventStartDate": null,
     "eventDayCount": 3,
     "icsTokens": [],
     "icsPublic": false,
     "icsDayFilter": false,
     "collapseEmptyHours": false
   }
   ```
3. Fertig! Das Standard-Passwort ist `123ChangeMe!` - bitte nach dem ersten Login ändern.

> **Hinweis:** Die Ordner `_archive/` (alte Versionen) und Entwicklungsdateien werden bei `git archive` automatisch ausgeschlossen.

### Option 2: Installer
1. Datei `_archive/installer/2.3/install.php` auf den Webspace hochladen
2. `install.php` im Browser öffnen
3. Admin-Passwort festlegen
4. Fertig!

## URL-Parameter

Alle Parameter können beliebig kombiniert werden.

| Parameter | Beschreibung | Beispiel |
|---|---|---|
| `embedded=true` | Versteckt alle Bedienelemente (Login, FABs, Sidebar) | `?embedded=true` |
| `readonly=true` | Deaktiviert alle Interaktionen | `?readonly=true` |
| `compact=true` | Kompakte Darstellung ohne Header | `?compact=true` |
| `category=Name` | Zeigt nur Termine einer Kategorie | `?category=Jugend` |
| `day=...` | Zeigt nur bestimmte Tage (positiver Filter) | `?day=Mo,Mi,Fr` |
| `hide=...` | Blendet bestimmte Tage aus (negativer Filter) | `?hide=Sa,So` |
| `hideempty=true` | Blendet Tage ohne Termine aus | `?hideempty=true` |
| `collapse=true` | Staucht leere Stunden auf 12px Höhe (nicht im Admin-Modus) | `?collapse=true` |
| `view=ics` | Zeigt nur den ICS-Export-Dialog (mit `embedded=true`) | `?embedded=true&view=ics` |

**Flexible Tag-Eingabe:** Die Parameter `day` und `hide` akzeptieren verschiedene Formate – kommagetrennt, in beliebiger Kombination:
- Nummern: `1` (=Montag) bis `7` (=Sonntag)
im Wochenmodus zuätzlich:
- Deutsch: `Montag`, `Mo`
- Englisch: `Monday`, `Mon`

## iFrame-Einbettung (Beispiele)

```html
<!-- Vollständige Ansicht ohne Bedienelemente -->
<iframe src="https://example.com/weekwise/?embedded=true" width="100%" height="600"></iframe>

<!-- Nur Jugend-Termine anzeigen -->
<iframe src="https://example.com/weekwise/?embedded=true&category=Jugend" width="100%" height="600"></iframe>

<!-- Nur Montag bis Freitag, kompakt -->
<iframe src="https://example.com/weekwise/?embedded=true&hide=Sa,So&compact=true" width="100%" height="400"></iframe>

<!-- Hallenbelegung (readonly, ohne leere Tage) -->
<iframe src="https://example.com/weekwise/?embedded=true&readonly=true&hideempty=true" width="100%" height="600"></iframe>
```

## Anwendungsbeispiele

- **Sportvereine:** Verwaltung von Trainingszeiten und Angeboten
- **Familien:** Übersicht über wöchentliche Termine oder digitaler Stundenplan (im Heimnetzwerk)
- **Privatpersonen:** Planung von wöchentlichen Terminen und Aufgaben
- **Gemeinden:** Veranstaltungskalender, Hallenbelegungspläne
- **Unternehmen:** Ressourcenplanung (Räume, Geräte) – Info-Screens

## Technologien

- PHP (minimal, nur für Datenspeicherung)
- HTML5
- CSS3 (mit CSS Custom Properties)
- Vanilla JavaScript (keine Frameworks erforderlich)

## Projektstruktur

```
WeekWise/                    # Direkt einsatzbereit nach Git Clone
├── index.html               # Haupt-Anwendung
├── style.css                # Alle Styles
├── app.js                   # JavaScript
├── save_json.php            # Server-API
├── ical.php                 # ICS-Kalender-Endpoint
├── ico/                     # SVG Icons
├── README.md
├── CHANGELOG.md             # Versionshistorie
├── .gitignore               # Ignoriert settings.json, bookings.json
├── .gitattributes           # Schließt _archive/ beim Export aus
└── _archive/                # Alte Versionen & Installer (nicht für Produktion)
    ├── Vers 1.2 (02-2025)/
    ├── Vers 1.3(tbd)/
    └── installer/
```

## Mitwirkung

Beiträge zur Weiterentwicklung von WeekWise sind willkommen! 

- Issues für Bugs und Feature-Requests
- Pull Requests für Verbesserungen
- Feedback zur Usability

## Known Bugs & ToDo
- Beim Drucken funktioniert das Skalieren auf Seitenbreite – das automatische Skalieren auf Seitenhöhe funktioniert nicht.


## Lizenz

Dieses Projekt steht unter der [MIT-Lizenz](LICENSE).

## Demo

Live-Demo unter: https://dev0.sv-wolken.de/ – Zugang mit dem hier angegebenen Default-Passwort zum Ausprobieren möglich. 
Bitte aufgeräumt hinterlassen. 

---

WeekWise wurde ursprünglich für die wöchentlichen Angebote eines Sportvereins entwickelt.
