/**
 * WeekWise – Centralized Application State
 * Extracted from app.js – single source of truth for mutable state.
 * Provides getters/setters and change tracking via event emitter.
 */

import { CONFIG } from './constants.js';

// ── Internal state (only mutated through this module) ──

const _state = {
    bookings: [],
    isLoggedIn: false,
    selectedDay: null,
    selectedColumn: null,
    selectedBookingIndex: null,
    selectedBookingIndices: new Set(),   // Multi-select (Ctrl+Click)
    sidebarOpen: false,
    urlParams: {},
    // Event mode state
    mode: 'week',           // 'week' or 'event'
    eventStartDate: null,   // ISO date string, e.g. '2026-02-13'
    eventDayCount: 3,       // Number of days in event mode
    // Drag & drop state
    dragBookingIndex: null,
    dragIsCopy: false,
    dragGhost: null,
    resizing: false,
    justResized: false,
    // ICS state
    icsTokens: [],          // Array of {token, created} – last entry is active
    icsPublic: false,        // Whether ICS export is public (no login needed)
    icsDayFilter: false      // Whether users can filter by day in ICS modal
};

/** Internal loading start timestamp */
let _loadingStartTime = Date.now();

const _listeners = [];

// ── Public API ─────────────────────────────────────────

/**
 * Get a reference to the entire state object (read-only for external consumers).
 * Mutations should go through the setter methods below.
 */
export function getState() {
    return _state;
}

/**
 * Subscribe to state changes.
 * @param {Function} fn - Called with (key, value) on each change.
 * @returns {Function} unsubscribe function
 */
export function onStateChange(fn) {
    _listeners.push(fn);
    return () => {
        const idx = _listeners.indexOf(fn);
        if (idx !== -1) _listeners.splice(idx, 1);
    };
}

function _notify(key, value) {
    _listeners.forEach(fn => fn(key, value));
}

// ── Booking state ─────────────────────────────────────

export function getBookings() { return _state.bookings; }
export function setBookings(bookings) {
    _state.bookings = bookings;
    _notify('bookings', bookings);
}

// ── Auth state ────────────────────────────────────────

export function isLoggedIn() { return _state.isLoggedIn; }
export function setLoggedIn(value) {
    _state.isLoggedIn = !!value;
    _notify('isLoggedIn', _state.isLoggedIn);
}

// ── Selection state ───────────────────────────────────

export function getSelectedDay() { return _state.selectedDay; }
export function setSelectedDay(day) { _state.selectedDay = day; }

export function getSelectedBookingIndex() { return _state.selectedBookingIndex; }
export function setSelectedBookingIndex(idx) {
    _state.selectedBookingIndex = idx;
    _notify('selectedBookingIndex', idx);
}

export function getSelectedBookingIndices() {
    return _state.selectedBookingIndices;
}
export function clearMultiSelection() {
    _state.selectedBookingIndices.clear();
    _notify('selectedBookingIndices', _state.selectedBookingIndices);
}

// ── Sidebar ───────────────────────────────────────────

export function isSidebarOpen() { return _state.sidebarOpen; }
export function setSidebarOpen(value) { _state.sidebarOpen = !!value; }

// ── Mode ──────────────────────────────────────────────

export function getMode() { return _state.mode; }
export function setMode(mode) {
    _state.mode = mode;
    _notify('mode', mode);
}

// ── Event mode ────────────────────────────────────────

export function getEventStartDate() { return _state.eventStartDate; }
export function setEventStartDate(date) {
    _state.eventStartDate = date;
    _notify('eventStartDate', date);
}

export function getEventDayCount() { return _state.eventDayCount; }
export function setEventDayCount(count) {
    _state.eventDayCount = Math.max(1, Math.min(99, count));
    _notify('eventDayCount', _state.eventDayCount);
}

// ── Drag & drop ───────────────────────────────────────

export function getDragBookingIndex() { return _state.dragBookingIndex; }
export function setDragBookingIndex(idx) { _state.dragBookingIndex = idx; }
export function isDragCopy() { return _state.dragIsCopy; }
export function setDragCopy(value) { _state.dragIsCopy = !!value; }
export function isResizing() { return _state.resizing; }
export function setResizing(value) { _state.resizing = !!value; }
export function isJustResized() { return _state.justResized; }
export function setJustResized(value) { _state.justResized = !!value; }

// ── ICS ───────────────────────────────────────────────

export function getIcsTokens() { return _state.icsTokens; }
export function setIcsTokens(tokens) {
    _state.icsTokens = Array.isArray(tokens) ? tokens : [];
    _notify('icsTokens', _state.icsTokens);
}

// ── URL Params ────────────────────────────────────────

export function getUrlParams() { return _state.urlParams; }
export function setUrlParams(params) {
    _state.urlParams = params;
    _notify('urlParams', params);
}

// ── Loading ───────────────────────────────────────────

export function getLoadingStartTime() { return _loadingStartTime; }
export function resetLoadingStartTime() {
    _loadingStartTime = Date.now();
}