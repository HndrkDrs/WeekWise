/**
 * WeekWise – Booking Model
 * Extracted from app.js – validation, overlap detection, category management.
 */

import { timeToMinutes, rgbToHex } from '../core/utils.js';
import { getBookingColors, setBookingColors } from '../core/persist.js';

/**
 * Validate a booking object has all required fields.
 */
export function validateBooking(booking) {
    const requiredFields = ['day', 'startTime', 'endTime', 'title'];
    return requiredFields.every(field => {
        const value = booking[field];
        if (typeof value === 'number') return true;
        return value && String(value).trim() !== '';
    });
}

/**
 * Detect overlapping bookings on the same day.
 * Returns an object mapping booking originalIndex → { count, index }.
 */
export function detectOverlaps(bookings, day) {
    const dayBookings = bookings
        .map((booking, index) => ({ ...booking, originalIndex: index }))
        .filter(b => b.day === day);

    if (dayBookings.length === 0) return {};

    dayBookings.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

    const groups = [];
    let currentGroup = [dayBookings[0]];
    let groupEnd = timeToMinutes(dayBookings[0].endTime);

    for (let i = 1; i < dayBookings.length; i++) {
        const booking = dayBookings[i];
        const bookingStart = timeToMinutes(booking.startTime);
        if (bookingStart < groupEnd) {
            currentGroup.push(booking);
            groupEnd = Math.max(groupEnd, timeToMinutes(booking.endTime));
        } else {
            groups.push(currentGroup);
            currentGroup = [booking];
            groupEnd = timeToMinutes(booking.endTime);
        }
    }
    groups.push(currentGroup);

    const overlapInfo = {};
    groups.forEach(group => {
        group.forEach((booking, index) => {
            overlapInfo[booking.originalIndex] = { count: group.length, index };
        });
    });
    return overlapInfo;
}

/**
 * Ensure the 'default' category exists in bookingColors.
 * Returns the updated array.
 */
export function ensureDefaultCategory() {
    const bookingColors = getBookingColors();
    let defaultCat = bookingColors.find(c => c.id === 'default');
    if (!defaultCat) {
        const secondaryColor =
            getComputedStyle(document.documentElement).getPropertyValue('--secondary').trim() ||
            '#FFC107';
        defaultCat = { id: 'default', name: 'Standard', color: secondaryColor };
        bookingColors.unshift(defaultCat);
        setBookingColors(bookingColors);
    }
    return bookingColors;
}

/**
 * Get display name of the default category.
 */
export function getDefaultCategoryName() {
    const bookingColors = getBookingColors();
    const defaultCat = bookingColors.find(c => c.id === 'default');
    return defaultCat ? defaultCat.name : 'Standard';
}

/**
 * Build category <option> elements for a <select>.
 */
export function buildCategoryOptions(selectEl) {
    const bookingColors = ensureDefaultCategory();
    selectEl.innerHTML = '';
    bookingColors.forEach(color => {
        const option = document.createElement('option');
        option.value = color.id;
        option.textContent = color.name;
        if (color.id !== 'default') {
            option.style.color = rgbToHex(color.color);
        }
        selectEl.appendChild(option);
    });
}