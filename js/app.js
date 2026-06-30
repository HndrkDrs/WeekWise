/**
 * WeekWise 3.0 – Application Entry Point (ES Modules)
 *
 * Architecture:
 *   core/       – constants, state, persistence, utilities (zero DOM)
 *   models/     – day, booking, settings business logic
 *   services/   – server, auth, ics (I/O and auth)
 *   features/   – url-params, empty-collapse, print, import-export, drag-drop
 *   ui/         – renderer, components, modals, sidebar, context-menu
 *
 * This file imports all modules and wires them together.
 * The monolithic app.js remains as the fallback for index.html
 * until the build step migrates HTML <script> tags.
 */

import { CONFIG } from './core/constants.js';
import * as state from './core/state.js';
import * as persist from './core/persist.js';
import * as utils from './core/utils.js';

import * as dayModel from './models/day-model.js';
import * as bookingModel from './models/booking-model.js';
import * as settingsModel from './models/settings-model.js';

import * as server from './services/server.js';
import * as auth from './services/auth.js';
import * as ics from './services/ics-service.js';

import * as urlParams from './features/url-params.js';
import * as collapse from './features/empty-collapse.js';
import * as print from './features/print.js';
import * as impex from './features/import-export.js';

// ── Initialize ────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
    // Parse URL parameters first
    urlParams.parseUrlParams();

    // Load settings and bookings from server
    try {
        const [config, bookings] = await Promise.all([
            server.loadFromServer('settings.json'),
            server.loadFromServer('bookings.json')
        ]);

        if (config) {
            // Apply config
            document.querySelector('.calendar-header h2').textContent = config.title || 'Wochenplan';
            document.documentElement.style.setProperty('--header-color', config.headerColor || '#2196F3');
            document.documentElement.style.setProperty('--secondary', config.secondaryColor || '#FFC107');
            persist.setStartHour(config.startHour || CONFIG.DEFAULT_START_HOUR);
            persist.setEndHour(config.endHour || CONFIG.DEFAULT_END_HOUR);
            persist.setBookingColors(config.bookingColors || []);
            persist.setLoginHash(config.loginhash || CONFIG.DEFAULT_HASH);

            state.setMode(config.mode || 'week');
            state.setEventStartDate(config.eventStartDate || null);
            state.setEventDayCount(config.eventDayCount || 3);
            state.setIcsTokens(Array.isArray(config.icsTokens) ? config.icsTokens : []);

            // Migrate hiddenDays
            const rawHidden = config.hiddenDays || [];
            const migratedHidden = dayModel.migrateHiddenDays(rawHidden);
            persist.setHiddenDays(migratedHidden);
            persist.setHideEmptyDays(config.hideEmptyDays || false);
            persist.setCollapseEmptyHours(config.collapseEmptyHours || false);
        } else {
            // Initialize defaults
            settingsModel.initializeDefaults();
        }

        if (bookings && Array.isArray(bookings)) {
            let migrated = false;
            const migratedBookings = bookings.map(b => {
                if (typeof b.day === 'string') {
                    const numDay = dayModel.migrateDay(b.day);
                    if (numDay !== null) { b.day = numDay; migrated = true; }
                }
                if (utils.ensureBookingId(b)) migrated = true;
                return b;
            });
            state.setBookings(migratedBookings);

            if (migrated) {
                try {
                    await server.saveToServer('bookings.json', migratedBookings);
                    console.log('Bookings migrated (day format / IDs)');
                } catch (e) {
                    console.warn('Could not save migrated bookings:', e);
                }
            }
        }
    } catch (err) {
        console.error('Error loading data:', err);
        settingsModel.initializeDefaults();
    }

    // Show edit button unless embedded/readonly
    const params = state.getUrlParams();
    if (!params.embedded && !params.readonly) {
        document.getElementById('editButton').style.display = 'flex';
    }

    // Show ICS button for public users
    if (state.getState().icsPublic && !params.readonly && !params.embedded) {
        document.getElementById('icsButton').style.display = 'flex';
    }

    // ?view=ics embedded mode
    if (params.view === 'ics' && params.embedded) {
        document.getElementById('main').style.display = 'none';
        document.getElementById('sidebar')?.style.setProperty('display', 'none', 'important');
        showIcsModal();
    }

    // Initial render
    createTimeOptions();
    buildMobileTiles();
    createDayColumns();

    // Wire event listeners
    wireEventListeners();
});

// ── Event wiring ──────────────────────────────────────

function wireEventListeners() {
    const params = state.getUrlParams();

    document.getElementById('editButton')?.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!state.isLoggedIn()) {
            document.getElementById('loginModal').style.display = 'flex';
            document.getElementById('password').focus();
        } else {
            showOptionsModal();
        }
    });

    document.getElementById('printButton')?.addEventListener('click', () => {
        print.togglePrintPopup();
    });

    document.getElementById('icsButton')?.addEventListener('click', () => {
        showIcsModal();
    });

    document.getElementById('helpButton')?.addEventListener('click', () => {
        document.getElementById('helpModal').style.display = 'flex';
    });

    // Import file handler
    document.getElementById('importFile')?.addEventListener('change', (e) => {
        impex.importBookings(e.target.files[0], () => {
            buildMobileTiles();
            createDayColumns();
        });
    });
}

// ── Placeholders – these will be replaced by UI module extractions ──

function createTimeOptions() { /* TODO: extract to ui/components.js */ }
function buildMobileTiles() { /* TODO: extract to ui/renderer.js */ }
function createDayColumns() { /* TODO: extract to ui/renderer.js */ }
function showIcsModal() { /* TODO: extract to ui/modals/ics-modal.js */ }
function showOptionsModal() { /* TODO: extract to ui/modals/settings-modal.js */ }

// ── Expose needed functions to window for onclick handlers ──

window.executePrint = print.executePrint;
window.togglePrintPopup = print.togglePrintPopup;
window.exportBookings = impex.exportBookings;
window.importBookings = impex.importBookings;
window.toggleSidebar = toggleSidebar; // placeholder