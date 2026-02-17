# Changelog

Alle wichtigen Änderungen an WeekWise werden in dieser Datei dokumentiert.

---

## Version 2.3 (Februar 2026)

### Neue Features
- **ICS-Kalender-Export** – Termine können als ICS-Datei heruntergeladen und in gängige Kalender-Apps (Google Calendar, Outlook, Apple Kalender) importiert werden.
- **ICS-Kalender-Abo** – Im Event-Modus kann ein Abo-Link (webcal://) generiert werden, der von Kalender-Apps als Live-Abonnement genutzt wird.
- **Token-basierte Abo-Verwaltung** – Abo-Zugriff über Tokens, die im Admin-Bereich generiert werden. Token-Verlauf wird gespeichert; alte Tokens können durch Bearbeiten der settings.json reaktiviert werden.
- **Öffentlicher ICS-Zugang** – Kalender-Export kann über eine Einstellung für nicht eingeloggte Nutzer freigeschaltet werden.
- **Filter im Export** – Export-Dialog mit Kategorie- und Tages-Chips zum selektiven Export.
- **Embedded ICS-Modal** – Neuer URL-Parameter `?embedded=true&view=ics` zeigt nur den ICS-Export-Dialog.
- **Neues Kalender-Icon** – Eigener FAB-Button mit Kalender-SVG für den ICS-Export.
- **Persistente Booking-IDs** – Jedes Booking erhält eine eindeutige UUID. Stabile Identifikation über Bearbeitungen, Verschiebungen und ICS-Exporte hinweg. Migration bestehender Bookings geschieht automatisch.
- **Drag & Drop auf andere Uhrzeit** – Termine können per Drag & Drop nicht nur zwischen Tagen, sondern auch auf eine andere Uhrzeit verschoben werden (15-Min-Raster).
- **Resize-Handle** – Am unteren Rand eines Termins kann die Dauer durch Ziehen angepasst werden (15-Min-Schritte).
- **FAB-Flex-Stack** – Floating Action Buttons nutzen jetzt einen Flex-Container und rücken automatisch zusammen, wenn einzelne Buttons ausgeblendet sind.
- **Auto-Token bei Event-Aktivierung** – Beim erstmaligen Aktivieren des Event-Modus wird automatisch ein ICS-Token generiert.
- **Startdatum-Änderungsdialog** – Beim Ändern des Event-Startdatums erscheint ein Dialog mit 3 Optionen: Termine relativ beibehalten, auf neue Daten verschieben oder alle in Ablage. Danach wird ein neuer Token angeboten.
- **Optionale Tagesauswahl im ICS-Dialog** – Neue Admin-Einstellung steuert, ob Nutzer im ICS-Export-Dialog einzelne Tage filtern können (sinnvoll ab vielen Tagen abschaltbar).

### Technisch
- Neuer Server-Endpoint `ical.php` für ICS-Generierung (RFC 5545).
- Week-Modus: VEVENTs mit `RRULE:FREQ=WEEKLY` für wöchentliche Wiederholung.
- Event-Modus: VEVENTs mit absoluten Datumswerten aus `eventStartDate + day offset`.
- Ungültiger/abgelaufener Token liefert leeren Kalender mit Name "Abo abgelaufen" (kein 404).
- VTIMEZONE Europe/Berlin mit CET/CEST-Übergängen eingebettet.
- Settings erweitert um `icsTokens` (Array von `{token, created}`) und `icsPublic` (Boolean).
- Booking-Objekte enthalten jetzt ein `id`-Feld (UUID). ICS-UIDs basieren darauf statt auf Array-Index + Inhalt.
- Beim Import aus Fremdsystemen werden IDs immer neu generiert (keine ID-Kollisionen).
- Beim Duplizieren/Kopieren wird eine neue ID vergeben.
- `snapTo15()` Hilfsfunktion für 15-Minuten-Raster bei Drag & Resize.
- FABs in `.fab-stack` Flex-Container statt feste `bottom`-Positionen. Löst Überlappungsproblem bei konditionaler Sichtbarkeit.
- Settings erweitert um `icsDayFilter` (Boolean) – steuert ob Tages-Chips im ICS-Modal angezeigt werden.
- `showStartDateChangeDialog()` – Custom-Modal mit 4 Optionen für Termin-Migration bei Datumsänderung.
- Installer auf Version 2.3 aktualisiert, inkl. `ical.php`, `calendar.svg` und neuer Settings-Felder.

---

## Version 2.2 (Februar 2026)

### Neue Features
- **Event-Modus** – Neben dem klassischen Wochenmodus gibt es jetzt einen Event-Modus mit frei wählbarem Startdatum und Anzahl der Tage (1–14). Ideal für Turniere, Camps, Seminare etc.
- **Drag & Drop** – Termine können per Drag & Drop zwischen Tagen verschoben werden. Mit Shift+Drag wird der Termin kopiert statt verschoben.
- **Mehrfachauswahl** – Mit Strg+Click können mehrere Termine markiert und mit der DEL-Taste gleichzeitig gelöscht werden.
- **Duplizieren** – Termine können direkt im Bearbeitungs-Modal dupliziert werden.
- **Numerisches Tagesmodell** – Intern werden Tage als Zahlen gespeichert (1=Montag, 7=Sonntag), mit automatischer Migration alter String-basierter Daten.
- **Kategorie bei neuem Termin** – Beim Erstellen eines neuen Termins kann sofort eine Kategorie zugewiesen werden.

### Verbesserungen
- **Import überarbeitet** – Eigene Dialoge statt Browser-Prompts; fehlende Kategorien werden erkannt und können automatisch angelegt oder entfernt werden; Kategorien werden per Name gematcht wenn IDs nicht übereinstimmen.
- **Export erweitert** – Exportierte Termine enthalten jetzt den Kategorienamen für bessere Portabilität.
- **Settings-Modal** – Übersichtlicher mit thematischen Sektionen (Zeitraum, Darstellung, System), Chip-Design für Tages-Checkboxen, Inline-Checkbox für "Leere Tage ausblenden".
- **Event-Scroll synchronisiert** – Im Event-Modus scrollen Spaltenüberschriften und Daten-Spalten jetzt gemeinsam.
- **Passwort-Felder** werden nach dem Speichern automatisch geleert.

### Bugfixes
- Strg+Click Mehrfachauswahl: Der erste bereits hervorgehobene Termin wird jetzt korrekt in die Bulk-Auswahl übernommen.
- Import: Anlegen fehlender Kategorien speichert diese jetzt zuverlässig in den Settings.
- Neue Termine konnten nicht direkt einer Kategorie zugeordnet werden.
- `selectedBookingIndex` wurde beim Erstellen neuer Termine nicht zurückgesetzt.

---

## Version 2.1 (Februar 2026)

### Neue Features
- **Druckansicht** – Druckt den Plan als A4 Landscape oder Portrait. Optionen: mit/ohne Header, mit/ohne Farben, nach Kategorie gefiltert.
- **Tage ausblenden** – Wochentage können in den Einstellungen global ausgeblendet werden (z.B. Wochenende).
- **Leere Tage ausblenden** – Tage ohne Termine können automatisch ausgeblendet werden (Setting + URL-Parameter `hideempty=true`).
- **Flexibler Day-Parser** – URL-Parameter akzeptieren verschiedene Formate: `Montag`, `Mo`, `monday`, `1` etc.
- **Mehrere Tage filtern** – `?day=Mo,Mi,Fr` zeigt nur diese Tage, `?hide=Sa,So` blendet Tage aus.
- **Admin-Ansicht** – Ausgeblendete Tage werden für eingeloggte Admins grau/gestreift statt unsichtbar dargestellt.
- **Keyboard-Navigation** – Alle Modals mit Escape schließbar, Focus-Visible-Styles für Tastaturnutzer.

### Bugfixes
- Hash-Vergleich bei Login konnte unter bestimmten Umständen fehlschlagen.
- Passwort-Änderung wurde in localStorage geschrieben bevor der Server-Save erfolgreich war.
- Endzeit konnte vor Startzeit liegen → kaputte Darstellung.
- FAB-Buttons überlappten sich auf Desktop.
- CSS-Transitions verursachten unnötige Layout-Reflows.
- XSS-Schutz für Farbwerte.

---

## Version 2.0 (Dezember 2025)

### Neue Features
- **Überlappende Termine** werden nebeneinander dargestellt statt übereinander.
- **iFrame-Einbettung** mit URL-Parametern (`embedded`, `readonly`, `compact`, `category`, `day`, `hide`).
- **Verbesserte Mobile-Ansicht** mit Touch-optimierten Elementen.
- **Automatische Textfarben** – Text wird automatisch hell/dunkel je nach Hintergrundfarbe.
- **Sicheres PHP-Backend** mit Whitelist für Dateinamen und File-Locking.
- **Loading-Indikator** beim Speichern/Laden.
- **SVG-Icons** für Sidebar statt Unicode-Zeichen.
- **Ablage** – Termine können „geparkt" werden und sind nur für Admins sichtbar.
- **Installer** für einfache Ersteinrichtung.

### Architektur
- JavaScript in eigene Datei (`app.js`) ausgelagert.
- CSS Custom Properties für dynamische Farbgebung.
- Strukturierte Repo-Organisation für direktes Klonen auf Webspaces.

---

## Version 1.2 (Februar 2025)

- Erste veröffentlichte Version.
- Grundlegende Wochenplan-Funktionalität.
- Inline-JavaScript und CSS.
- Kategorien mit individuellen Farben.
- Admin-Login mit Hash-basierter Authentifizierung.
