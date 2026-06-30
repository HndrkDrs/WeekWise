/**
 * WeekWise – ICS Calendar Export Service
 * Extracted from app.js – token generation, URL building, ICS modal logic.
 */

import { getState, getMode, getIcsTokens, setIcsTokens } from '../core/state.js';
import { getDayCount, getDayLabel } from '../models/day-model.js';
import { escapeHtml } from '../core/utils.js';

/**
 * Generate a random 6-character alphanumeric token.
 */
export function generateToken() {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

/**
 * Get the base URL for ical.php requests.
 */
export function getIcsBaseUrl() {
    const loc = window.location;
    const path = loc.pathname.replace(/\/[^/]*$/, '/');
    return `${loc.protocol}//${loc.host}${path}ical.php`;
}

/**
 * Build the ICS download/abo URL based on filter selections.
 */
export function buildIcsUrls(categoryChecks, dayChecks) {
    const base = getIcsBaseUrl();
    const params = new URLSearchParams();
    const state = getState();

    // Category filter
    const allCats = [];
    const selectedCats = [];
    if (categoryChecks) {
        categoryChecks.forEach(cb => {
            allCats.push(cb.value);
            if (cb.checked) selectedCats.push(cb.dataset.name);
        });
    }
    if (selectedCats.length > 0 && selectedCats.length < allCats.length) {
        params.set('category', selectedCats[0]);
    }

    // Day filter
    if (dayChecks) {
        const allDays = [];
        const selectedDays = [];
        const deselectedDays = [];
        dayChecks.forEach(cb => {
            const dayNum = parseInt(cb.value);
            allDays.push(dayNum);
            if (cb.checked) selectedDays.push(dayNum);
            else deselectedDays.push(dayNum);
        });

        if (selectedDays.length < allDays.length) {
            if (selectedDays.length <= deselectedDays.length) {
                params.set('day', selectedDays.join(','));
            } else {
                params.set('hide', deselectedDays.join(','));
            }
        }
    }

    // Download URL
    const downloadParams = new URLSearchParams(params);
    downloadParams.set('download', 'true');
    const downloadUrl = base + '?' + downloadParams.toString();

    // Abo URL (webcal:// for event mode with token)
    let aboUrl = '';
    if (state.mode === 'event' && Array.isArray(state.icsTokens) && state.icsTokens.length > 0) {
        const activeToken = state.icsTokens[state.icsTokens.length - 1].token;
        const aboParams = new URLSearchParams(params);
        aboParams.set('token', activeToken);
        const httpsUrl = base + '?' + aboParams.toString();
        aboUrl = httpsUrl.replace(/^https?:/, 'webcal:');
    }

    return { downloadUrl, aboUrl };
}

/**
 * Count how many bookings match ICS modal filters.
 */
export function countFilteredIcsBookings(bookings, categoryChecks, dayChecks) {
    const selectedCategories = new Set();
    if (categoryChecks) {
        categoryChecks.forEach(cb => { if (cb.checked) selectedCategories.add(cb.value); });
    }
    const allCategoriesSelected = !categoryChecks || selectedCategories.size === categoryChecks.length;

    const selectedDays = new Set();
    if (dayChecks) {
        dayChecks.forEach(cb => { if (cb.checked) selectedDays.add(parseInt(cb.value)); });
    }
    const allDaysSelected = !dayChecks || selectedDays.size === dayChecks.length;

    return bookings.filter(b => {
        if (b.day === 0) return false;
        if (!allDaysSelected && !selectedDays.has(b.day)) return false;
        if (!allCategoriesSelected) {
            const catId = b.categoryID || 'default';
            if (!selectedCategories.has(catId)) return false;
        }
        return true;
    }).length;
}