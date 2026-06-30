/**
 * WeekWise – Settings Model
 * Extracted from app.js – config building, color rendering, category management.
 */

import { CONFIG } from '../core/constants.js';
import { getState, getBookings } from '../core/state.js';
import {
    getBookingColors, setBookingColors, getStartHour, getEndHour,
    getHiddenDays, getHideEmptyDays, getCollapseEmptyHours,
    getLoginHash, getCalendarTitle, setCalendarTitle,
    getHeaderColor, getSecondaryColor
} from '../core/persist.js';
import { sanitizeColor, rgbToHex } from '../core/utils.js';
import { ensureDefaultCategory } from './booking-model.js';

/**
 * Build complete config object from current state + localStorage.
 */
export function buildFullConfigData() {
    const state = getState();
    return {
        title: getCalendarTitle(),
        headerColor: getHeaderColor(),
        secondaryColor: getSecondaryColor(),
        startHour: String(getStartHour()),
        endHour: String(getEndHour()),
        bookingColors: getBookingColors(),
        hiddenDays: getHiddenDays(),
        hideEmptyDays: getHideEmptyDays(),
        collapseEmptyHours: getCollapseEmptyHours(),
        loginhash: getLoginHash(),
        mode: state.mode,
        eventStartDate: state.eventStartDate,
        eventDayCount: state.eventDayCount,
        icsTokens: state.icsTokens || [],
        icsPublic: !!state.icsPublic,
        icsDayFilter: !!state.icsDayFilter
    };
}

/**
 * Render category color options into the settings modal.
 */
export function renderColorOptions(containerEl) {
    if (!containerEl) return;

    containerEl.innerHTML = '';
    const savedColors = ensureDefaultCategory();
    const bookings = getBookings();

    const categoryCounts = {};
    bookings.forEach(b => {
        const catId = b.categoryID || 'default';
        categoryCounts[catId] = (categoryCounts[catId] || 0) + 1;
    });

    savedColors.forEach(({ name, color, id }) => {
        const colorEdit = document.createElement('div');
        colorEdit.className = 'color-edit';
        colorEdit.id = id;
        const swatch = document.createElement('div');
        swatch.className = 'color-swatch';
        swatch.style.backgroundColor = sanitizeColor(color);
        const input = document.createElement('input');
        input.type = 'text';
        input.value = name;
        input.placeholder = 'Kategoriename';
        colorEdit.appendChild(swatch);
        colorEdit.appendChild(input);

        const count = categoryCounts[id] || 0;
        const badge = document.createElement('span');
        badge.className = 'category-count';
        badge.textContent = count;
        badge.title = `${count} Termin${count !== 1 ? 'e' : ''}`;
        colorEdit.appendChild(badge);

        if (id !== 'default') {
            const delIcon = document.createElement('span');
            delIcon.className = 'icon del color-delete';
            colorEdit.appendChild(delIcon);
        }

        containerEl.appendChild(colorEdit);
    });

    const addBtn = document.createElement('button');
    addBtn.textContent = 'Neue Kategorie';
    addBtn.type = 'button';
    addBtn.onclick = () => {
        const newId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        const colorEdit = document.createElement('div');
        colorEdit.className = 'color-edit';
        colorEdit.id = newId;
        const swatch = document.createElement('div');
        swatch.className = 'color-swatch';
        swatch.style.backgroundColor = '#2196F3';
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = 'Name';
        const delIcon = document.createElement('span');
        delIcon.className = 'icon del color-delete';
        colorEdit.appendChild(swatch);
        colorEdit.appendChild(input);
        colorEdit.appendChild(delIcon);
        containerEl.insertBefore(colorEdit, addBtn);
    };
    containerEl.appendChild(addBtn);
}

/**
 * Initialize default settings in localStorage.
 */
export function initializeDefaults() {
    const { setStartHour, setEndHour, setHiddenDays, setHideEmptyHours,
            setCollapseEmptyHours, setLoginHash, setBookingColors,
            setHideLoadingLogo } = await import('../core/persist.js');
    // This would be called synchronously from the init flow
    localStorage.setItem('startHour', String(CONFIG.DEFAULT_START_HOUR));
    localStorage.setItem('endHour', String(CONFIG.DEFAULT_END_HOUR));
    localStorage.setItem('bookingColors', '[]');
    localStorage.setItem('loginhash', String(CONFIG.DEFAULT_HASH));
    localStorage.setItem('hiddenDays', '[]');
    localStorage.setItem('hideEmptyDays', 'false');
    localStorage.setItem('collapseEmptyHours', 'false');
}