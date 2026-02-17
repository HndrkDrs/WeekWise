/**
 * WeekWise 2.3 - Application JavaScript
 * 
 * A weekly schedule planner optimized for:
 * - Running on any webspace (HTML, JS, PHP)
 * - Zero maintenance after setup
 * - Flexible embedding via iFrame
 * - Event mode: date-based multi-day schedules
 * - ICS calendar export and subscription
 */

// =====================================================
// Configuration & State
// =====================================================

const CONFIG = {
    /** Canonical weekday names for week mode (index+1 = day number) */
    WEEKDAYS: ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'],
    /** Map flexible text inputs → day number (1-7). Used for URL params in week mode only. */
    DAY_ALIASES: {
        // German full
        'montag': 1, 'dienstag': 2, 'mittwoch': 3,
        'donnerstag': 4, 'freitag': 5, 'samstag': 6, 'sonntag': 7,
        // German short
        'mo': 1, 'di': 2, 'mi': 3, 'do': 4, 'fr': 5, 'sa': 6, 'so': 7,
        // English full
        'monday': 1, 'tuesday': 2, 'wednesday': 3,
        'thursday': 4, 'friday': 5, 'saturday': 6, 'sunday': 7,
        // English short
        'mon': 1, 'tue': 2, 'wed': 3, 'thu': 4, 'fri': 5, 'sat': 6, 'sun': 7
    },
    DEFAULT_START_HOUR: 8,
    DEFAULT_END_HOUR: 22,
    DEFAULT_HASH: -1352366804,
    ALLOWED_FILENAMES: ['settings.json', 'bookings.json']
};

