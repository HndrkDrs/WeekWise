/**
 * WeekWise – Day System Model
 * Extracted from app.js – all day-number logic, labels, and parsing.
 */

import { CONFIG } from '../core/constants.js';
import { getState } from '../core/state.js';

// =====================================================
// Day System – Numeric Model
// =====================================================

/**
 * Get total number of schedulable days (excluding Ablage).
 * Week mode: always 7. Event mode: configurable.
 */
export function getDayCount() {
    const state = getState();
    return state.mode === 'event' ? state.eventDayCount : 7;
}

/**
 * Get display label for a day number.
 * day=0 → 'Ablage'
 * Week mode:  day=1 → 'Montag', day=2 → 'Dienstag', etc.
 * Event mode: day=1 → 'Fr 13.02.', derived from startDate.
 */
export function getDayLabel(dayNumber) {
    if (dayNumber === 0) return 'Ablage';
    const state = getState();
    if (state.mode === 'event' && state.eventStartDate) {
        const date = new Date(state.eventStartDate + 'T00:00:00');
        date.setDate(date.getDate() + dayNumber - 1);
        const weekday = date.toLocaleDateString('de-DE', { weekday: 'short' });
        const formatted = date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
        return `${weekday} ${formatted}`;
    }
    return CONFIG.WEEKDAYS[(dayNumber - 1) % 7] || `Tag ${dayNumber}`;
}

/**
 * Get short label for settings checkboxes (week mode only).
 */
export function getDayShortLabel(dayNumber) {
    const shorts = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
    return shorts[(dayNumber - 1) % 7] || `T${dayNumber}`;
}

/**
 * Parse a flexible day input to a day number.
 * Accepts: number strings ("1", "03"), weekday names ("Montag", "monday", "Mo").
 * In event mode, only numbers are accepted.
 */
export function parseDayInput(input) {
    if (!input) return null;
    const trimmed = input.trim();
    // Try numeric first (works in both modes)
    const num = parseInt(trimmed, 10);
    if (!isNaN(num) && num >= 1) return num;
    // In week mode, try aliases
    const state = getState();
    if (state.mode === 'week') {
        const alias = CONFIG.DAY_ALIASES[trimmed.toLowerCase()];
        if (alias) return alias;
    }
    return null;
}

/**
 * Parse comma-separated list of day inputs to day numbers. Deduplicates.
 */
export function parseDayList(input) {
    if (!input) return [];
    const parsed = input.split(',').map(parseDayInput).filter(n => n !== null);
    return [...new Set(parsed)];
}

/**
 * Migrate a booking's day field from old string format to numeric.
 * Returns the numeric day, or null if unmappable.
 * Changed in 2.1., needed for backwards compatibility, deprecated in 3.0
 */
export function migrateDay(dayValue) {
    if (typeof dayValue === 'number') return dayValue;
    if (typeof dayValue === 'string') {
        // 'Ablage' → 0
        if (dayValue.toLowerCase() === 'ablage') return 0;
        // Try as weekday name
        const idx = CONFIG.WEEKDAYS.indexOf(dayValue);
        if (idx !== -1) return idx + 1;
        // Try aliases
        const alias = CONFIG.DAY_ALIASES[dayValue.toLowerCase()];
        if (alias) return alias;
        // Try as number string
        const num = parseInt(dayValue, 10);
        if (!isNaN(num)) return num;
    }
    return null;
}

/**
 * Migrate hiddenDays from old string format to numeric.
 * ["Samstag", "Sonntag"] → [6, 7]
 * Changed in 2.1., needed for backwards compatibility, deprecated in 3.0
 */
export function migrateHiddenDays(hiddenDays) {
    if (!Array.isArray(hiddenDays)) return [];
    return hiddenDays.map(d => {
        if (typeof d === 'number') return d;
        const idx = CONFIG.WEEKDAYS.indexOf(d);
        return idx !== -1 ? idx + 1 : null;
    }).filter(n => n !== null);
}