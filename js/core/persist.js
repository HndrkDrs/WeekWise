/**
 * WeekWise – Persistence Layer
 * Abstracts localStorage access behind named getters/setters.
 * Extracted from app.js – all localStorage calls consolidated here.
 */

import { CONFIG } from './constants.js';

// ── Generic helpers ───────────────────────────────────

function _get(key, fallback) {
    return localStorage.getItem(key) || fallback;
}

function _set(key, value) {
    localStorage.setItem(key, String(value));
}

function _getJson(key, fallback) {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    try { return JSON.parse(raw); } catch (e) { return fallback; }
}

function _setJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

// ── Time Range ────────────────────────────────────────

export function getStartHour() {
    return parseInt(_get('startHour', String(CONFIG.DEFAULT_START_HOUR)));
}
export function setStartHour(hour) { _set('startHour', hour); }

export function getEndHour() {
    return parseInt(_get('endHour', String(CONFIG.DEFAULT_END_HOUR)));
}
export function setEndHour(hour) { _set('endHour', hour); }

// ── Hidden Days ───────────────────────────────────────

export function getHiddenDays() {
    return _getJson('hiddenDays', []);
}
export function setHiddenDays(days) { _setJson('hiddenDays', days); }

// ── Hide Empty Days ───────────────────────────────────

export function getHideEmptyDays() {
    return _get('hideEmptyDays', 'false') === 'true';
}
export function setHideEmptyDays(value) { _set('hideEmptyDays', value); }

// ── Collapse Empty Hours ──────────────────────────────

export function getCollapseEmptyHours() {
    return _get('collapseEmptyHours', 'false') === 'true';
}
export function setCollapseEmptyHours(value) { _set('collapseEmptyHours', value); }

// ── Booking Colors (Categories) ───────────────────────

export function getBookingColors() {
    return _getJson('bookingColors', []);
}
export function setBookingColors(colors) { _setJson('bookingColors', colors); }

// ── Login Hash ────────────────────────────────────────

export function getLoginHash() {
    return Number(_get('loginhash', String(CONFIG.DEFAULT_HASH)));
}
export function setLoginHash(hash) { _set('loginhash', hash); }

// ── Header Color ──────────────────────────────────────

export function getHeaderColor() {
    return _get('headerColor', '#2196F3');
}
export function setHeaderColor(color) { _set('headerColor', color); }

// ── Secondary Color ───────────────────────────────────

export function getSecondaryColor() {
    return _get('secondaryColor', '#FFC107');
}
export function setSecondaryColor(color) { _set('secondaryColor', color); }

// ── Calendar Title ────────────────────────────────────

export function getCalendarTitle() {
    return _get('calendarTitle', 'Wochenplan');
}
export function setCalendarTitle(title) { _set('calendarTitle', title); }