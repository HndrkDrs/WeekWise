/**
 * WeekWise – Empty Hour Collapse (Y-Axis Compression)
 * Extracted from app.js – analyzes which hours have bookings
 * and builds a Y-coordinate mapper for compact display.
 */

import { timeToMinutes } from '../core/utils.js';
import { CONFIG } from '../core/constants.js';
import {
    getState,
    isLoggedIn
} from '../core/state.js';

/**
 * Determine if empty hours should be collapsed.
 * Only active for public users (not logged in) when the setting is on.
 */
export function shouldCollapseEmpty() {
    if (isLoggedIn()) return false;
    const state = getState();
    const settingsCollapse = localStorage.getItem('collapseEmptyHours') === 'true';
    return settingsCollapse || state.urlParams.collapse;
}

/**
 * Analyze which hours between startHour and endHour have any bookings.
 * Returns array of { hour, empty } for each hour in range.
 * @param {Array} bookings
 * @param {number} startHour
 * @param {number} endHour
 * @param {Set} visibleDayNums - Set of day numbers to consider
 */
export function analyzeEmptyHours(bookings, startHour, endHour, visibleDayNums) {
    const emptyHours = [];
    for (let h = startHour; h < endHour; h++) {
        const hourStart = h * 60;
        const hourEnd = (h + 1) * 60;
        let hasBooking = false;
        for (const booking of bookings) {
            if (visibleDayNums && !visibleDayNums.has(booking.day)) continue;
            const bStart = timeToMinutes(booking.startTime);
            const bEnd = timeToMinutes(booking.endTime);
            if (bStart < hourEnd && bEnd > hourStart) { hasBooking = true; break; }
        }
        emptyHours.push({ hour: h, empty: !hasBooking });
    }
    return emptyHours;
}

/**
 * Build a Y-coordinate mapper from emptyHours analysis.
 * Maps absolute minutes (relative to startHour) to pixel position,
 * collapsing empty hours to COLLAPSED_HOUR_HEIGHT.
 * @returns {{ mapMinuteToPixel, getTotalHeight }}
 */
export function buildYMapper(emptyHours, startHour) {
    const collapsedHeight = CONFIG.COLLAPSED_HOUR_HEIGHT;
    const fullHeight = CONFIG.FULL_HOUR_HEIGHT;
    const hourOffsets = {};
    let accumulated = 0;
    for (let i = 0; i < emptyHours.length; i++) {
        const h = emptyHours[i].hour;
        hourOffsets[h] = accumulated;
        accumulated += emptyHours[i].empty ? collapsedHeight : fullHeight;
    }
    const totalHeight = accumulated;
    return {
        mapMinuteToPixel(minute) {
            const absoluteMinute = startHour * 60 + minute;
            const hour = Math.floor(absoluteMinute / 60);
            const minuteInHour = absoluteMinute % 60;
            const info = emptyHours.find(e => e.hour === hour);
            if (!info) return totalHeight;
            const hourOffset = hourOffsets[hour] || 0;
            const hourHeight = info.empty ? collapsedHeight : fullHeight;
            return hourOffset + (minuteInHour / 60) * hourHeight;
        },
        getTotalHeight() { return totalHeight; }
    };
}