const state = {
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

// =====================================================
// Day System – Numeric Model
// =====================================================

/**
 * Get total number of schedulable days (excluding Ablage).
 * Week mode: always 7. Event mode: configurable.
 */
function getDayCount() {
    return state.mode === 'event' ? state.eventDayCount : 7;
}

/**
 * Get display label for a day number.
 * day=0 → 'Ablage'
 * Week mode:  day=1 → 'Montag', day=2 → 'Dienstag', etc.
 * Event mode: day=1 → 'Fr 13.02.', derived from startDate.
 */
function getDayLabel(dayNumber) {
    if (dayNumber === 0) return 'Ablage';
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
function getDayShortLabel(dayNumber) {
    const shorts = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
    return shorts[(dayNumber - 1) % 7] || `T${dayNumber}`;
}

/**
 * Ensure the 'default' category always exists in bookingColors.
 * Returns the updated array (also saves to localStorage).
 */
function ensureDefaultCategory() {
    const bookingColors = JSON.parse(localStorage.getItem('bookingColors') || '[]');
    let defaultCat = bookingColors.find(c => c.id === 'default');
    if (!defaultCat) {
        const secondaryColor = getComputedStyle(document.documentElement)
            .getPropertyValue('--secondary').trim() || '#FFC107';
        defaultCat = { id: 'default', name: 'Standard', color: secondaryColor };
        bookingColors.unshift(defaultCat);
        localStorage.setItem('bookingColors', JSON.stringify(bookingColors));
    }
    return bookingColors;
}

/**
 * Get the display name of the default category.
 */
function getDefaultCategoryName() {
    const bookingColors = JSON.parse(localStorage.getItem('bookingColors') || '[]');
    const defaultCat = bookingColors.find(c => c.id === 'default');
    return defaultCat ? defaultCat.name : 'Standard';
}

/**
 * Build category <option> elements for a <select>.
 * Populates with default category + all custom categories.
 */
function buildCategoryOptions(selectEl) {
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

/**
 * Parse a flexible day input to a day number.
 * Accepts: number strings ("1", "03"), weekday names ("Montag", "monday", "Mo").
 * In event mode, only numbers are accepted.
 */
function parseDayInput(input) {
    if (!input) return null;
    const trimmed = input.trim();
    // Try numeric first (works in both modes)
    const num = parseInt(trimmed, 10);
    if (!isNaN(num) && num >= 1) return num;
    // In week mode, try aliases
    if (state.mode === 'week') {
        const alias = CONFIG.DAY_ALIASES[trimmed.toLowerCase()];
        if (alias) return alias;
    }
    return null;
}

/**
 * Parse comma-separated list of day inputs to day numbers. Deduplicates.
 */
function parseDayList(input) {
    if (!input) return [];
    const parsed = input.split(',').map(parseDayInput).filter(n => n !== null);
    return [...new Set(parsed)];
}

/**
 * Migrate a booking's day field from old string format to numeric.
 * Returns the numeric day, or null if unmappable.
 * Changed in 2.1., needed for backwards compatibility, deprecated in 3.0
 */
function migrateDay(dayValue) {
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
function migrateHiddenDays(hiddenDays) {
    if (!Array.isArray(hiddenDays)) return [];
    return hiddenDays.map(d => {
        if (typeof d === 'number') return d;
        const idx = CONFIG.WEEKDAYS.indexOf(d);
        return idx !== -1 ? idx + 1 : null;
    }).filter(n => n !== null);
}

// =====================================================
// URL Parameter Handling (Embedded Mode)
// =====================================================

function parseUrlParams() {
    const params = new URLSearchParams(window.location.search);
    
    // Parse day parameter: supports single or comma-separated, flexible formats
    const dayParam = params.get('day');
    const parsedDays = parseDayList(dayParam);
    
    // ?hide=6,7 or ?hide=Sa,So → hide these days (negative filter)
    const hideParam = params.get('hide');
    const parsedHide = parseDayList(hideParam);
    
    state.urlParams = {
        embedded: params.get('embedded') === 'true',
        category: params.get('category'),
        days: parsedDays,
        hideDays: parsedHide,
        readonly: params.get('readonly') === 'true',
        compact: params.get('compact') === 'true',
        hideempty: params.get('hideempty') === 'true',
        view: params.get('view') || null
    };
    
    // Apply body classes for embedded modes
    if (state.urlParams.embedded) {
        document.body.classList.add('embedded');
    }
    if (state.urlParams.compact) {
        document.body.classList.add('compact');
    }
    if (state.urlParams.readonly) {
        document.body.classList.add('readonly');
    }
}

// =====================================================
// Utility Functions
// =====================================================

/**
 * Convert string to hash (same algorithm as PHP)
 */
function stringToHash(str) {
    let hash = 0;
    if (str.length === 0) return hash;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash | 0; // Convert to 32bit integer
    }
    return hash;
}

/**
 * Convert RGB string to Hex
 */
function rgbToHex(rgb) {
    if (!rgb) return '#000000';
    if (rgb.startsWith('#')) return rgb;
    if (rgb.startsWith('var(')) return rgb;
    
    const match = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
    if (!match) return rgb;
    
    const r = parseInt(match[1]).toString(16).padStart(2, '0');
    const g = parseInt(match[2]).toString(16).padStart(2, '0');
    const b = parseInt(match[3]).toString(16).padStart(2, '0');
    return '#' + r + g + b;
}

/**
 * Check if a color is light or dark
 */
function isLightColor(color) {
    let r, g, b;
    
    if (color.startsWith('#')) {
        const hex = color.slice(1);
        r = parseInt(hex.slice(0, 2), 16);
        g = parseInt(hex.slice(2, 4), 16);
        b = parseInt(hex.slice(4, 6), 16);
    } else if (color.startsWith('rgb')) {
        const match = color.match(/(\d+)/g);
        if (match) {
            [r, g, b] = match.map(Number);
        } else {
            return false;
        }
    } else {
        return false; // Default to dark for CSS variables
    }
    
    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5;
}

/**
 * Format time string
 */
function formatTime(hour, minute) {
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}

/**
 * Parse time string to minutes
 */
function timeToMinutes(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
}

/**
 * Show loading indicator
 */
function showLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.classList.add('active');
}

/**
 * Hide loading indicator
 */
function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.classList.remove('active');
}

/**
 * Sanitize HTML to prevent XSS
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Generate a unique booking ID (UUID v4 via crypto API, fallback to random).
 * Used to stably identify bookings across edits, drag, ICS export, etc.
 */
function generateBookingId() {
    if (crypto && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    // Fallback for older browsers
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

/**
 * Ensure a booking has an id. If missing, assign one.
 * Returns true if an id was assigned (booking was mutated).
 */
function ensureBookingId(booking) {
    if (!booking.id) {
        booking.id = generateBookingId();
        return true;
    }
    return false;
}

/**
 * Snap minutes to the nearest 15-minute grid.
 */
function snapTo15(minutes) {
    return Math.round(minutes / 15) * 15;
}

/**
 * Show or hide the drag-copy ghost indicator.
 * Creates it lazily, removes when no longer copying.
 */
function updateDragGhost(isCopy, bookingIndex) {
    if (isCopy && !state.dragGhost) {
        const booking = state.bookings[bookingIndex];
        if (!booking) return;
        const ghost = document.createElement('div');
        ghost.className = 'drag-ghost drag-ghost-floating';
        ghost.textContent = '+ Kopie';
        document.body.appendChild(ghost);
        state.dragGhost = ghost;
    } else if (!isCopy && state.dragGhost) {
        state.dragGhost.remove();
        state.dragGhost = null;
    }
}

// =====================================================
// Print Functions
// =====================================================

function togglePrintPopup() {
    const popup = document.getElementById('printPopup');
    if (!popup) return;
    
    const isVisible = popup.classList.contains('visible');
    if (isVisible) {
        popup.classList.remove('visible');
        return;
    }
    
    // Populate category dropdown
    const bookingColors = JSON.parse(localStorage.getItem('bookingColors') || '[]');
    const categorySelect = document.getElementById('printCategory');
    categorySelect.innerHTML = '<option value="">Alle</option>';
    bookingColors.forEach(color => {
        const option = document.createElement('option');
        option.textContent = color.name;
        option.value = color.id;
        categorySelect.appendChild(option);
    });
    
    popup.classList.add('visible');
}

function executePrint() {
    const withHeader = document.getElementById('printWithHeader').checked;
    const withColors = document.getElementById('printWithColors').checked;
    const category = document.getElementById('printCategory').value;
    const orientation = document.getElementById('printOrientation')?.value || 'landscape';
    
    // Apply print classes
    if (!withHeader) document.body.classList.add('print-no-header');
    if (!withColors) document.body.classList.add('print-no-colors');
    document.body.classList.add('print-' + orientation);
    
    // Inject @page orientation (CSS can't do this conditionally)
    const pageStyle = document.createElement('style');
    pageStyle.id = 'print-page-style';
    pageStyle.textContent = `@page { size: A4 ${orientation}; }`;
    document.head.appendChild(pageStyle);
    
    if (category) {
        // Hide bookings not matching category
        document.querySelectorAll('.booking').forEach(el => {
            const idx = parseInt(el.dataset.index);
            const booking = state.bookings[idx];
            if (booking && booking.categoryID !== category) {
                el.classList.add('print-hidden');
            }
        });
    }
    
    // Recalculate grid to exclude hidden columns (admin sees greyed cols, print should not)
    const weekdaysContainer = document.querySelector('.weekdays');
    const dayColumnsContainer = document.getElementById('dayColumns');
    const savedWeekdaysCols = weekdaysContainer?.style.gridTemplateColumns;
    const savedDayColsCols = dayColumnsContainer?.style.gridTemplateColumns;
    
    const visibleCount = document.querySelectorAll('.day-column:not(.day-column-hidden)').length;
    if (visibleCount > 0 && weekdaysContainer && dayColumnsContainer) {
        const printCols = `repeat(${visibleCount}, 1fr)`;
        weekdaysContainer.style.gridTemplateColumns = printCols;
        dayColumnsContainer.style.gridTemplateColumns = printCols;
    }
    
    // Close popup before print
    document.getElementById('printPopup').classList.remove('visible');
    
    window.print();
    
    // Restore original grid columns
    if (weekdaysContainer) weekdaysContainer.style.gridTemplateColumns = savedWeekdaysCols;
    if (dayColumnsContainer) dayColumnsContainer.style.gridTemplateColumns = savedDayColsCols;
    
    // Clean up after print
    document.body.classList.remove('print-no-header', 'print-no-colors', 'print-landscape', 'print-portrait');
    const injectedStyle = document.getElementById('print-page-style');
    if (injectedStyle) injectedStyle.remove();
    document.querySelectorAll('.print-hidden').forEach(el => el.classList.remove('print-hidden'));
}

// =====================================================
// Server Communication
// =====================================================

async function saveToServer(filename, data) {
    // Validate filename
    if (!CONFIG.ALLOWED_FILENAMES.includes(filename)) {
        console.error('Invalid filename:', filename);
        return Promise.reject(new Error('Invalid filename'));
    }
    
    try {
        showLoading();
        const response = await fetch(`save_json.php?filename=${encodeURIComponent(filename)}&action=save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.text();
        if (result !== 'OK') {
            throw new Error(`Save failed: ${result}`);
        }
        
        return Promise.resolve();
    } catch (err) {
        console.error(`Error saving ${filename}:`, err);
        alert(`Fehler beim Speichern von ${filename}`);
        return Promise.reject(err);
    } finally {
        hideLoading();
    }
}

async function loadFromServer(filename) {
    // Validate filename
    if (!CONFIG.ALLOWED_FILENAMES.includes(filename)) {
        console.error('Invalid filename:', filename);
        return null;
    }
    
    try {
        const response = await fetch(`save_json.php?filename=${encodeURIComponent(filename)}&action=load`);
        
        if (!response.ok) {
            if (response.status === 404) {
                return null; // File doesn't exist yet
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (err) {
        console.error(`Error loading ${filename}:`, err);
        return null;
    }
}

// =====================================================
// Sidebar Management
// =====================================================

function toggleSidebar(updateVisibility = false) {
    if (state.sidebarOpen) {
        closeSidebar(updateVisibility);
    } else {
        openSidebar(updateVisibility);
    }
}

function openSidebar(updateVisibility = false) {
    state.sidebarOpen = true;
    const sidebar = document.getElementById('contentSidebar');
    const main = document.getElementById('main');
    const openBtn = document.querySelector('.openbtn');
    const closeBtn = document.querySelector('.closebtn');
    
    if (sidebar) sidebar.style.width = '20%';
    if (main) main.style.marginRight = '20%';
    if (openBtn) openBtn.style.display = 'none';
    if (closeBtn) closeBtn.style.display = 'flex';
    
    if (updateVisibility) {
        const sidebarContainer = document.getElementById('sidebar');
        const ablageTile = document.getElementById('ablage-tile');
        if (sidebarContainer) sidebarContainer.style.display = 'block';
        if (ablageTile) ablageTile.style.display = 'block';
    }
}

function closeSidebar(updateVisibility = false) {
    state.sidebarOpen = false;
    const sidebar = document.getElementById('contentSidebar');
    const main = document.getElementById('main');
    const openBtn = document.querySelector('.openbtn');
    const closeBtn = document.querySelector('.closebtn');
    
    if (sidebar) sidebar.style.width = '0';
    if (main) main.style.marginRight = '0';
    if (openBtn) openBtn.style.display = 'flex';
    if (closeBtn) closeBtn.style.display = 'none';
    
    if (updateVisibility) {
        const sidebarContainer = document.getElementById('sidebar');
        const ablageTile = document.getElementById('ablage-tile');
        if (sidebarContainer) sidebarContainer.style.display = 'none';
        if (ablageTile) ablageTile.style.display = 'none';
    }
}

// =====================================================
// Time Options
// =====================================================

function createTimeOptions() {
    const startHour = parseInt(localStorage.getItem('startHour') || CONFIG.DEFAULT_START_HOUR);
    const endHour = parseInt(localStorage.getItem('endHour') || CONFIG.DEFAULT_END_HOUR);
    const startSelect = document.getElementById('bookingStart');
    const endSelect = document.getElementById('bookingEnd');
    
    if (!startSelect || !endSelect) return;
    
    startSelect.innerHTML = '';
    endSelect.innerHTML = '';
    
    for (let hour = startHour; hour <= endHour; hour++) {
        for (let minute = 0; minute < 60; minute += 15) {
            const timeStr = formatTime(hour, minute);
            startSelect.add(new Option(timeStr, timeStr));
            endSelect.add(new Option(timeStr, timeStr));
        }
    }
}

function populateTimeOptions() {
    const startSelect = document.getElementById('startHour');
    const endSelect = document.getElementById('endHour');
    
    if (!startSelect || !endSelect) return;
    
    startSelect.innerHTML = '';
    endSelect.innerHTML = '';
    
    for (let i = 0; i < 24; i++) {
        const hour = `${i.toString().padStart(2, '0')}:00`;
        startSelect.add(new Option(hour, i));
        endSelect.add(new Option(hour, i));
    }
}

// =====================================================
// Day Visibility Logic
// =====================================================

/**
 * Determine which days to show based on:
 * 1. ?day= URL param: positive filter (show only these day numbers)
 * 2. ?hide= URL param: negative filter (hide these day numbers)
 * 3. hiddenDays from settings (global filter, week mode only)
 * 4. hideEmptyDays from settings or ?hideempty=true
 * For admin: hidden/empty days are shown greyed out instead of removed.
 */
function getDaysToShow() {
    const count = getDayCount();
    const allDays = [];
    for (let i = 1; i <= count; i++) allDays.push(i);
    
    const hiddenDays = JSON.parse(localStorage.getItem('hiddenDays') || '[]');
    const hideEmptyDays = localStorage.getItem('hideEmptyDays') === 'true' || state.urlParams.hideempty;
    const daysWithBookings = new Set(state.bookings.map(b => b.day));
    
    // Combine hidden sources: settings (week mode) + URL ?hide=
    const allHiddenDays = new Set([
        ...(state.mode === 'week' ? hiddenDays : []),
        ...state.urlParams.hideDays
    ]);
    
    return allDays.map(dayNum => {
        const hiddenByDayParam = state.urlParams.days.length > 0 && !state.urlParams.days.includes(dayNum);
        const hiddenBySetting = allHiddenDays.has(dayNum);
        const isEmpty = !daysWithBookings.has(dayNum);
        const hiddenByEmpty = hideEmptyDays && isEmpty;
        
        const isHidden = hiddenByDayParam || hiddenBySetting || hiddenByEmpty;
        return { day: dayNum, label: getDayLabel(dayNum), hidden: isHidden, empty: isEmpty };
    });
}

// =====================================================
// Dynamic UI Generation
// =====================================================

/**
 * Build mobile day tiles dynamically based on current day config.
 */
function buildMobileTiles() {
    const container = document.getElementById('dayTiles');
    if (!container) return;
    
    container.innerHTML = '';
    const count = getDayCount();
    
    for (let i = 1; i <= count; i++) {
        const tile = document.createElement('div');
        tile.className = 'day-tile';
        tile.dataset.day = i;
        tile.innerHTML = `<div class="day-name">${escapeHtml(getDayLabel(i))}</div><div class="day-bookings"></div>`;
        container.appendChild(tile);
    }
    
    // Ablage tile (only for logged-in users)
    if (state.isLoggedIn) {
        const ablageTile = document.createElement('div');
        ablageTile.className = 'day-tile ablage-tile';
        ablageTile.id = 'ablage-tile';
        ablageTile.dataset.day = '0';
        ablageTile.innerHTML = '<div class="day-name filing-tile">Ablage</div><div class="day-bookings"></div>';
        container.appendChild(ablageTile);
    }
}

/**
 * Populate the booking day select dynamically.
 */
function buildDaySelect() {
    const select = document.getElementById('bookingDay');
    if (!select) return;
    
    select.innerHTML = '';
    const count = getDayCount();
    for (let i = 1; i <= count; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = getDayLabel(i);
        select.appendChild(option);
    }
    // Ablage
    const ablageOption = document.createElement('option');
    ablageOption.value = 0;
    ablageOption.textContent = 'Ablage';
    select.appendChild(ablageOption);
}

/**
 * Build hidden-day checkboxes in settings.
 * Always renders 7 checkboxes (week mode) regardless of current state.mode,
 * because this is only relevant for week mode display.
 */
function buildHiddenDaysCheckboxes() {
    const container = document.getElementById('hiddenDaysCheckboxes');
    if (!container) return;
    
    container.innerHTML = '';
    const count = 7; // Always 7 weekday checkboxes
    const hiddenDays = JSON.parse(localStorage.getItem('hiddenDays') || '[]');
    
    for (let i = 1; i <= count; i++) {
        const label = document.createElement('label');
        label.className = 'day-chip';
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.value = i;
        cb.checked = !hiddenDays.includes(i);
        label.appendChild(cb);
        label.appendChild(document.createTextNode(getDayShortLabel(i)));
        container.appendChild(label);
    }
}

// =====================================================
// Day Columns (Desktop View)
// =====================================================

function createDayColumns() {
    const container = document.getElementById('dayColumns');
    if (!container) return;
    
    container.innerHTML = '';
    const startHour = parseInt(localStorage.getItem('startHour') || CONFIG.DEFAULT_START_HOUR);
    const endHour = parseInt(localStorage.getItem('endHour') || CONFIG.DEFAULT_END_HOUR);
    const totalHeight = (endHour - startHour) * 60;
    
    const dayInfo = getDaysToShow();
    const visibleDays = dayInfo.filter(d => !d.hidden || state.isLoggedIn);
    
    // Update weekdays header
    const weekdaysContainer = document.querySelector('.weekdays');
    if (weekdaysContainer) {
        weekdaysContainer.innerHTML = visibleDays.map(d => 
            `<div class="weekday${d.hidden ? ' weekday-hidden' : ''}">${escapeHtml(d.label)}</div>`
        ).join('');
        weekdaysContainer.style.gridTemplateColumns = `repeat(${visibleDays.length}, 1fr)`;
        container.style.gridTemplateColumns = `repeat(${visibleDays.length}, 1fr)`;
        
        // For many columns (event mode), enable horizontal scroll with min-width per column
        const needsScroll = visibleDays.length > 7;
        const scrollWrapper = document.getElementById('desktopScrollWrapper');
        weekdaysContainer.classList.toggle('event-scroll', needsScroll);
        container.classList.toggle('event-scroll', needsScroll);
        if (scrollWrapper) {
            scrollWrapper.classList.toggle('event-scroll', needsScroll);
            
            // Ensure wrapper container + scroll hint exist
            let wrapperContainer = scrollWrapper.parentElement;
            if (!wrapperContainer.classList.contains('scroll-wrapper-container')) {
                const newContainer = document.createElement('div');
                newContainer.className = 'scroll-wrapper-container';
                wrapperContainer.insertBefore(newContainer, scrollWrapper);
                newContainer.appendChild(scrollWrapper);
                wrapperContainer = newContainer;
            }
            let scrollHint = wrapperContainer.querySelector('.scroll-hint');
            if (!scrollHint) {
                scrollHint = document.createElement('div');
                scrollHint.className = 'scroll-hint';
                wrapperContainer.appendChild(scrollHint);
            }
            
            if (needsScroll) {
                scrollHint.classList.add('visible');
                scrollWrapper.onscroll = () => {
                    const atEnd = scrollWrapper.scrollLeft + scrollWrapper.clientWidth >= scrollWrapper.scrollWidth - 5;
                    scrollHint.classList.toggle('visible', !atEnd);
                };
            } else {
                scrollHint.classList.remove('visible');
                scrollWrapper.onscroll = null;
            }
        }
        if (needsScroll) {
            weekdaysContainer.style.setProperty('--day-count', visibleDays.length);
            container.style.setProperty('--day-count', visibleDays.length);
            weekdaysContainer.style.gridTemplateColumns = `repeat(${visibleDays.length}, minmax(120px, 1fr))`;
            container.style.gridTemplateColumns = `repeat(${visibleDays.length}, minmax(120px, 1fr))`;
        }
    }
    
    visibleDays.forEach(({ day, label, hidden }) => {
        const column = document.createElement('div');
        column.className = 'day-column' + (hidden ? ' day-column-hidden' : '');
        column.dataset.day = day;
        column.style.height = `${totalHeight}px`;
        
        // Time markers
        const timeMarkers = document.createElement('div');
        timeMarkers.className = 'time-markers';
        
        for (let hour = startHour; hour <= endHour; hour++) {
            const marker = document.createElement('div');
            marker.className = 'time-marker';
            marker.style.top = `${(hour - startHour) * 60}px`;
            marker.textContent = `${hour}:00`;
            timeMarkers.appendChild(marker);
        }
        
        column.appendChild(timeMarkers);
        
        // Click handler for creating new bookings
        if (!state.urlParams.readonly && !state.urlParams.embedded) {
            column.addEventListener('click', (e) => {
                if (state.justResized) return;
                if (state.isLoggedIn && e.target.classList.contains('day-column')) {
                    state.selectedDay = day;
                    state.selectedColumn = column;
                    state.selectedBookingIndex = null;
                    
                    document.getElementById('bookingForm').reset();
                    
                    const rect = column.getBoundingClientRect();
                    const clickY = e.clientY - rect.top;
                    const hour = Math.floor(clickY / 60) + startHour;
                    const minute = Math.round((clickY % 60) / 15) * 15;
                    
                    buildDaySelect();
                    document.getElementById('bookingDay').value = day;
                    document.getElementById('bookingStart').value = formatTime(hour, minute);
                    
                    const endHourCalc = hour + 1;
                    if (endHourCalc <= endHour) {
                        document.getElementById('bookingEnd').value = formatTime(endHourCalc, minute);
                    }
                    
                    // Populate category select
                    buildCategoryOptions(document.getElementById('bookingCategory'));
                    
                    document.getElementById('modalDeleteButton').style.display = 'none';
                    const dupBtn = document.getElementById('modalDuplicateButton');
                    if (dupBtn) dupBtn.style.display = 'none';
                    
                    document.getElementById('bookingModal').style.display = 'flex';
                }
            });
        }
        
        // Drag & drop target (admin only, desktop)
        if (!state.urlParams.readonly && !state.urlParams.embedded) {
            column.addEventListener('dragover', (e) => {
                if (state.dragBookingIndex === null) return;
                e.preventDefault();
                state.dragIsCopy = e.shiftKey || e.ctrlKey;
                e.dataTransfer.dropEffect = state.dragIsCopy ? 'copy' : 'move';
                updateDragGhost(state.dragIsCopy, state.dragBookingIndex);
                column.classList.add('drag-over');
            });
            column.addEventListener('dragleave', () => {
                column.classList.remove('drag-over');
            });
            column.addEventListener('drop', async (e) => {
                e.preventDefault();
                column.classList.remove('drag-over');
                state.dragIsCopy = e.shiftKey || e.ctrlKey;
                const bookingIndex = state.dragBookingIndex;
                if (bookingIndex === null || bookingIndex < 0) return;
                
                const targetDay = parseInt(column.dataset.day);
                const sourceBooking = state.bookings[bookingIndex];
                if (!sourceBooking) return;
                
                // Calculate target time from drop position (15-min snap)
                const rect = column.getBoundingClientRect();
                const dropY = e.clientY - rect.top;
                const dropMinutes = snapTo15(dropY);
                const duration = timeToMinutes(sourceBooking.endTime) - timeToMinutes(sourceBooking.startTime);
                const newStartMin = Math.max(0, dropMinutes);
                const maxStart = (endHour - startHour) * 60 - duration;
                const clampedStart = Math.min(newStartMin, Math.max(0, maxStart));
                const newStartTotal = clampedStart + startHour * 60;
                const newEndTotal = newStartTotal + duration;
                const newStartTime = formatTime(Math.floor(newStartTotal / 60), newStartTotal % 60);
                const newEndTime = formatTime(Math.floor(newEndTotal / 60), newEndTotal % 60);
                
                if (state.dragIsCopy) {
                    // Shift+Drag: duplicate to target day + time
                    const copy = JSON.parse(JSON.stringify(sourceBooking));
                    copy.id = generateBookingId();
                    copy.day = targetDay;
                    copy.startTime = newStartTime;
                    copy.endTime = newEndTime;
                    state.bookings.push(copy);
                } else {
                    // Normal drag: move to target day + time
                    sourceBooking.day = targetDay;
                    sourceBooking.startTime = newStartTime;
                    sourceBooking.endTime = newEndTime;
                }
                
                await saveToServer('bookings.json', state.bookings);
                createDayColumns();
            });
        }
        
        container.appendChild(column);
    });
    
    renderBookings();
}

// =====================================================
// Booking Overlap Detection
// =====================================================

function detectOverlaps(bookings, day) {
    const dayBookings = bookings
        .map((booking, index) => ({ ...booking, originalIndex: index }))
        .filter(b => b.day === day);
    
    if (dayBookings.length === 0) return [];
    
    // Sort by start time
    dayBookings.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
    
    // Find overlapping groups
    const groups = [];
    let currentGroup = [dayBookings[0]];
    let groupEnd = timeToMinutes(dayBookings[0].endTime);
    
    for (let i = 1; i < dayBookings.length; i++) {
        const booking = dayBookings[i];
        const bookingStart = timeToMinutes(booking.startTime);
        
        if (bookingStart < groupEnd) {
            // Overlaps with current group
            currentGroup.push(booking);
            groupEnd = Math.max(groupEnd, timeToMinutes(booking.endTime));
        } else {
            // New group
            groups.push(currentGroup);
            currentGroup = [booking];
            groupEnd = timeToMinutes(booking.endTime);
        }
    }
    groups.push(currentGroup);
    
    // Assign overlap info
    const overlapInfo = {};
    groups.forEach(group => {
        group.forEach((booking, index) => {
            overlapInfo[booking.originalIndex] = {
                count: group.length,
                index: index
            };
        });
    });
    
    return overlapInfo;
}

// =====================================================
// Booking Element Creation
// =====================================================

function createBookingElement(booking, index, isMobile) {
    const el = document.createElement('div');
    el.className = isMobile ? 'mobile-booking' : 'booking';
    el.dataset.index = index;
    el.dataset.bookingIndex = index;
    
    const bgColor = sanitizeColor(rgbToHex(booking.color) || booking.color || 'var(--secondary)');
    el.style.backgroundColor = bgColor;
    
    // Add light/dark class for text contrast
    if (isLightColor(bgColor)) {
        el.classList.add('light-bg');
    } else {
        el.classList.add('dark-bg');
    }
    
    const titleClass = isMobile ? 'mobile-booking-title' : 'booking-title';
    const timeClass = isMobile ? 'mobile-booking-time' : 'booking-time';
    const actionsClass = isMobile ? 'mobile-booking-actions' : 'booking-actions';
    
    let html = `
        <div class="${titleClass}">${escapeHtml(booking.title)}</div>
        <div class="${timeClass}">${escapeHtml(booking.startTime)} - ${escapeHtml(booking.endTime)}</div>
    `;
    
    if (state.isLoggedIn && !state.urlParams.readonly) {
        html += `
            <div class="${actionsClass}">
                <button class="action-button edit-button" data-action="edit" data-index="${index}">Bearbeiten</button>
                <button class="action-button delete-button" data-action="delete" data-index="${index}">Löschen</button>
            </div>
        `;
    }
    
    // Append resize handle for desktop bookings (admin only)
    if (!isMobile && state.isLoggedIn && !state.urlParams.readonly && !state.urlParams.embedded) {
        html += '<div class="resize-handle"></div>';
    }
    
    el.innerHTML = html;
    
    // Desktop drag & drop (admin only)
    if (!isMobile && state.isLoggedIn && !state.urlParams.readonly && !state.urlParams.embedded) {
        el.setAttribute('draggable', 'true');
        el.addEventListener('dragstart', (e) => {
            // Prevent native drag when resizing
            if (state.resizing) { e.preventDefault(); return; }
            state.dragBookingIndex = index;
            state.dragIsCopy = e.shiftKey || e.ctrlKey;
            el.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'all';
            e.dataTransfer.setData('text/plain', String(index));
        });
        el.addEventListener('dragend', () => {
            el.classList.remove('dragging');
            state.dragBookingIndex = null;
            state.dragIsCopy = false;
            if (state.dragGhost) {
                state.dragGhost.remove();
                state.dragGhost = null;
            }
            // Remove all drop highlights
            document.querySelectorAll('.day-column').forEach(c => c.classList.remove('drag-over'));
        });
        
        // Resize handle – mousedown on bottom edge
        const resizeHandle = el.querySelector('.resize-handle');
        if (resizeHandle) {
            resizeHandle.addEventListener('mousedown', (e) => {
                e.preventDefault();
                e.stopPropagation();
                el.setAttribute('draggable', 'false');
                state.resizing = true;
                
                const column = el.parentElement;
                const startHourVal = parseInt(localStorage.getItem('startHour') || CONFIG.DEFAULT_START_HOUR);
                const endHourVal = parseInt(localStorage.getItem('endHour') || CONFIG.DEFAULT_END_HOUR);
                const colRect = column.getBoundingClientRect();
                
                el.classList.add('resizing');
                
                const onMouseMove = (moveE) => {
                    const relY = moveE.clientY - colRect.top;
                    const snappedMinutes = snapTo15(relY);
                    const bookingStartMin = timeToMinutes(booking.startTime) - startHourVal * 60;
                    const minHeight = 15; // Minimum 15 minutes
                    const maxMinutes = (endHourVal - startHourVal) * 60;
                    const newHeight = Math.max(minHeight, Math.min(snappedMinutes - bookingStartMin, maxMinutes - bookingStartMin));
                    el.style.height = `${newHeight}px`;
                };
                
                const onMouseUp = async () => {
                    document.removeEventListener('mousemove', onMouseMove);
                    document.removeEventListener('mouseup', onMouseUp);
                    el.classList.remove('resizing');
                    state.resizing = false;
                    state.justResized = true;
                    setTimeout(() => { state.justResized = false; }, 200);
                    el.setAttribute('draggable', 'true');
                    
                    const newHeight = parseInt(el.style.height);
                    const startHourVal = parseInt(localStorage.getItem('startHour') || CONFIG.DEFAULT_START_HOUR);
                    const startMin = timeToMinutes(booking.startTime);
                    const newEndMin = startMin + newHeight - (timeToMinutes(booking.startTime) - startHourVal * 60) + (timeToMinutes(booking.startTime) - startHourVal * 60);
                    // Simpler: endMinutes = startHour*60 + bookingTopOffset + newHeight
                    const bookingTopPx = parseInt(el.style.top);
                    const endTotalMin = startHourVal * 60 + bookingTopPx + newHeight;
                    const endH = Math.floor(endTotalMin / 60);
                    const endM = endTotalMin % 60;
                    
                    booking.endTime = formatTime(endH, endM);
                    await saveToServer('bookings.json', state.bookings);
                    createDayColumns();
                };
                
                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            });
        }
    }
    
    // Click handler
    el.addEventListener('click', (e) => {
        const action = e.target.dataset.action;
        const targetIndex = e.target.dataset.index;
        
        if (action === 'edit') {
            editBooking(parseInt(targetIndex));
        } else if (action === 'delete') {
            deleteBooking(parseInt(targetIndex));
        } else if (!state.isLoggedIn && !state.urlParams.readonly) {
            showBookingDetails(booking);
        } else if (state.isLoggedIn) {
            // Multi-select with Ctrl/Cmd key
            if (e.ctrlKey || e.metaKey) {
                e.stopPropagation();
                
                // If there's an expanded booking that isn't yet in the selection, add it first
                const isMobileView = isMobile;
                const allBookings = document.querySelectorAll(isMobileView ? '.mobile-booking' : '.booking');
                allBookings.forEach(b => {
                    if (b.classList.contains('expanded')) {
                        const bIndex = parseInt(b.dataset.bookingIndex);
                        if (!isNaN(bIndex) && !state.selectedBookingIndices.has(bIndex)) {
                            state.selectedBookingIndices.add(bIndex);
                            b.classList.add('selected');
                        }
                        b.classList.remove('expanded');
                    }
                });
                
                if (state.selectedBookingIndices.has(index)) {
                    state.selectedBookingIndices.delete(index);
                    el.classList.remove('selected');
                } else {
                    state.selectedBookingIndices.add(index);
                    el.classList.add('selected');
                }
                return;
            }
            
            // Clear multi-select on normal click
            clearMultiSelection();
            
            // Toggle expanded state
            const allBookings = document.querySelectorAll(isMobile ? '.mobile-booking' : '.booking');
            allBookings.forEach(b => {
                if (b !== el) b.classList.remove('expanded');
            });
            el.classList.toggle('expanded');
        }
    });
    
    // Right-click context menu (admin only)
    if (state.isLoggedIn && !state.urlParams.readonly) {
        el.addEventListener('contextmenu', (e) => {
            showBookingContextMenu(e, index);
        });
    }
    
    return el;
}

// =====================================================
// Render Bookings
// =====================================================

function renderBookings() {
    const bookingColors = JSON.parse(localStorage.getItem('bookingColors') || '[]');
    
    // Update booking colors based on category
    state.bookings.forEach(booking => {
        if (!booking.categoryID) {
            booking.categoryID = 'default';
        }
        const colorConfig = bookingColors.find(c => c.id === booking.categoryID);
        booking.color = colorConfig ? colorConfig.color : 'var(--secondary)';
    });
    
    // Sort by start time
    state.bookings.sort((a, b) => {
        const aTime = timeToMinutes(a.startTime);
        const bTime = timeToMinutes(b.startTime);
        return aTime - bTime;
    });
    
    // Filter by category if specified
    let filteredBookings = state.bookings;
    if (state.urlParams.category) {
        const categoryFilter = state.urlParams.category.toLowerCase();
        filteredBookings = state.bookings.filter(b => {
            const colorConfig = bookingColors.find(c => c.id === b.categoryID);
            return colorConfig && colorConfig.name.toLowerCase() === categoryFilter;
        });
    }
    
    // Render mobile view
    renderMobileBookings(filteredBookings);
    
    // Render desktop view
    renderDesktopBookings(filteredBookings);
    
    // Render sidebar (Ablage)
    renderSidebarBookings(filteredBookings);
}

function renderMobileBookings(bookings) {
    const mobileColumns = document.querySelectorAll('.day-tile');
    
    mobileColumns.forEach(column => {
        const existingBookings = column.querySelectorAll('.mobile-booking');
        existingBookings.forEach(b => b.remove());
    });
    
    // Apply day visibility
    const dayInfo = getDaysToShow();
    
    // Build a map of day number → tile element
    const tileMap = {};
    mobileColumns.forEach(column => {
        const dayNum = parseInt(column.dataset.day);
        if (!isNaN(dayNum)) tileMap[dayNum] = column;
    });
    
    dayInfo.forEach(info => {
        const tile = tileMap[info.day];
        if (!tile) return;
        
        if (info.hidden && !state.isLoggedIn) {
            tile.style.display = 'none';
        } else {
            tile.style.display = 'block';
            if (info.hidden && state.isLoggedIn) {
                tile.classList.add('day-tile-hidden');
            } else {
                tile.classList.remove('day-tile-hidden');
            }
        }
    });
    
    bookings.forEach((booking, index) => {
        if (booking.day === 0) {
            // Ablage: render into mobile Ablage tile if logged in
            const ablageTile = tileMap[0];
            if (ablageTile && state.isLoggedIn) {
                const bookingEl = createBookingElement(booking, index, true);
                ablageTile.appendChild(bookingEl);
            }
            return;
        }
        const tile = tileMap[booking.day];
        if (tile && tile.style.display !== 'none') {
            const bookingEl = createBookingElement(booking, index, true);
            tile.appendChild(bookingEl);
        }
    });
}

function renderDesktopBookings(bookings) {
    const columns = document.querySelectorAll('.day-column');
    
    // Clear existing bookings
    columns.forEach(column => {
        const existingBookings = column.querySelectorAll('.booking');
        existingBookings.forEach(b => b.remove());
    });
    
    const startHour = parseInt(localStorage.getItem('startHour') || CONFIG.DEFAULT_START_HOUR);
    
    // Map day numbers to column elements
    const dayColumns = {};
    columns.forEach(column => {
        const dayNum = parseInt(column.dataset.day);
        dayColumns[dayNum] = column;
    });
    
    // Calculate overlaps for each day
    const overlapInfoByDay = {};
    Object.keys(dayColumns).forEach(key => {
        const dayNum = parseInt(key);
        overlapInfoByDay[dayNum] = detectOverlaps(bookings, dayNum);
    });
    
    bookings.forEach((booking, index) => {
        if (booking.day === 0) return; // Skip Ablage
        
        const column = dayColumns[booking.day];
        if (!column) return;
        
        const bookingEl = createBookingElement(booking, index, false);
        
        // Calculate position
        const [startH, startM] = booking.startTime.split(':').map(Number);
        const [endH, endM] = booking.endTime.split(':').map(Number);
        
        const top = (startH - startHour) * 60 + startM;
        const height = (endH - startH) * 60 + (endM - startM);
        
        bookingEl.style.top = `${top}px`;
        bookingEl.style.height = `${height}px`;
        
        // Apply overlap styling
        const overlapInfo = overlapInfoByDay[booking.day];
        if (overlapInfo && overlapInfo[index]) {
            const { count, index: overlapIndex } = overlapInfo[index];
            if (count > 1) {
                bookingEl.dataset.overlapCount = count;
                bookingEl.dataset.overlapIndex = overlapIndex;
            }
        }
        
        column.appendChild(bookingEl);
    });
}

function renderSidebarBookings(bookings) {
    const sidebar = document.getElementById('Ablage');
    if (!sidebar) return;
    
    const existingBookings = sidebar.querySelectorAll('.mobile-booking');
    existingBookings.forEach(b => b.remove());
    
    bookings
        .filter(b => b.day === 0)
        .forEach((booking, idx) => {
            const originalIndex = state.bookings.indexOf(booking);
            const bookingEl = createBookingElement(booking, originalIndex, true);
            
            // Make sidebar bookings draggable (admin only, desktop)
            if (state.isLoggedIn && !state.urlParams.readonly && !state.urlParams.embedded) {
                bookingEl.setAttribute('draggable', 'true');
                bookingEl.addEventListener('dragstart', (e) => {
                    if (state.resizing) { e.preventDefault(); return; }
                    state.dragBookingIndex = originalIndex;
                    state.dragIsCopy = e.shiftKey || e.ctrlKey;
                    bookingEl.classList.add('dragging');
                    e.dataTransfer.effectAllowed = 'all';
                    e.dataTransfer.setData('text/plain', String(originalIndex));
                });
                bookingEl.addEventListener('dragend', () => {
                    bookingEl.classList.remove('dragging');
                    state.dragBookingIndex = null;
                    state.dragIsCopy = false;
                    if (state.dragGhost) {
                        state.dragGhost.remove();
                        state.dragGhost = null;
                    }
                    document.querySelectorAll('.day-column').forEach(c => c.classList.remove('drag-over'));
                });
            }
            
            sidebar.appendChild(bookingEl);
        });
}

// =====================================================
// Booking Details Modal
// =====================================================

function showBookingDetails(booking) {
    const modal = document.getElementById('viewBookingModal');
    if (!modal) return;
    
    document.getElementById('viewBookingTitle').textContent = booking.title;
    document.getElementById('viewBookingTime').textContent = `${booking.startTime} - ${booking.endTime}`;
    document.getElementById('viewBookingLocation').textContent = booking.location || '';
    
    const trainersDiv = document.getElementById('viewBookingTrainers');
    if (booking.trainer) {
        trainersDiv.innerHTML = booking.trainer
            .split('\n')
            .filter(t => t.trim())
            .map(t => `<span class="trainer-tag">${escapeHtml(t)}</span>`)
            .join('');
    } else {
        trainersDiv.innerHTML = '';
    }
    
    const contactDiv = document.getElementById('viewBookingContact');
    contactDiv.innerHTML = booking.contact ? `Kontakt: ${escapeHtml(booking.contact)}` : '';
    
    const descriptionDiv = document.getElementById('viewBookingDescription');
    descriptionDiv.innerHTML = booking.description ? escapeHtml(booking.description).replace(/\n/g, '<br>') : '';
    descriptionDiv.style.display = booking.description ? 'block' : 'none';
    
    document.querySelector('.view-booking-header').style.backgroundColor = sanitizeColor(booking.color);
    
    const linkDiv = document.getElementById('viewBookingLink');
    if (booking.link) {
        linkDiv.innerHTML = `<a href="${escapeHtml(booking.link)}" target="_blank" rel="noopener noreferrer" class="link-button"><span class="icon link"></span></a>`;
        linkDiv.style.display = 'block';
    } else {
        linkDiv.innerHTML = '';
        linkDiv.style.display = 'none';
    }
    
    modal.style.display = 'flex';
}

function closeViewBookingModal() {
    document.getElementById('viewBookingModal').style.display = 'none';
}

// =====================================================
// Booking CRUD Operations
// =====================================================

function editBooking(index) {
    const booking = state.bookings[index];
    if (!booking) return;
    
    // Populate category select
    buildCategoryOptions(document.getElementById('bookingCategory'));
    
    // Populate day select dynamically
    buildDaySelect();
    
    // Fill form
    document.getElementById('bookingTitle').value = booking.title;
    document.getElementById('bookingDay').value = booking.day;
    document.getElementById('bookingStart').value = booking.startTime;
    document.getElementById('bookingEnd').value = booking.endTime;
    document.getElementById('bookingLocation').value = booking.location || '';
    document.getElementById('bookingTrainer').value = booking.trainer || '';
    document.getElementById('bookingContact').value = booking.contact || '';
    document.getElementById('bookingLink').value = booking.link || '';
    document.getElementById('bookingDescription').value = booking.description || '';
    document.getElementById('bookingCategory').value = booking.categoryID || 'default';
    
    document.getElementById('modalDeleteButton').style.display = 'inline';
    document.getElementById('modalDeleteButton').onclick = () => deleteBooking(index);
    
    // Show duplicate button
    const dupBtn = document.getElementById('modalDuplicateButton');
    if (dupBtn) {
        dupBtn.style.display = 'inline';
        dupBtn.onclick = () => duplicateBooking(index);
    }
    
    state.selectedBookingIndex = index;
    document.getElementById('bookingModal').style.display = 'flex';
}

async function deleteBooking(index) {
    if (confirm('Möchten Sie diesen Termin wirklich löschen?')) {
        state.bookings.splice(index, 1);
        await saveToServer('bookings.json', state.bookings);
        createDayColumns(); // Rebuild grid (hideEmptyDays may change visible columns)
        closeBookingModal();
    }
}

/**
 * Delete all multi-selected bookings (via Ctrl+Click + DEL)
 */
async function deleteSelectedBookings() {
    const indices = Array.from(state.selectedBookingIndices).sort((a, b) => b - a);
    if (indices.length === 0) return;
    
    const count = indices.length;
    if (!confirm(`${count} Termin${count > 1 ? 'e' : ''} wirklich löschen?`)) return;
    
    // Delete in reverse order to preserve indices
    indices.forEach(i => state.bookings.splice(i, 1));
    state.selectedBookingIndices.clear();
    
    await saveToServer('bookings.json', state.bookings);
    buildMobileTiles();
    createDayColumns();
}

/**
 * Clear multi-selection styling and state
 */
function clearMultiSelection() {
    state.selectedBookingIndices.clear();
    document.querySelectorAll('.booking.selected, .mobile-booking.selected').forEach(el => {
        el.classList.remove('selected');
    });
}

/**
 * Duplicate a booking by index (used from the edit modal)
 */
async function duplicateBooking(index) {
    const source = state.bookings[index];
    if (!source) return;
    
    const copy = JSON.parse(JSON.stringify(source));
    copy.id = generateBookingId();
    state.bookings.push(copy);
    
    await saveToServer('bookings.json', state.bookings);
    closeBookingModal();
    buildMobileTiles();
    createDayColumns();
}

function closeBookingModal() {
    document.getElementById('bookingModal').style.display = 'none';
    document.getElementById('bookingForm').reset();
    document.getElementById('modalDeleteButton').style.display = 'none';
    const dupBtn = document.getElementById('modalDuplicateButton');
    if (dupBtn) dupBtn.style.display = 'none';
    state.selectedBookingIndex = null;
}

// =====================================================
// Authentication
// =====================================================

function login() {
    const passwordInput = document.getElementById('password');
    const password = stringToHash(passwordInput.value);
    const storedHash = Number(localStorage.getItem('loginhash'));
    
    if (!isNaN(storedHash) && password === storedHash) {
        state.isLoggedIn = true;
        document.getElementById('editButton').innerHTML = '<span class="icon settings"></span>';
        document.getElementById('newBookingButton').style.display = 'flex';
        document.getElementById('printButton').style.display = 'flex';
        document.getElementById('icsButton').style.display = 'flex';
        document.getElementById('helpButton').style.display = 'flex';
        closeLoginModal();
        buildMobileTiles();
        createDayColumns(); // Re-render to show greyed-out hidden days
        renderBookings();
        toggleSidebar(true);
    } else {
        alert('Falsches Passwort!');
    }
}

function logout() {
    if (confirm('Möchten Sie sich wirklich abmelden? Nicht gespeicherte Änderungen gehen verloren.')) {
        state.isLoggedIn = false;
        document.getElementById('editButton').innerHTML = '<span class="icon edit"></span>';
        document.getElementById('newBookingButton').style.display = 'none';
        document.getElementById('printButton').style.display = 'none';
        document.getElementById('icsButton').style.display = 'none';
        document.getElementById('helpButton').style.display = 'none';
        // Close print popup if open
        document.getElementById('printPopup')?.classList.remove('visible');
        closeOptionsModal();
        if (state.sidebarOpen) {
            toggleSidebar(true);
        }
        buildMobileTiles();
        createDayColumns(); // Re-render to hide greyed-out days
        renderBookings();
    }
}

function closeLoginModal() {
    document.getElementById('loginModal').style.display = 'none';
    document.getElementById('password').value = '';
}

// =====================================================
// Settings Modal
// =====================================================

async function showOptionsModal() {
    const modal = document.getElementById('optionsModal');
    if (!modal) return;
    
    modal.style.display = 'flex';
    document.getElementById('calendarTitle').value = document.querySelector('.calendar-header h2').textContent;
    
    // Mode toggle
    const modeRadios = document.querySelectorAll('input[name="calendarMode"]');
    modeRadios.forEach(r => { r.checked = r.value === state.mode; });
    updateModeUI();
    
    // Event fields
    document.getElementById('eventStartDate').value = state.eventStartDate || '';
    document.getElementById('eventDayCount').value = state.eventDayCount || 3;
    updateEventPreview();
    
    // Header color
    const headerSwatch = document.querySelector('.header-color-edit .color-swatch');
    headerSwatch.style.backgroundColor = getComputedStyle(document.documentElement).getPropertyValue('--header-color').trim();
    
    // Secondary color
    const secondarySwatch = document.querySelector('.secondary-color-edit .color-swatch');
    secondarySwatch.style.backgroundColor = getComputedStyle(document.documentElement).getPropertyValue('--secondary').trim();
    
    // Time options
    populateTimeOptions();
    document.getElementById('startHour').value = localStorage.getItem('startHour') || CONFIG.DEFAULT_START_HOUR;
    document.getElementById('endHour').value = localStorage.getItem('endHour') || CONFIG.DEFAULT_END_HOUR;
    
    // Hidden days checkboxes (week mode)
    buildHiddenDaysCheckboxes();
    
    // Hide empty days
    document.getElementById('hideEmptyDays').checked = localStorage.getItem('hideEmptyDays') === 'true';
    
    // Booking colors
    await updateCategorySelect();
    renderColorOptions();
    
    // ICS settings
    const icsPublicCb = document.getElementById('icsPublicCheckbox');
    if (icsPublicCb) icsPublicCb.checked = !!state.icsPublic;
    const icsDayFilterCb = document.getElementById('icsDayFilterCheckbox');
    if (icsDayFilterCb) icsDayFilterCb.checked = !!state.icsDayFilter;
    updateIcsTokenDisplay();
}

/**
 * Toggle visibility of mode-specific settings sections
 */
function updateModeUI() {
    const mode = document.querySelector('input[name="calendarMode"]:checked')?.value || 'week';
    const weekSection = document.getElementById('weekModeSection');
    const eventSection = document.getElementById('eventModeSection');
    
    if (weekSection) weekSection.style.display = mode === 'week' ? '' : 'none';
    if (eventSection) eventSection.style.display = mode === 'event' ? '' : 'none';
}

/**
 * Update the event day preview label
 */
function updateEventPreview() {
    const preview = document.getElementById('eventDayPreview');
    if (!preview) return;
    
    const startDate = document.getElementById('eventStartDate')?.value;
    const dayCount = parseInt(document.getElementById('eventDayCount')?.value) || 3;
    
    if (!startDate) {
        preview.textContent = '';
        return;
    }
    
    const labels = [];
    for (let i = 0; i < Math.min(dayCount, 14); i++) {
        const d = new Date(startDate + 'T00:00:00');
        d.setDate(d.getDate() + i);
        const wd = d.toLocaleDateString('de-DE', { weekday: 'short' });
        const formatted = d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
        labels.push(`${wd} ${formatted}`);
    }
    if (dayCount > 14) labels.push('…');
    preview.textContent = '→ ' + labels.join(' │ ');
}

/**
 * Sanitize a CSS color value to prevent injection
 */
function sanitizeColor(color) {
    if (!color) return '#000000';
    // Allow hex colors
    if (/^#[0-9a-fA-F]{3,8}$/.test(color)) return color;
    // Allow rgb/rgba
    if (/^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(,\s*[\d.]+\s*)?\)$/.test(color)) return color;
    // Allow CSS variables
    if (/^var\(--[a-zA-Z0-9-]+\)$/.test(color)) return color;
    // Allow named CSS colors (basic set)
    if (/^[a-zA-Z]+$/.test(color)) return color;
    return '#000000';
}

function renderColorOptions() {
    const container = document.getElementById('bookingColors');
    if (!container) return;
    
    container.innerHTML = '';
    const savedColors = ensureDefaultCategory();
    
    // Count bookings per category
    const categoryCounts = {};
    state.bookings.forEach(b => {
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
        
        // Booking count badge
        const count = categoryCounts[id] || 0;
        const badge = document.createElement('span');
        badge.className = 'category-count';
        badge.textContent = count;
        badge.title = `${count} Termin${count !== 1 ? 'e' : ''}`;
        colorEdit.appendChild(badge);
        
        // Default category: no delete button
        if (id !== 'default') {
            const delIcon = document.createElement('span');
            delIcon.className = 'icon del color-delete';
            colorEdit.appendChild(delIcon);
        }
        
        container.appendChild(colorEdit);
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
        container.insertBefore(colorEdit, addBtn);
    };
    container.appendChild(addBtn);
}

function closeOptionsModal() {
    document.getElementById('optionsModal').style.display = 'none';
}

async function saveSettings() {
    // Title
    document.querySelector('.calendar-header h2').textContent = document.getElementById('calendarTitle').value;
    
    // Mode
    const newMode = document.querySelector('input[name="calendarMode"]:checked')?.value || 'week';
    const oldMode = state.mode;
    
    // Event mode fields
    const eventStartDate = document.getElementById('eventStartDate')?.value || null;
    const eventDayCount = parseInt(document.getElementById('eventDayCount')?.value) || 3;
    
    // Validate event mode
    if (newMode === 'event' && !eventStartDate) {
        alert('Bitte ein Startdatum für den Eventmodus angeben.');
        return;
    }
    
    // Handle mode switch with confirmation
    if (newMode !== oldMode && state.bookings.length > 0) {
        if (newMode === 'event') {
            if (!confirm('Modus wird zu "Event" gewechselt.\nTermine behalten ihre Tagnummern (Montag → Tag 1, etc.).\nFortfahren?')) return;
        } else {
            const hasHighDays = state.bookings.some(b => b.day > 7);
            if (hasHighDays) {
                if (!confirm('Modus wird zu "Woche" gewechselt.\nTermine auf Tag 8+ werden in die Ablage verschoben.\nFortfahren?')) return;
                state.bookings.forEach(b => { if (b.day > 7) b.day = 0; });
            }
        }
    }
    
    const oldStartDate = state.eventStartDate;
    const newDayCount = Math.max(1, Math.min(99, eventDayCount));
    
    // Handle start date change in event mode (booking migration)
    if (newMode === 'event' && oldStartDate && eventStartDate && oldStartDate !== eventStartDate) {
        const choice = await showStartDateChangeDialog(oldStartDate, eventStartDate);
        if (choice === 'cancel') return;
        
        if (choice === 'relative') {
            // Keep bookings at their day numbers; move out-of-range to Ablage
            state.bookings.forEach(b => {
                if (b.day > 0 && (b.day > newDayCount || b.day < 1)) b.day = 0;
            });
        } else if (choice === 'shift') {
            // Shift bookings by the date offset
            const oldDate = new Date(oldStartDate + 'T00:00:00');
            const newDate = new Date(eventStartDate + 'T00:00:00');
            const offsetDays = Math.round((oldDate - newDate) / 86400000);
            state.bookings.forEach(b => {
                if (b.day > 0) {
                    const shifted = b.day + offsetDays;
                    b.day = (shifted >= 1 && shifted <= newDayCount) ? shifted : 0;
                }
            });
        } else if (choice === 'ablage') {
            // Move all bookings to Ablage
            state.bookings.forEach(b => { if (b.day > 0) b.day = 0; });
        }
        
        // Offer to regenerate token after start date change
        if (Array.isArray(state.icsTokens) && state.icsTokens.length > 0) {
            if (confirm('Das Startdatum hat sich geändert.\nSoll ein neuer ICS-Token generiert werden?\n(Bestehende Kalender-Abonnements werden ungültig)')) {
                const token = generateToken();
                state.icsTokens.push({ token, created: new Date().toISOString() });
            }
        }
    }
    
    state.mode = newMode;
    state.eventStartDate = eventStartDate;
    state.eventDayCount = newDayCount;
    
    // Auto-generate token when first activating event mode without one
    if (newMode === 'event' && (!Array.isArray(state.icsTokens) || state.icsTokens.length === 0)) {
        const token = generateToken();
        state.icsTokens.push({ token, created: new Date().toISOString() });
    }
    
    // Colors
    const headerColor = rgbToHex(document.querySelector('.header-color-edit .color-swatch').style.backgroundColor);
    const secondaryColor = rgbToHex(document.querySelector('.secondary-color-edit .color-swatch').style.backgroundColor);
    document.documentElement.style.setProperty('--header-color', headerColor);
    document.documentElement.style.setProperty('--secondary', secondaryColor);
    
    // Time range
    const startHour = document.getElementById('startHour').value;
    const endHour = document.getElementById('endHour').value;
    localStorage.setItem('startHour', startHour);
    localStorage.setItem('endHour', endHour);
    
    // Password change
    const oldPwdInput = document.getElementById('oldpwd');
    const newPwdInput = document.getElementById('newpwd');
    
    if (oldPwdInput.value) {
        const oldHash = Number(localStorage.getItem('loginhash'));
        if (isNaN(oldHash) || oldHash !== stringToHash(oldPwdInput.value)) {
            alert('Das alte Passwort ist falsch');
            return;
        }
        if (!newPwdInput.value) {
            alert('Das neue Passwort darf nicht leer sein');
            return;
        }
        if (newPwdInput.value.length < 8 || 
            !/[A-Z]/.test(newPwdInput.value) || 
            !/[a-z]/.test(newPwdInput.value) || 
            !/[0-9]/.test(newPwdInput.value)) {
            alert('Das neue Passwort muss mindestens 8 Zeichen lang sein und Groß-/Kleinbuchstaben sowie Zahlen enthalten');
            return;
        }
        if (!confirm('Möchten Sie das Passwort wirklich aktualisieren?')) {
            alert('Das Passwort wurde nicht aktualisiert');
            return;
        }
    }
    
    const newLoginhash = newPwdInput.value
        ? stringToHash(newPwdInput.value)
        : Number(localStorage.getItem('loginhash'));
    
    // Hidden days (unchecked = hidden) – week mode only, numeric values
    const hiddenDays = [];
    if (state.mode === 'week') {
        document.querySelectorAll('#hiddenDaysCheckboxes input[type="checkbox"]').forEach(cb => {
            if (!cb.checked) hiddenDays.push(parseInt(cb.value));
        });
    }
    localStorage.setItem('hiddenDays', JSON.stringify(hiddenDays));
    
    // Hide empty days
    const hideEmptyDays = document.getElementById('hideEmptyDays').checked;
    localStorage.setItem('hideEmptyDays', String(hideEmptyDays));
    
    // Booking colors
    const bookingColors = Array.from(document.querySelectorAll('#bookingColors .color-edit')).map(el => ({
        name: el.querySelector('input').value,
        color: el.querySelector('.color-swatch').style.backgroundColor,
        id: el.id
    }));
    
    // Save config
    const configData = {
        title: document.querySelector('.calendar-header h2').textContent,
        headerColor,
        secondaryColor,
        startHour,
        endHour,
        bookingColors,
        hiddenDays,
        hideEmptyDays,
        loginhash: newLoginhash,
        mode: state.mode,
        eventStartDate: state.eventStartDate,
        eventDayCount: state.eventDayCount,
        icsTokens: state.icsTokens || [],
        icsPublic: document.getElementById('icsPublicCheckbox')?.checked || false,
        icsDayFilter: document.getElementById('icsDayFilterCheckbox')?.checked || false
    };
    
    // Update state for icsPublic / icsDayFilter
    state.icsPublic = configData.icsPublic;
    state.icsDayFilter = configData.icsDayFilter;
    
    await saveToServer('settings.json', configData);
    await saveToServer('bookings.json', state.bookings);
    
    localStorage.setItem('loginhash', String(newLoginhash));
    localStorage.setItem('bookingColors', JSON.stringify(bookingColors));
    
    // Clear password fields after successful save
    oldPwdInput.value = '';
    newPwdInput.value = '';
    
    createTimeOptions();
    buildMobileTiles();
    createDayColumns();
    closeOptionsModal();
}

async function updateCategorySelect() {
    try {
        const config = await loadFromServer('settings.json');
        if (config && config.bookingColors) {
            localStorage.setItem('bookingColors', JSON.stringify(config.bookingColors));
        }
    } catch (err) {
        console.error('Error loading config:', err);
    }
}

// =====================================================
// Import/Export
// =====================================================

async function exportBookings() {
    const bookingColors = JSON.parse(localStorage.getItem('bookingColors') || '[]');
    const cleanBookings = state.bookings.map(booking => {
        const clean = {};
        for (const [key, value] of Object.entries(booking)) {
            if (value !== undefined && value !== '') {
                clean[key] = value;
            }
        }
        // Embed categoryName for portable import
        if (clean.categoryID && clean.categoryID !== 'default') {
            const cat = bookingColors.find(c => c.id === clean.categoryID);
            if (cat) clean.categoryName = cat.name;
        }
        return clean;
    });
    
    await saveToServer('bookings.json', cleanBookings);
    
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(cleanBookings, null, 2));
    const downloadLink = document.createElement('a');
    downloadLink.setAttribute("href", dataStr);
    downloadLink.setAttribute("download", "bookings.json");
    document.body.appendChild(downloadLink);
    downloadLink.click();
    downloadLink.remove();
}

function importBookings() {
    const file = document.getElementById('importFile').files[0];
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
            
            // Migrate imported bookings from string days to numeric
            validBookings.forEach(b => {
                if (typeof b.day === 'string') {
                    const numDay = migrateDay(b.day);
                    if (numDay !== null) b.day = numDay;
                }
            });
            
            // Detect missing categories — match by ID first, then fall back to categoryName
            const localColors = JSON.parse(localStorage.getItem('bookingColors') || '[]');
            const localIds = new Set(localColors.map(c => c.id));
            const localNames = new Map(localColors.map(c => [c.name.toLowerCase(), c]));
            const missingCategories = new Map(); // id → { count, name }
            
            validBookings.forEach(b => {
                if (b.categoryID && b.categoryID !== 'default' && !localIds.has(b.categoryID)) {
                    // Try to match by name if available
                    const importName = b.categoryName || b.categoryID;
                    const localMatch = localNames.get(importName.toLowerCase());
                    if (localMatch) {
                        // Remap to local category ID
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
                    // Auto-create missing categories with default color
                    const defaultColor = getComputedStyle(document.documentElement)
                        .getPropertyValue('--secondary').trim() || '#6c757d';
                    missingCategories.forEach((info, id) => {
                        localColors.push({ id, name: info.name, color: defaultColor });
                    });
                    localStorage.setItem('bookingColors', JSON.stringify(localColors));
                } else if (categoryChoice === 'remove') {
                    // Strip categoryID from bookings with missing categories
                    validBookings.forEach(b => {
                        if (b.categoryID && missingCategories.has(b.categoryID)) {
                            delete b.categoryID;
                            delete b.categoryName;
                        }
                    });
                }
            }
            
            // Ask overwrite or append with custom dialog
            const importMode = await showImportModeDialog(validBookings.length);
            if (importMode === 'cancel') return;
            
            if (importMode === 'overwrite') {
                state.bookings.length = 0;
            }
            // Always assign fresh IDs on import (foreign data may have incompatible IDs)
            validBookings.forEach(b => { b.id = generateBookingId(); });
            state.bookings.push(...validBookings);
            
            await saveToServer('bookings.json', state.bookings);
            
            // If categories were created, save full settings to persist them
            if (categoryChoice === 'create') {
                try {
                    const configData = buildFullConfigData();
                    await saveToServer('settings.json', configData);
                } catch (settingsError) {
                    console.error('Failed to save new categories to settings:', settingsError);
                    alert('Termine wurden importiert, aber die neuen Kategorien konnten nicht gespeichert werden. Bitte Einstellungen manuell speichern.');
                }
            }
            
            buildMobileTiles();
            createDayColumns();
            
            alert(`Import abgeschlossen: ${validBookings.length} Termine ${importMode === 'overwrite' ? 'importiert' : 'hinzugefügt'}.`);
        } catch (error) {
            alert('Fehler: Ungültiges Dateiformat. Bitte eine gültige JSON-Datei verwenden.');
            console.error('Import error:', error);
        }
    };
    reader.readAsText(file);
    // Reset file input so same file can be imported again
    document.getElementById('importFile').value = '';
}

/**
 * Show a custom dialog for missing category handling during import.
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
                <p style="white-space:pre-line;font-size:0.9em;margin-bottom:15px">Folgende Kategorien existieren lokal nicht:\n${escapeHtml(missingList)}</p>
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
 * Show a custom dialog for import mode: overwrite or append.
 * Returns: 'overwrite' | 'append' | 'cancel'
 */
function showImportModeDialog(count) {
    return new Promise(resolve => {
        const overlay = document.createElement('div');
        overlay.className = 'modal';
        overlay.style.display = 'flex';
        overlay.innerHTML = `
            <div class="modal-content" style="max-width:420px">
                <h3>Import: ${count} Termine</h3>
                <p style="font-size:0.9em;margin-bottom:15px">Sollen die bestehenden Termine überschrieben oder die neuen Termine ergänzt werden?</p>
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
 * Show dialog when event start date changes.
 * Options: keep relative, shift to new dates, move all to Ablage.
 * Returns: 'relative' | 'shift' | 'ablage' | 'cancel'
 */
function showStartDateChangeDialog(oldDate, newDate) {
    const oldFormatted = new Date(oldDate + 'T00:00:00').toLocaleDateString('de-DE');
    const newFormatted = new Date(newDate + 'T00:00:00').toLocaleDateString('de-DE');
    return new Promise(resolve => {
        const overlay = document.createElement('div');
        overlay.className = 'modal';
        overlay.style.display = 'flex';
        overlay.innerHTML = `
            <div class="modal-content" style="max-width:480px">
                <h3>Startdatum geändert</h3>
                <p style="font-size:0.9em;margin-bottom:15px">
                    Das Startdatum ändert sich von <strong>${oldFormatted}</strong> zu <strong>${newFormatted}</strong>.<br>
                    Wie sollen die bestehenden Termine behandelt werden?
                </p>
                <div style="display:flex;flex-direction:column;gap:8px">
                    <button type="button" data-choice="relative">Relativ beibehalten <span style="font-size:0.8em;opacity:0.7">— Tag-Nummern bleiben gleich</span></button>
                    <button type="button" data-choice="shift">Auf neues Datum verschieben <span style="font-size:0.8em;opacity:0.7">— Termine folgen dem Kalender</span></button>
                    <button type="button" class="danger-button" data-choice="ablage">Alle in Ablage <span style="font-size:0.8em;opacity:0.7">— Termine manuell neu verteilen</span></button>
                    <button type="button" class="cancel-button" data-choice="cancel">Abbrechen</button>
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
 * Build a complete settings config object from current state + localStorage.
 * Used when saving settings and when import creates new categories.
 */
function buildFullConfigData() {
    return {
        title: document.querySelector('.calendar-header h2')?.textContent || 'Wochenplan',
        headerColor: getComputedStyle(document.documentElement).getPropertyValue('--header-color').trim(),
        secondaryColor: getComputedStyle(document.documentElement).getPropertyValue('--secondary').trim(),
        startHour: localStorage.getItem('startHour') || CONFIG.DEFAULT_START_HOUR,
        endHour: localStorage.getItem('endHour') || CONFIG.DEFAULT_END_HOUR,
        bookingColors: JSON.parse(localStorage.getItem('bookingColors') || '[]'),
        hiddenDays: JSON.parse(localStorage.getItem('hiddenDays') || '[]'),
        hideEmptyDays: localStorage.getItem('hideEmptyDays') === 'true',
        loginhash: Number(localStorage.getItem('loginhash')) || CONFIG.DEFAULT_HASH,
        mode: state.mode,
        eventStartDate: state.eventStartDate,
        eventDayCount: state.eventDayCount,
        icsTokens: state.icsTokens || [],
        icsPublic: !!state.icsPublic,
        icsDayFilter: !!state.icsDayFilter
    };
}

function validateBooking(booking) {
    const requiredFields = ['day', 'startTime', 'endTime', 'title'];
    return requiredFields.every(field => booking[field] && String(booking[field]).trim() !== '');
}

// =====================================================
// Initialization
// =====================================================

function initializeDefaults() {
    localStorage.setItem('startHour', CONFIG.DEFAULT_START_HOUR);
    localStorage.setItem('endHour', CONFIG.DEFAULT_END_HOUR);
    localStorage.setItem('bookingColors', '[]');
    localStorage.setItem('loginhash', CONFIG.DEFAULT_HASH);
    localStorage.setItem('hiddenDays', '[]');
    localStorage.setItem('hideEmptyDays', 'false');
    document.documentElement.style.setProperty('--header-color', '#2196F3');
    state.bookings.length = 0;
    state.mode = 'week';
    state.eventStartDate = null;
    state.eventDayCount = 3;
    state.icsTokens = [];
    state.icsPublic = false;
    state.icsDayFilter = false;
    createTimeOptions();
    buildMobileTiles();
    createDayColumns();
}

async function initialize() {
    parseUrlParams();
    
    try {
        showLoading();
        
        const [config, bookings] = await Promise.all([
            loadFromServer('settings.json'),
            loadFromServer('bookings.json')
        ]);
        
        if (config) {
            document.querySelector('.calendar-header h2').textContent = config.title || 'Wochenplan';
            document.documentElement.style.setProperty('--header-color', config.headerColor || '#2196F3');
            document.documentElement.style.setProperty('--secondary', config.secondaryColor || '#FFC107');
            localStorage.setItem('startHour', config.startHour || CONFIG.DEFAULT_START_HOUR);
            localStorage.setItem('endHour', config.endHour || CONFIG.DEFAULT_END_HOUR);
            localStorage.setItem('bookingColors', JSON.stringify(config.bookingColors || []));
            localStorage.setItem('loginhash', String(Number(config.loginhash) || CONFIG.DEFAULT_HASH));
            
            // Mode settings
            state.mode = config.mode || 'week';
            state.eventStartDate = config.eventStartDate || null;
            state.eventDayCount = config.eventDayCount || 3;
            
            // ICS settings
            state.icsTokens = Array.isArray(config.icsTokens) ? config.icsTokens : [];
            state.icsPublic = !!config.icsPublic;
            state.icsDayFilter = !!config.icsDayFilter;
            
            // Migrate hiddenDays from string format to numeric if needed
            const rawHidden = config.hiddenDays || [];
            const migratedHidden = migrateHiddenDays(rawHidden);
            localStorage.setItem('hiddenDays', JSON.stringify(migratedHidden));
            localStorage.setItem('hideEmptyDays', String(config.hideEmptyDays || false));
        } else {
            initializeDefaults();
        }
        
        if (bookings && Array.isArray(bookings)) {
            // Auto-migrate bookings from string days to numeric
            let migrated = false;
            state.bookings = bookings.map(b => {
                if (typeof b.day === 'string') {
                    const numDay = migrateDay(b.day);
                    if (numDay !== null) {
                        b.day = numDay;
                        migrated = true;
                    }
                }
                // Assign IDs to bookings that don't have one yet
                if (ensureBookingId(b)) {
                    migrated = true;
                }
                return b;
            });
            
            // Save migrated bookings back to server
            if (migrated) {
                try {
                    await saveToServer('bookings.json', state.bookings);
                    console.log('Bookings migrated (day format / IDs)');
                } catch (e) {
                    console.warn('Could not save migrated bookings:', e);
                }
            }
        }
        
    } catch (err) {
        console.error('Error loading data:', err);
        initializeDefaults();
    } finally {
        hideLoading();
    }
    
    createTimeOptions();
    buildMobileTiles();
    createDayColumns();
    
    // Show edit button unless embedded
    if (!state.urlParams.embedded && !state.urlParams.readonly) {
        document.getElementById('editButton').style.display = 'flex';
    }
    
    // Initial sidebar state
    if (state.sidebarOpen) {
        toggleSidebar();
    }
    
    // Show ICS button for public users if icsPublic is enabled
    if (state.icsPublic && !state.urlParams.readonly && !state.urlParams.embedded) {
        document.getElementById('icsButton').style.display = 'flex';
    }
    
    // ?view=ics embedded mode: show only the ICS modal
    if (state.urlParams.view === 'ics' && state.urlParams.embedded) {
        // Hide everything except the modal
        document.getElementById('main').style.display = 'none';
        document.getElementById('sidebar')?.style.setProperty('display', 'none', 'important');
        showIcsModal();
    }
}

// =====================================================
// ICS Calendar Export
// =====================================================

/**
 * Generate a random 6-character alphanumeric token.
 */
function generateToken() {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

/**
 * Generate a new ICS token and append to icsTokens array.
 * Saves settings immediately.
 */
async function generateIcsToken() {
    if (!confirm('Neuen Token generieren?\nBestehende Kalender-Abonnements mit dem alten Token werden ungültig.')) return;
    
    const token = generateToken();
    const entry = { token, created: new Date().toISOString() };
    
    if (!Array.isArray(state.icsTokens)) state.icsTokens = [];
    state.icsTokens.push(entry);
    
    // Save immediately
    const configData = buildFullConfigData();
    await saveToServer('settings.json', configData);
    
    updateIcsTokenDisplay();
}

/**
 * Update the ICS token display in the settings modal.
 */
function updateIcsTokenDisplay() {
    const display = document.getElementById('icsTokenDisplay');
    const hint = document.getElementById('icsTokenHint');
    if (!display || !hint) return;
    
    if (!Array.isArray(state.icsTokens) || state.icsTokens.length === 0) {
        display.textContent = 'Kein Token vorhanden';
        hint.textContent = 'Ein Token wird für Kalender-Abonnements benötigt.';
    } else {
        const active = state.icsTokens[state.icsTokens.length - 1];
        const created = new Date(active.created);
        const dateStr = created.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const timeStr = created.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
        display.textContent = `Aktiver Token: ${active.token}`;
        hint.textContent = `Generiert am ${dateStr} um ${timeStr} Uhr` +
            (state.icsTokens.length > 1 ? ` (${state.icsTokens.length} Token im Verlauf)` : '');
    }
}

/**
 * Build the base URL for ical.php requests.
 */
function getIcsBaseUrl() {
    const loc = window.location;
    const path = loc.pathname.replace(/\/[^/]*$/, '/');
    return `${loc.protocol}//${loc.host}${path}ical.php`;
}

/**
 * Count how many bookings match the current ICS modal filters.
 */
function countFilteredIcsBookings() {
    const categoryChecks = document.querySelectorAll('#icsCategoryChips input[type="checkbox"]');
    const dayChecks = document.querySelectorAll('#icsDayChips input[type="checkbox"]');
    
    const selectedCategories = new Set();
    categoryChecks.forEach(cb => { if (cb.checked) selectedCategories.add(cb.value); });
    const allCategoriesSelected = selectedCategories.size === categoryChecks.length;
    
    const selectedDays = new Set();
    dayChecks.forEach(cb => { if (cb.checked) selectedDays.add(parseInt(cb.value)); });
    const allDaysSelected = selectedDays.size === dayChecks.length;
    
    return state.bookings.filter(b => {
        if (b.day === 0) return false; // skip Ablage
        if (!allDaysSelected && !selectedDays.has(b.day)) return false;
        if (!allCategoriesSelected) {
            const catId = b.categoryID || 'default';
            if (!selectedCategories.has(catId)) return false;
        }
        return true;
    }).length;
}

/**
 * Build the ICS download/abo URL based on current filter selections.
 */
function buildIcsUrls() {
    const base = getIcsBaseUrl();
    const params = new URLSearchParams();
    
    // Category filter
    const categoryChecks = document.querySelectorAll('#icsCategoryChips input[type="checkbox"]');
    const allCats = [];
    const selectedCats = [];
    categoryChecks.forEach(cb => {
        allCats.push(cb.value);
        if (cb.checked) selectedCats.push(cb.dataset.name);
    });
    if (selectedCats.length > 0 && selectedCats.length < allCats.length) {
        params.set('category', selectedCats[0]); // ICS endpoint supports single category
    }
    
    // Day filter
    const dayChecks = document.querySelectorAll('#icsDayChips input[type="checkbox"]');
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
    
    // Download URL (always HTTPS)
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
 * Update ICS modal URLs and counter when filters change.
 */
function updateIcsModal() {
    const count = countFilteredIcsBookings();
    const counter = document.getElementById('icsCounter');
    if (counter) counter.textContent = `${count} Termin${count !== 1 ? 'e' : ''} ausgewählt`;
    
    const { downloadUrl, aboUrl } = buildIcsUrls();
    
    const downloadInput = document.getElementById('icsDownloadUrl');
    if (downloadInput) downloadInput.value = downloadUrl;
    
    const aboInput = document.getElementById('icsAboUrl');
    if (aboInput) aboInput.value = aboUrl;
    
    // Show/hide abo section (only in event mode with token)
    const aboSection = document.getElementById('icsAboSection');
    if (aboSection) {
        const hasToken = Array.isArray(state.icsTokens) && state.icsTokens.length > 0;
        aboSection.style.display = (state.mode === 'event' && hasToken) ? '' : 'none';
    }
}

/**
 * Show the ICS export modal.
 */
function showIcsModal() {
    const modal = document.getElementById('icsModal');
    if (!modal) return;
    
    // Build category chips
    const catContainer = document.getElementById('icsCategoryChips');
    catContainer.innerHTML = '';
    const bookingColors = ensureDefaultCategory();
    
    bookingColors.forEach(c => {
        const chip = document.createElement('label');
        chip.className = 'ics-chip';
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.value = c.id;
        cb.dataset.name = c.name;
        cb.checked = true;
        cb.addEventListener('change', updateIcsModal);
        chip.appendChild(cb);
        chip.appendChild(document.createTextNode(c.name));
        catContainer.appendChild(chip);
    });
    
    // Build day chips (only if icsDayFilter is enabled by admin)
    const daySection = document.getElementById('icsDaySection');
    const dayContainer = document.getElementById('icsDayChips');
    dayContainer.innerHTML = '';
    
    if (state.icsDayFilter) {
        if (daySection) daySection.style.display = '';
        const count = getDayCount();
        for (let i = 1; i <= count; i++) {
            const chip = document.createElement('label');
            chip.className = 'ics-chip';
            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.value = i;
            cb.checked = true;
            cb.addEventListener('change', updateIcsModal);
            chip.appendChild(cb);
            chip.appendChild(document.createTextNode(getDayLabel(i)));
            dayContainer.appendChild(chip);
        }
    } else {
        if (daySection) daySection.style.display = 'none';
    }
    
    updateIcsModal();
    modal.style.display = 'flex';
}

function closeIcsModal() {
    document.getElementById('icsModal').style.display = 'none';
}

function showHelpModal() {
    document.getElementById('helpModal').style.display = 'flex';
}

function closeHelpModal() {
    document.getElementById('helpModal').style.display = 'none';
}

// =====================================================
// Context Menu
// =====================================================

/**
 * Remove any open context menu from the DOM.
 */
function closeContextMenu() {
    document.querySelectorAll('.context-menu').forEach(m => m.remove());
}

/**
 * Show a custom context menu for a booking element.
 * Supports single booking and multi-selection modes.
 */
function showBookingContextMenu(e, bookingIndex) {
    e.preventDefault();
    e.stopPropagation();
    closeContextMenu();
    
    const isMulti = state.selectedBookingIndices.size > 1 && state.selectedBookingIndices.has(bookingIndex);
    const menu = document.createElement('div');
    menu.className = 'context-menu';
    
    if (!isMulti) {
        // ── Single booking menu ──
        // Bearbeiten
        const editItem = createCtxItem('✎', 'Bearbeiten', () => { closeContextMenu(); editBooking(bookingIndex); });
        menu.appendChild(editItem);
        
        // Duplizieren
        const dupItem = createCtxItem('⧉', 'Duplizieren', () => { closeContextMenu(); duplicateBookingDirect(bookingIndex); });
        menu.appendChild(dupItem);
        
        // Divider
        menu.appendChild(createCtxDivider());
        
        // Kategorie submenu
        menu.appendChild(createCategorySubmenu([bookingIndex]));
        
        // Divider
        menu.appendChild(createCtxDivider());
        
        // Löschen
        const delItem = createCtxItem('🗑', 'Löschen', () => { closeContextMenu(); deleteBooking(bookingIndex); }, true);
        menu.appendChild(delItem);
    } else {
        // ── Multi-selection menu ──
        const count = state.selectedBookingIndices.size;
        const indices = Array.from(state.selectedBookingIndices);
        
        // Header hint
        const header = document.createElement('div');
        header.className = 'context-menu-item disabled';
        header.innerHTML = `<span class="ctx-icon">☰</span><span class="ctx-label">${count} Termine ausgewählt</span>`;
        menu.appendChild(header);
        
        menu.appendChild(createCtxDivider());
        
        // Kategorie submenu
        menu.appendChild(createCategorySubmenu(indices));
        
        // Divider
        menu.appendChild(createCtxDivider());
        
        // Löschen
        const delItem = createCtxItem('🗑', `${count} Termine löschen`, () => { closeContextMenu(); deleteSelectedBookings(); }, true);
        menu.appendChild(delItem);
    }
    
    document.body.appendChild(menu);
    positionContextMenu(menu, e.clientX, e.clientY);
    
    // Close on outside click (next tick to avoid immediate close)
    setTimeout(() => {
        const closeHandler = (ev) => {
            if (!menu.contains(ev.target)) {
                closeContextMenu();
                document.removeEventListener('mousedown', closeHandler, true);
            }
        };
        document.addEventListener('mousedown', closeHandler, true);
    }, 0);
}

/**
 * Create a context menu item.
 */
function createCtxItem(icon, label, onclick, isDanger) {
    const item = document.createElement('div');
    item.className = 'context-menu-item' + (isDanger ? ' danger' : '');
    item.innerHTML = `<span class="ctx-icon">${icon}</span><span class="ctx-label">${escapeHtml(label)}</span>`;
    item.addEventListener('click', onclick);
    return item;
}

/**
 * Create a context menu divider.
 */
function createCtxDivider() {
    const div = document.createElement('div');
    div.className = 'context-menu-divider';
    return div;
}

/**
 * Create the category submenu item with flyout.
 */
function createCategorySubmenu(bookingIndices) {
    const item = document.createElement('div');
    item.className = 'context-menu-item';
    item.innerHTML = `<span class="ctx-icon">●</span><span class="ctx-label">Kategorie</span><span class="ctx-arrow">▸</span>`;
    
    const submenu = document.createElement('div');
    submenu.className = 'context-submenu';
    
    const categories = ensureDefaultCategory();
    
    // Determine current category (for single selection, show checkmark)
    let currentCatId = null;
    if (bookingIndices.length === 1) {
        const b = state.bookings[bookingIndices[0]];
        currentCatId = b ? (b.categoryID || 'default') : null;
    }
    
    categories.forEach(cat => {
        const catItem = document.createElement('div');
        catItem.className = 'context-menu-item';
        
        const checkmark = currentCatId === cat.id ? '✔' : '';
        const swatchColor = sanitizeColor(cat.color);
        
        catItem.innerHTML = `
            <span class="ctx-check">${checkmark}</span>
            <span class="ctx-swatch" style="background:${swatchColor}"></span>
            <span class="ctx-label">${escapeHtml(cat.name)}</span>
        `;
        
        catItem.addEventListener('click', async () => {
            closeContextMenu();
            await applyCategoryToBookings(bookingIndices, cat.id);
        });
        
        submenu.appendChild(catItem);
    });
    
    item.appendChild(submenu);
    return item;
}

/**
 * Apply a category to one or more bookings by index.
 */
async function applyCategoryToBookings(indices, categoryId) {
    const bookingColors = JSON.parse(localStorage.getItem('bookingColors') || '[]');
    const colorConfig = bookingColors.find(c => c.id === categoryId);
    const color = colorConfig ? colorConfig.color : 'var(--secondary)';
    
    indices.forEach(i => {
        const booking = state.bookings[i];
        if (booking) {
            booking.categoryID = categoryId;
            booking.color = color;
            if (colorConfig) booking.categoryName = colorConfig.name;
        }
    });
    
    await saveToServer('bookings.json', state.bookings);
    clearMultiSelection();
    createDayColumns();
}

/**
 * Duplicate a booking directly (without opening the edit modal).
 */
async function duplicateBookingDirect(index) {
    const source = state.bookings[index];
    if (!source) return;
    
    const copy = JSON.parse(JSON.stringify(source));
    copy.id = generateBookingId();
    state.bookings.push(copy);
    
    await saveToServer('bookings.json', state.bookings);
    buildMobileTiles();
    createDayColumns();
}

/**
 * Position a context menu on screen, keeping it within viewport bounds.
 */
function positionContextMenu(menu, x, y) {
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    
    // Adjust after render to keep within viewport
    requestAnimationFrame(() => {
        const rect = menu.getBoundingClientRect();
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        
        if (rect.right > vw - 8) {
            menu.style.left = `${Math.max(8, x - rect.width)}px`;
        }
        if (rect.bottom > vh - 8) {
            menu.style.top = `${Math.max(8, y - rect.height)}px`;
        }
        
        // Also check submenus – flip if needed
        const subs = menu.querySelectorAll('.context-submenu');
        subs.forEach(sub => {
            const subRect = sub.getBoundingClientRect();
            if (subRect.right > vw - 8) {
                sub.style.left = 'auto';
                sub.style.right = '100%';
            }
        });
    });
}

// =====================================================
// Event Listeners
// =====================================================

document.addEventListener('DOMContentLoaded', () => {
    // Initialize app
    initialize();
    
    // Edit button
    document.getElementById('editButton')?.addEventListener('click', () => {
        if (!state.isLoggedIn) {
            document.getElementById('loginModal').style.display = 'flex';
        } else {
            showOptionsModal();
        }
    });
    
    // Print button
    document.getElementById('printButton')?.addEventListener('click', () => {
        togglePrintPopup();
    });
    
    // ICS button
    document.getElementById('icsButton')?.addEventListener('click', () => {
        showIcsModal();
    });
    
    // Help button
    document.getElementById('helpButton')?.addEventListener('click', () => {
        showHelpModal();
    });
    
    // ICS modal buttons
    document.getElementById('icsCopyDownloadBtn')?.addEventListener('click', () => {
        const input = document.getElementById('icsDownloadUrl');
        if (input) {
            navigator.clipboard.writeText(input.value).then(() => {
                const btn = document.getElementById('icsCopyDownloadBtn');
                btn.textContent = '✓';
                setTimeout(() => { btn.textContent = 'Kopieren'; }, 1500);
            });
        }
    });
    
    document.getElementById('icsDownloadBtn')?.addEventListener('click', () => {
        const url = document.getElementById('icsDownloadUrl')?.value;
        if (url) window.open(url, '_blank');
    });
    
    document.getElementById('icsCopyAboBtn')?.addEventListener('click', () => {
        const input = document.getElementById('icsAboUrl');
        if (input) {
            navigator.clipboard.writeText(input.value).then(() => {
                const btn = document.getElementById('icsCopyAboBtn');
                btn.textContent = '✓';
                setTimeout(() => { btn.textContent = 'Kopieren'; }, 1500);
            });
        }
    });
    
    // Close print popup on outside click
    document.addEventListener('click', (e) => {
        const popup = document.getElementById('printPopup');
        const printBtn = document.getElementById('printButton');
        if (popup && popup.classList.contains('visible') &&
            !popup.contains(e.target) && !printBtn.contains(e.target)) {
            popup.classList.remove('visible');
        }
    });
    
    // New booking button
    document.getElementById('newBookingButton')?.addEventListener('click', () => {
        if (state.isLoggedIn) {
            state.selectedBookingIndex = null;
            
            // Reset form
            document.getElementById('bookingForm').reset();
            buildDaySelect();
            document.getElementById('bookingDay').value = 1;
            document.getElementById('bookingStart').value = '08:00';
            document.getElementById('bookingEnd').value = '09:00';
            
            // Populate category select
            buildCategoryOptions(document.getElementById('bookingCategory'));
            
            document.getElementById('modalDeleteButton').style.display = 'none';
            const dupBtn = document.getElementById('modalDuplicateButton');
            if (dupBtn) dupBtn.style.display = 'none';
            document.getElementById('bookingModal').style.display = 'flex';
        }
    });
    
    // Booking form submission
    document.getElementById('bookingForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const categoryID = document.getElementById('bookingCategory').value;
        const bookingColors = JSON.parse(localStorage.getItem('bookingColors') || '[]');
        const selectedCat = bookingColors.find(c => c.id === categoryID);
        const selectedColor = selectedCat?.color || 'var(--secondary)';
        
        const newBooking = {
            day: parseInt(document.getElementById('bookingDay').value),
            startTime: document.getElementById('bookingStart').value,
            endTime: document.getElementById('bookingEnd').value,
            location: document.getElementById('bookingLocation').value.trim(),
            title: document.getElementById('bookingTitle').value.trim(),
            trainer: document.getElementById('bookingTrainer').value.trim(),
            contact: document.getElementById('bookingContact').value.trim(),
            link: document.getElementById('bookingLink').value.trim(),
            categoryID: categoryID,
            categoryName: selectedCat?.name || '',
            description: document.getElementById('bookingDescription').value.trim(),
            color: selectedColor
        };
        
        // Validate: endTime must be after startTime
        if (timeToMinutes(newBooking.endTime) <= timeToMinutes(newBooking.startTime)) {
            alert('Die Endzeit muss nach der Startzeit liegen.');
            return;
        }
        
        if (state.selectedBookingIndex !== null) {
            // Preserve existing id on edit
            newBooking.id = state.bookings[state.selectedBookingIndex].id || generateBookingId();
            state.bookings[state.selectedBookingIndex] = newBooking;
        } else {
            newBooking.id = generateBookingId();
            state.bookings.push(newBooking);
        }
        
        await saveToServer('bookings.json', state.bookings);
        createDayColumns(); // Rebuild grid (hideEmptyDays may change visible columns)
        closeBookingModal();
    });
    
    // Color swatch click handlers
    document.getElementById('bookingColors')?.addEventListener('click', (e) => {
        if (e.target.classList.contains('color-swatch')) {
            const colorPicker = document.createElement('input');
            colorPicker.type = 'color';
            colorPicker.value = rgbToHex(e.target.style.backgroundColor);
            colorPicker.click();
            colorPicker.addEventListener('change', () => {
                e.target.style.backgroundColor = colorPicker.value;
            });
        } else if (e.target.classList.contains('color-delete')) {
            e.target.closest('.color-edit').remove();
        }
    });
    
    // Header color swatch
    document.querySelector('.header-color-edit .color-swatch')?.addEventListener('click', (e) => {
        const colorPicker = document.createElement('input');
        colorPicker.type = 'color';
        colorPicker.value = rgbToHex(e.target.style.backgroundColor);
        colorPicker.click();
        colorPicker.addEventListener('change', () => {
            e.target.style.backgroundColor = colorPicker.value;
        });
    });
    
    // Secondary color swatch
    document.querySelector('.secondary-color-edit .color-swatch')?.addEventListener('click', (e) => {
        const colorPicker = document.createElement('input');
        colorPicker.type = 'color';
        colorPicker.value = rgbToHex(e.target.style.backgroundColor);
        colorPicker.click();
        colorPicker.addEventListener('change', () => {
            e.target.style.backgroundColor = colorPicker.value;
        });
    });
    
    // Import file handler
    document.getElementById('importFile')?.addEventListener('change', importBookings);
    
    // Sidebar (Ablage) drag & drop target – both the header and entire sidebar
    const sidebarEl = document.getElementById('Ablage');
    const contentSidebarEl = document.getElementById('contentSidebar');
    
    const handleSidebarDragOver = (e) => {
        if (state.dragBookingIndex === null) return;
        e.preventDefault();
        state.dragIsCopy = e.shiftKey || e.ctrlKey;
        e.dataTransfer.dropEffect = state.dragIsCopy ? 'copy' : 'move';
        updateDragGhost(state.dragIsCopy, state.dragBookingIndex);
        if (sidebarEl) sidebarEl.classList.add('drag-over');
    };
    const handleSidebarDragLeave = (e) => {
        // Only remove highlight when actually leaving the sidebar container
        const related = e.relatedTarget;
        if (contentSidebarEl && contentSidebarEl.contains(related)) return;
        if (sidebarEl) sidebarEl.classList.remove('drag-over');
    };
    const handleSidebarDrop = async (e) => {
        e.preventDefault();
        if (sidebarEl) sidebarEl.classList.remove('drag-over');
        state.dragIsCopy = e.shiftKey || e.ctrlKey;
        const bookingIndex = state.dragBookingIndex;
        if (bookingIndex === null || bookingIndex < 0) return;
        
        const sourceBooking = state.bookings[bookingIndex];
        if (!sourceBooking || sourceBooking.day === 0) return;
        
        if (state.dragIsCopy) {
            const copy = JSON.parse(JSON.stringify(sourceBooking));
            copy.id = generateBookingId();
            copy.day = 0;
            state.bookings.push(copy);
        } else {
            sourceBooking.day = 0;
        }
        
        await saveToServer('bookings.json', state.bookings);
        createDayColumns();
    };
    
    [sidebarEl, contentSidebarEl].forEach(el => {
        if (!el) return;
        el.addEventListener('dragover', handleSidebarDragOver);
        el.addEventListener('dragleave', handleSidebarDragLeave);
        el.addEventListener('drop', handleSidebarDrop);
    });
    
    // Collapse bookings and clear selection when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.booking') && !e.target.closest('.mobile-booking')) {
            document.querySelectorAll('.booking, .mobile-booking').forEach(b => b.classList.remove('expanded'));
            if (!e.ctrlKey && !e.metaKey) {
                clearMultiSelection();
            }
        }
    });
    
    // Responsive sidebar handling
    window.addEventListener('resize', () => {
        if (window.innerWidth < 826 && state.sidebarOpen) {
            toggleSidebar();
        }
    });
    
    // Login on Enter key
    document.getElementById('password')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            login();
        }
    });
    
    // Escape key closes any open modal or popup
    // DEL key deletes expanded/selected bookings
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            // Close context menu first if open
            const ctxMenu = document.querySelector('.context-menu');
            if (ctxMenu) {
                closeContextMenu();
                return;
            }
            
            // Close print popup first if visible
            const printPopup = document.getElementById('printPopup');
            if (printPopup && printPopup.classList.contains('visible')) {
                printPopup.classList.remove('visible');
                return;
            }
            
            // Clear multi-selection first
            if (state.selectedBookingIndices.size > 0) {
                clearMultiSelection();
                return;
            }
            
            const modals = [
                { el: document.getElementById('loginModal'), close: closeLoginModal },
                { el: document.getElementById('bookingModal'), close: closeBookingModal },
                { el: document.getElementById('viewBookingModal'), close: closeViewBookingModal },
                { el: document.getElementById('helpModal'), close: closeHelpModal },
                { el: document.getElementById('icsModal'), close: closeIcsModal },
                { el: document.getElementById('optionsModal'), close: closeOptionsModal }
            ];
            for (const modal of modals) {
                if (modal.el && modal.el.style.display === 'flex') {
                    modal.close();
                    break;
                }
            }
        }
        
        // DEL key: delete selected or expanded bookings
        if (e.key === 'Delete' && state.isLoggedIn && !state.urlParams.readonly) {
            // Don't trigger if inside an input/modal
            if (e.target.closest('input, textarea, select, .modal')) return;
            
            // Multi-selected bookings
            if (state.selectedBookingIndices.size > 0) {
                e.preventDefault();
                deleteSelectedBookings();
                return;
            }
            
            // Single expanded booking
            const expanded = document.querySelector('.booking.expanded, .mobile-booking.expanded');
            if (expanded) {
                e.preventDefault();
                const index = parseInt(expanded.dataset.index);
                if (!isNaN(index)) deleteBooking(index);
            }
        }
    });
    
    // Mode toggle in settings
    document.querySelectorAll('input[name="calendarMode"]').forEach(r => {
        r.addEventListener('change', updateModeUI);
    });
    
    // Event mode live preview
    document.getElementById('eventStartDate')?.addEventListener('change', updateEventPreview);
    document.getElementById('eventDayCount')?.addEventListener('input', updateEventPreview);
});

// Expose functions to global scope for onclick handlers
window.toggleSidebar = toggleSidebar;
window.login = login;
window.logout = logout;
window.closeLoginModal = closeLoginModal;
window.closeBookingModal = closeBookingModal;
window.closeViewBookingModal = closeViewBookingModal;
window.closeIcsModal = closeIcsModal;
window.closeHelpModal = closeHelpModal;
window.closeOptionsModal = closeOptionsModal;
window.saveSettings = saveSettings;
window.exportBookings = exportBookings;
window.executePrint = executePrint;
window.togglePrintPopup = togglePrintPopup;
window.updateModeUI = updateModeUI;
window.updateEventPreview = updateEventPreview;
window.duplicateBooking = duplicateBooking;
window.generateIcsToken = generateIcsToken;
