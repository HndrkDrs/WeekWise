# WeekWise – Roadmap

## ✅ Abgeschlossen

### Version 2.0 (Dezember 2025)
- ✅ Überlappende Termine nebeneinander darstellen
- ✅ iFrame-Einbettung mit URL-Parametern (`embedded`, `readonly`, `compact`, `category`, `day`, `hide`)
- ✅ Verbesserte Mobile-Ansicht mit Touch-Elementen
- ✅ Automatische Textfarben (hell/dunkel je nach Hintergrund)
- ✅ Sicheres PHP-Backend (Whitelist, File-Locking)
- ✅ Loading-Indikator beim Speichern/Laden
- ✅ SVG-Icons für Sidebar
- ✅ JavaScript in eigene Datei ausgelagert
- ✅ Installer für Ersteinrichtung

### Version 2.1 (Februar 2026)
- ✅ Druckansicht (A4 Landscape/Portrait, Optionen-Popup)
- ✅ Tage ausblenden (global + URL-Parameter)
- ✅ Leere Tage ausblenden
- ✅ Flexibler Day-Parser (Montag, Mo, Monday, 1)
- ✅ Admin-Ansicht für ausgeblendete Tage (grau/gestreift)
- ✅ Keyboard-Navigation (Escape, Focus-Visible)
- ✅ XSS-Schutz für Farbwerte

### Version 2.2 (Februar 2026)
- ✅ Event-Modus (konfigurierbar: Startdatum + Anzahl Tage)
- ✅ Numerisches Tagesmodell mit automatischer Migration
- ✅ Drag & Drop zum Verschieben von Terminen
- ✅ Shift+Drag zum Kopieren
- ✅ Mehrfachauswahl mit Strg+Click + DEL
- ✅ Schnelles Duplizieren (Button im Modal)
- ✅ Verbesserter Import mit eigenen Dialogen + Kategorie-Migration
- ✅ Settings-Modal Redesign (Sektionen, Chips)
- ✅ CHANGELOG.md erstellt
- ✅ MIT-Lizenz hinzugefügt

### Version 2.3 (Februar 2026)
- ✅ ICS-Kalender-Export (Download als .ics-Datei)
- ✅ ICS-Kalender-Abo (webcal:// URL, Event-Modus)
- ✅ Token-basierte Abo-Verwaltung mit Verlauf
- ✅ Öffentlicher ICS-Zugang (ohne Login)
- ✅ Filter im Export-Dialog (Kategorien, Tage)
- ✅ Embedded ICS-Modal (`?embedded=true&view=ics`)
- ✅ Persistente Booking-IDs (UUID, automatische Migration)
- ✅ Drag & Drop auf andere Uhrzeit (15-Min-Raster)
- ✅ Resize-Handle am unteren Rand (Dauer ändern, 15-Min-Schritte)
- ✅ FAB-Flex-Stack (Buttons rücken automatisch zusammen)
- ✅ Auto-Token bei Event-Modus-Aktivierung
- ✅ Startdatum-Änderungsdialog (Termine migrieren)
- ✅ Optionale Tagesauswahl im ICS-Dialog
- ✅ Kontextmenü (Rechtsklick: Bearbeiten, Duplizieren, Kategorie, Löschen)
- ✅ Hilfe-Button mit Tastenkürzel- und URL-Parameter-Übersicht
- ✅ Shift/Strg + Drag = Kopieren (auch während des Drags)
- ✅ Scroll-Hinweis bei vielen Tagen (Event-Modus)
- ✅ Editierbare Standard-Kategorie (Name/Farbe änderbar)
- ✅ Kategorie-Zähler in den Einstellungen
- ✅ Mobile Ablage: nur für Admins, Termine werden korrekt gerendert
- ✅ Drag aus Sidebar & Drop auf gesamte Sidebar-Fläche
- ✅ Resize öffnet kein falsches Modal mehr
- ✅ Installer auf Version 2.3 aktualisiert

---

## 🔜 Geplant

### Version 2.4 (nächste Iteration)

#### Druckansicht
- [ ] Automatische Skalierung auf Seitenhöhe verbessern

---

## 💡 Ideen (unpriorisiert)

- [ ] **Tooltip** beim Hover über Termine
- [ ] **Auto-Complete** für Trainer-Namen
- [ ] **Swipe-Gesten** für mobile Navigation zwischen Tagen
- [ ] **Responsive Font-Sizes** mit `clamp()`
- [ ] **LocalStorage-Fallback** für PHP-lose Umgebungen
- [ ] **Bestätigungsdialoge** durchgehend als Custom-Modals (statt `confirm()`)
- [ ] **Dark Mode** Support
- [ ] **Mehrbenutzersystem** mit individuellen Berechtigungen
- [ ] **Recurring Events** – Wiederkehrende Termine
