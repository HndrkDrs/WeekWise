/**
 * WeekWise – Import/Export Feature
 * Extracted from app.js – JSON export/download and import with category dialogs.
 */

import { getState, getBookings, setBookings } from '../core/state.js';
import { getBookingColors, setBookingColors } from '../core/persist.js';
import { generateBookingId, escapeHtml } from '../core/utils.js';
import { validateBooking } from '../models/booking-model.js';
import { migrateDay } from '../models/day-model.js';
import { saveToServer, loadFromServer } from '../services/server.js';

/**
 * Export bookings as downloadable JSON file.
 */
export async function exportBookings() {
    const bookingColors = getBookingColors();
    const bookings = getBookings();

    const cleanBookings = bookings.map((booking, i) => {
        const clean = {};
        for (const [key, value] of Object.entries(booking)) {
            if (value !== undefined && value !== '') {
                clean[key] = value;
            }
        }
        if (clean.categoryID && clean.categoryID !== 'default') {
            const cat = bookingColors.find(c => c.id === clean.categoryID);
            if (cat) clean.categoryName = cat.name;
        }
        return clean;
    });

    await saveToServer('bookings.json', cleanBookings);

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(cleanBookings, null, 2));
    const downloadLink = document.createElement('a');
    downloadLink.setAttribute('href', dataStr);
    downloadLink.setAttribute('download', 'bookings.json');
    document.body.appendChild(downloadLink);
    downloadLink.click();
    downloadLink.remove();
}

/**
 * Show import dialog for missing categories.
 * Returns: 'create' | 'remove' | 'cancel'
 */
function showImportCategoryDialog(missingList) {
    return new Promise(resolve => {
        const overlay = document.createElement('div');
        overlay.className = 'modal';
        overlay.style.display = 'flex';
        overlay.innerHTML = `
            <div class="modal-content" style="max-width:460px">
                <h3>Fehlende Kategorien</h3>
                <p style="white-space:pre-line;font-size:0.9em;margin-bottom:15px">
                    Folgende Kategorien existieren lokal nicht:\n${escapeHtml(missingList)}</p>
                <div style="display:flex;gap:10px;flex-wrap:wrap">
                    <button type="button" class="import-dialog-btn" data-choice="create">Kategorien anlegen</button>
                    <button type="button" class="import-dialog-btn cancel-button" data-choice="remove">Kategorien entfernen</button>
                    <button type="button" class="import-dialog-btn cancel-button" data-choice="cancel">Abbrechen</button>
                </div>
            </div>`;
        overlay.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-choice]');
            if (btn) { overlay.remove(); resolve(btn.dataset.choice); }
        });
        document.body.appendChild(overlay);
    });
}

/**
 * Show import mode dialog: overwrite or append.
 */
function showImportModeDialog(count) {
    return new Promise(resolve => {
        const overlay = document.createElement('div');
        overlay.className = 'modal';
        overlay.style.display = 'flex';
        overlay.innerHTML = `
            <div class="modal-content" style="max-width:420px">
                <h3>Import: ${count} Termine</h3>
                <p style="font-size:0.9em;margin-bottom:15px">
                    Sollen die bestehenden Termine überschrieben oder die neuen Termine ergänzt werden?</p>
                <div style="display:flex;gap:10px;flex-wrap:wrap">
                    <button type="button" class="import-dialog-btn danger-button" data-choice="overwrite">Überschreiben</button>
                    <button type="button" class="import-dialog-btn" data-choice="append">Ergänzen</button>
                    <button type="button" class="import-dialog-btn cancel-button" data-choice="cancel">Abbrechen</button>
                </div>
            </div>`;
        overlay.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-choice]');
            if (btn) { overlay.remove(); resolve(btn.dataset.choice); }
        });
        document.body.appendChild(overlay);
    });
}

/**
 * Import bookings from a File object.
 * @param {File} file
 * @param {Function} onComplete - Called after import to rebuild UI
 */
export async function importBookings(file, onComplete) {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const newBookings = JSON.parse(e.target.result);
            const validBookings = newBookings.filter(validateBooking);

            if (validBookings.length !== newBookings.length) {
                alert('Warnung: Einige Termine waren ungültig und wurden übersprungen');
            }
            if (validBookings.length === 0) {
                alert('Fehler: Keine gültigen Termine in der Datei gefunden');
                return;
            }

            validBookings.forEach(b => {
                if (typeof b.day === 'string') {
                    const numDay = migrateDay(b.day);
                    if (numDay !== null) b.day = numDay;
                }
            });

            const localColors = getBookingColors();
            const localIds = new Set(localColors.map(c => c.id));
            const localNames = new Map(localColors.map(c => [c.name.toLowerCase(), c]));
            const missingCategories = new Map();

            validBookings.forEach(b => {
                if (b.categoryID && b.categoryID !== 'default' && !localIds.has(b.categoryID)) {
                    const importName = b.categoryName || b.categoryID;
                    const localMatch = localNames.get(importName.toLowerCase());
                    if (localMatch) {
                        b.categoryID = localMatch.id;
                    } else {
                        if (!missingCategories.has(b.categoryID)) {
                            missingCategories.set(b.categoryID, { count: 0, name: importName });
                        }
                        missingCategories.get(b.categoryID).count++;
                    }
                }
            });

            let categoryChoice = null;
            if (missingCategories.size > 0) {
                const missingList = Array.from(missingCategories.entries())
                    .map(([id, info]) => `  • "${info.name}" (${info.count} Termine)`)
                    .join('\n');
                categoryChoice = await showImportCategoryDialog(missingList);
                if (categoryChoice === 'cancel') return;

                if (categoryChoice === 'create') {
                    const defaultColor = getComputedStyle(document.documentElement)
                        .getPropertyValue('--secondary').trim() || '#6c757d';
                    missingCategories.forEach((info, id) => {
                        const catName = (info.name && info.name.trim()) ? info.name : id;
                        localColors.push({ id, name: catName, color: defaultColor });
                    });
                    setBookingColors(localColors);
                } else if (categoryChoice === 'remove') {
                    validBookings.forEach(b => {
                        if (b.categoryID && missingCategories.has(b.categoryID)) {
                            delete b.categoryID;
                            delete b.categoryName;
                        }
                    });
                }
            }

            const importMode = await showImportModeDialog(validBookings.length);
            if (importMode === 'cancel') return;

            const bookings = getBookings();
            if (importMode === 'overwrite') bookings.length = 0;
            validBookings.forEach(b => { b.id = generateBookingId(); });
            bookings.push(...validBookings);
            setBookings(bookings);

            await saveToServer('bookings.json', bookings);

            if (onComplete) onComplete();
            alert(`Import abgeschlossen: ${validBookings.length} Termine ${importMode === 'overwrite' ? 'importiert' : 'hinzugefügt'}.`);
        } catch (error) {
            alert('Fehler: Ungültiges Dateiformat. Bitte eine gültige JSON-Datei verwenden.');
            console.error('Import error:', error);
        }
    };
    reader.readAsText(file);
}