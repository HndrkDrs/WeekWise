# WeekWise – Wochenplaner zur flexiblen Gestaltung deiner Woche

WeekWise ist ein benutzerfreundliches Tool zur Erstellung und Verwaltung von Wochenplänen. Es ermöglicht eine individuelle Anpassung von Farben und Kategorien direkt im UI und kann fast ohne Programmierkenntnisse genutzt werden.

## 🆕 Version 2.0 - Neu!

Die Version 2.0 bringt viele Verbesserungen:

### Neue Features
- **Überlappende Termine** werden jetzt nebeneinander dargestellt statt übereinander
- **iFrame-Einbettung** mit URL-Parametern:
  - `?embedded=true` - Versteckt alle Bedienelemente
  - `?category=Jugend` - Zeigt nur Termine einer Kategorie
  - `?day=Montag` - Zeigt nur einen bestimmten Tag
  - `?readonly=true` - Deaktiviert alle Interaktionen
  - `?compact=true` - Kompakte Darstellung ohne Header
- **Verbesserte Mobile-Ansicht** mit Touch-optimierten Elementen
- **Automatische Textfarben** - Text wird automatisch hell/dunkel je nach Hintergrundfarbe
- **Bessere Sicherheit** im PHP-Backend (Whitelist für Dateinamen, File-Locking)
- **Loading-Indikator** beim Speichern/Laden
- **SVG-Icons** für Sidebar statt Unicode-Zeichen (bessere Kompatibilität)

### Optimiert für
- ✅ **Jeden Webspace** - Nur HTML, CSS, JS und minimales PHP erforderlich
- ✅ **Zero Maintenance** - Nach Einrichtung kein Eingriff mehr nötig
- ✅ **iFrame-Integration** - Ideal zum Einbetten auf bestehenden Websites

## Funktionen

- **Individuelle Anpassung:** Farben und Kategorien können frei gewählt und angepasst werden
- **Benutzerfreundliche Oberfläche:** Einfache und intuitive Bedienung zur schnellen Erstellung und Bearbeitung von Einträgen
- **Flexible Einsatzmöglichkeiten:** Geeignet für Sportvereine, Familien, Gemeinden und mehr
- **Übersichtliche Darstellung:** Klar strukturierte Anzeige des Wochenplans
- **Mobile Ansicht:** Für Mobilgeräte optimierte Darstellung
- **Ablage:** Termine können "geparkt" werden und sind nur für Admins sichtbar

## Installation

### Version 2.0 (empfohlen)
1. Datei `installer/2.0/install.php` auf den Webspace hochladen
2. `install.php` im Browser öffnen
3. Admin-Passwort festlegen
4. Fertig!

### Version 1.2 (Legacy)
1. Datei `installer/0.1/install.php` auf den Webspace hochladen
2. `install.php` im Browser öffnen
3. Den Anweisungen folgen

## iFrame-Einbettung (Beispiele)

```html
<!-- Vollständige Ansicht ohne Bedienelemente -->
<iframe src="https://example.com/weekwise/?embedded=true" width="100%" height="600"></iframe>

<!-- Nur Jugend-Termine anzeigen -->
<iframe src="https://example.com/weekwise/?embedded=true&category=Jugend" width="100%" height="600"></iframe>

<!-- Nur Montag anzeigen, kompakt -->
<iframe src="https://example.com/weekwise/?embedded=true&day=Montag&compact=true" width="100%" height="400"></iframe>
```

## Anwendungsbeispiele

- **Sportvereine:** Verwaltung von Trainingszeiten und Angeboten
- **Familien:** Erstellung von Essensplänen
- **Privatpersonen:** Planung von wöchentlichen Terminen und Aufgaben
- **Gemeinden:** Veranstaltungskalender
- **Unternehmen:** Ressourcenplanung (Räume, Geräte)

## Technologien

- PHP (minimal, nur für Datenspeicherung)
- HTML5
- CSS3 (mit CSS Custom Properties)
- Vanilla JavaScript (keine Frameworks erforderlich)

## Projektstruktur

```
WeekWise/
├── v2.0/                    # Aktuelle Version
│   ├── index.html           # Haupt-Anwendung
│   ├── style.css            # Alle Styles
│   ├── app.js               # JavaScript
│   ├── save_json.php        # Server-API
│   └── ico/                 # SVG Icons
├── Vers 1.2 (02-2025)/      # Legacy Version
├── Vers 1.3(tbd)/           # Geplante Features (alt)
├── installer/               # Installer-Skripte
│   ├── 0.1/                 # Legacy Installer
│   └── 2.0/                 # Neuer Installer
└── README.md
```

## Mitwirkung

Beiträge zur Weiterentwicklung von WeekWise sind willkommen! 

- Issues für Bugs und Feature-Requests
- Pull Requests für Verbesserungen
- Feedback zur Usability

## Lizenz

Dieses Projekt ist für freie und gemeinnützige Nutzung gedacht. 
Eine formelle Open-Source-Lizenz (z.B. MIT oder GPL) wird noch hinzugefügt.

## Demo

Live-Demo unter: https://weekwise.sv-wolken.de/

---

WeekWise wurde ursprünglich für die wöchentlichen Angebote eines Sportvereins entwickelt.
