# WeekWise – Wochenpläne zum flexiblen Verwalten und Einbinden in deine Website

WeekWise ist ein benutzerfreundliches Tool zur Erstellung und Verwaltung von Wochenplänen. Es ermöglicht eine individuelle Anpassung von Farben und Kategorien direkt im UI und kann fast ohne Programmierkenntnisse genutzt werden.

## 🆕 Version 2.1

### Neue Features
- **Druckansicht** – Druckt den Plan als A4 Landscape (z.B. zum Aushängen). Optionen: mit/ohne Header, mit/ohne Farben, nach Kategorie gefiltert
- **Tage ausblenden** – Wochentage können in den Einstellungen global ausgeblendet werden (z.B. Wochenende)
- **Leere Tage ausblenden** – Tage ohne Termine können automatisch ausgeblendet werden (Setting + URL-Parameter)
- **Flexibler Day-Parser** – URL-Parameter akzeptieren verschiedene Formate: `Montag`, `Mo`, `monday`, `1` etc.
- **Mehrere Tage filtern** – `?day=Mo,Mi,Fr` zeigt nur diese Tage, `?hide=Sa,So` blendet Tage aus
- **Admin-Ansicht** – Ausgeblendete Tage werden für eingeloggte Admins grau/gestreift statt unsichtbar dargestellt
- **Keyboard-Navigation** – Alle Modals mit Escape schließbar, Focus-Visible-Styles für Tastaturnutzer
- **Verbesserte Sicherheit** – XSS-Schutz für Farbwerte, robuster Passwort-Hash-Vergleich

### Bugfixes (gegenüber 2.0)
- Hash-Vergleich bei Login konnte unter bestimmten Umständen fehlschlagen
- Passwort-Änderung wurde in localStorage geschrieben bevor der Server-Save erfolgreich war
- Endzeit konnte vor Startzeit liegen → kaputte Darstellung
- FAB-Buttons überlappten sich auf Desktop
- CSS-Transitions verursachten unnötige Layout-Reflows

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
- **Tage ein-/ausblenden:** Wochentage und leere Tage können ausgeblendet werden

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
     "loginhash": 108819879
   }
   ```
3. Fertig! Das Standard-Passwort ist `123ChangeMe!` - bitte nach dem ersten Login ändern.

> **Hinweis:** Die Ordner `_archive/` (alte Versionen) und Entwicklungsdateien werden bei `git archive` automatisch ausgeschlossen.

### Option 2: Installer
1. Datei `_archive/installer/2.0/install.php` auf den Webspace hochladen
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

**Flexible Tag-Eingabe:** Die Parameter `day` und `hide` akzeptieren verschiedene Formate – kommagetrennt, in beliebiger Kombination:
- Deutsch: `Montag`, `Mo`
- Englisch: `Monday`, `Mon`
- Nummern: `1` (=Montag) bis `7` (=Sonntag)

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
├── ico/                     # SVG Icons
├── README.md
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
- Neu erstellte Termine können nicht direkt einer Kategorie zugeordnet werden. Erst speichern, dann bearbeiten und zuweisen.
- Die Passwort-Felder werden beim Speichern eines neuen Passworts nicht automatisch geleert. Müssen manuell geleert werden.
- Version 2.2 (Event-Modus) noch nicht im Changelog
- Eigener Changelog erstellen um Readme zu entlasten
- Im Eventmodus scrollen die Daten über den Spalten beim horizontalten scrollen nicht mit (>10 Einträge) sondern kann separat gescrollt werden. Sollte in sync sein. 
- Beim Drucken funktioniert das skalieren auf Seitenbreite - das automatische skalieren auf Seitenhöhe funktioniert nicht. 
- Roadmap ist noch ein WIP Dokument der Version 2.0 --> überarbeiten zu echter Roadmap 
- Ics download und abo im event-Modus ist noch nicht dokumentiert
- Lizenz hinzufügen

## Lizenz

Dieses Projekt ist für freie und gemeinnützige Nutzung gedacht. 
Eine formelle Open-Source-Lizenz (z.B. MIT oder GPL) wird noch hinzugefügt.

## Demo

Live-Demo unter: https://dev0.sv-wolken.de/ – Zugang mit dem hier angegebenen Default-Passwort zum Ausprobieren möglich. 
Bitte aufgeräumt hinterlassen. 

---

WeekWise wurde ursprünglich für die wöchentlichen Angebote eines Sportvereins entwickelt.
