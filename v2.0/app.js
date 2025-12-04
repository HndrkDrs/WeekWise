/**
 * WeekWise 2.0 - Application JavaScript
 * 
 * A weekly schedule planner optimized for:
 * - Running on any webspace (HTML, JS, PHP)
 * - Zero maintenance after setup
 * - Flexible embedding via iFrame
 */

// =====================================================
// Configuration & State
// =====================================================

const CONFIG = {
    DAYS: ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag', 'Ablage'],
    DEFAULT_START_HOUR: 8,
    DEFAULT_END_HOUR: 22,
    DEFAULT_HASH: -1352366804, // Default password hash
    ALLOWED_FILENAMES: ['settings.json', 'bookings.json']
};

const state = {
    bookings: [],
    isLoggedIn: false,
    selectedDay: null,
    selectedColumn: null,
    selectedBookingIndex: null,
    sidebarOpen: false,
    urlParams: {}
};

// =====================================================
// URL Parameter Handling (Embedded Mode)
// =====================================================

function parseUrlParams() {
    const params = new URLSearchParams(window.location.search);
    state.urlParams = {
        embedded: params.get('embedded') === 'true',
        category: params.get('category'),
        day: params.get('day'),
        readonly: params.get('readonly') === 'true',
        compact: params.get('compact') === 'true'
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
        r = parseInt(hex.substr(0, 2), 16);
        g = parseInt(hex.substr(2, 2), 16);
        b = parseInt(hex.substr(4, 2), 16);
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
// Day Columns (Desktop View)
// =====================================================

function createDayColumns() {
    const container = document.getElementById('dayColumns');
    if (!container) return;
    
    container.innerHTML = '';
    const startHour = parseInt(localStorage.getItem('startHour') || CONFIG.DEFAULT_START_HOUR);
    const endHour = parseInt(localStorage.getItem('endHour') || CONFIG.DEFAULT_END_HOUR);
    const totalHeight = (endHour - startHour) * 60;
    
    // Filter days based on URL parameter
    let daysToShow = CONFIG.DAYS.slice(0, 7); // Exclude 'Ablage' from main view
    if (state.urlParams.day) {
        const dayIndex = CONFIG.DAYS.indexOf(state.urlParams.day);
        if (dayIndex !== -1 && dayIndex < 7) {
            daysToShow = [state.urlParams.day];
        }
    }
    
    // Update weekdays header
    const weekdaysContainer = document.querySelector('.weekdays');
    if (weekdaysContainer && state.urlParams.day) {
        weekdaysContainer.innerHTML = daysToShow.map(day => 
            `<div class="weekday">${escapeHtml(day)}</div>`
        ).join('');
        weekdaysContainer.style.gridTemplateColumns = `repeat(${daysToShow.length}, 1fr)`;
        container.style.gridTemplateColumns = `repeat(${daysToShow.length}, 1fr)`;
    }
    
    daysToShow.forEach(day => {
        const column = document.createElement('div');
        column.className = 'day-column';
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
                if (state.isLoggedIn && e.target.classList.contains('day-column')) {
                    state.selectedDay = day;
                    state.selectedColumn = column;
                    
                    const rect = column.getBoundingClientRect();
                    const clickY = e.clientY - rect.top;
                    const hour = Math.floor(clickY / 60) + startHour;
                    const minute = Math.round((clickY % 60) / 15) * 15;
                    
                    document.getElementById('bookingDay').value = day;
                    document.getElementById('bookingStart').value = formatTime(hour, minute);
                    
                    const endHourCalc = hour + 1;
                    if (endHourCalc <= endHour) {
                        document.getElementById('bookingEnd').value = formatTime(endHourCalc, minute);
                    }
                    
                    document.getElementById('bookingModal').style.display = 'flex';
                }
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
    
    const bgColor = rgbToHex(booking.color) || booking.color || 'var(--secondary)';
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
    
    el.innerHTML = html;
    
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
            // Toggle expanded state
            const allBookings = document.querySelectorAll(isMobile ? '.mobile-booking' : '.booking');
            allBookings.forEach(b => {
                if (b !== el) b.classList.remove('expanded');
            });
            el.classList.toggle('expanded');
        }
    });
    
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
    
    // Filter days based on URL parameter
    let daysToShow = CONFIG.DAYS;
    if (state.urlParams.day) {
        const dayIndex = CONFIG.DAYS.indexOf(state.urlParams.day);
        if (dayIndex !== -1) {
            // Hide other day tiles
            mobileColumns.forEach((column, index) => {
                const dayName = column.querySelector('.day-name');
                if (dayName && !dayName.textContent.includes(state.urlParams.day)) {
                    column.style.display = 'none';
                } else {
                    column.style.display = 'block';
                }
            });
            daysToShow = [state.urlParams.day];
        }
    }
    
    bookings.forEach((booking, index) => {
        const dayIndex = CONFIG.DAYS.indexOf(booking.day);
        if (dayIndex !== -1 && dayIndex < mobileColumns.length) {
            const column = mobileColumns[dayIndex];
            if (column && column.style.display !== 'none') {
                const bookingEl = createBookingElement(booking, index, true);
                column.appendChild(bookingEl);
            }
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
    
    // Get bookings for each day and calculate overlaps
    const dayColumns = {};
    columns.forEach(column => {
        dayColumns[column.dataset.day] = column;
    });
    
    // Calculate overlaps for each day
    const overlapInfoByDay = {};
    Object.keys(dayColumns).forEach(day => {
        overlapInfoByDay[day] = detectOverlaps(bookings, day);
    });
    
    bookings.forEach((booking, index) => {
        const dayIndex = CONFIG.DAYS.indexOf(booking.day);
        if (dayIndex === 7) return; // Skip 'Ablage'
        
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
        .filter(b => b.day === 'Ablage')
        .forEach((booking, idx) => {
            const originalIndex = state.bookings.indexOf(booking);
            const bookingEl = createBookingElement(booking, originalIndex, true);
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
    
    document.querySelector('.view-booking-header').style.backgroundColor = booking.color;
    
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
    const bookingColors = JSON.parse(localStorage.getItem('bookingColors') || '[]');
    const categorySelect = document.getElementById('bookingCategory');
    categorySelect.innerHTML = '<option value="default">Standard</option>';
    bookingColors.forEach(color => {
        const option = document.createElement('option');
        option.textContent = color.name;
        option.style.color = rgbToHex(color.color);
        option.value = color.id;
        categorySelect.appendChild(option);
    });
    
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
    
    state.selectedBookingIndex = index;
    document.getElementById('bookingModal').style.display = 'flex';
}

async function deleteBooking(index) {
    if (confirm('Möchten Sie diesen Termin wirklich löschen?')) {
        state.bookings.splice(index, 1);
        await saveToServer('bookings.json', state.bookings);
        renderBookings();
        closeBookingModal();
    }
}

function closeBookingModal() {
    document.getElementById('bookingModal').style.display = 'none';
    document.getElementById('bookingForm').reset();
    document.getElementById('modalDeleteButton').style.display = 'none';
    state.selectedBookingIndex = null;
}

// =====================================================
// Authentication
// =====================================================

function login() {
    const passwordInput = document.getElementById('password');
    const password = stringToHash(passwordInput.value);
    const storedHash = parseInt(localStorage.getItem('loginhash'), 10);
    
    if (password === storedHash) {
        state.isLoggedIn = true;
        document.getElementById('editButton').innerHTML = '<span class="icon settings"></span>';
        document.getElementById('newBookingButton').style.display = 'flex';
        closeLoginModal();
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
        closeOptionsModal();
        if (state.sidebarOpen) {
            toggleSidebar(true);
        }
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
    
    // Booking colors
    await updateCategorySelect();
    renderColorOptions();
}

function renderColorOptions() {
    const container = document.getElementById('bookingColors');
    if (!container) return;
    
    container.innerHTML = '';
    const savedColors = JSON.parse(localStorage.getItem('bookingColors') || '[]');
    
    savedColors.forEach(({ name, color, id }) => {
        const colorEdit = document.createElement('div');
        colorEdit.className = 'color-edit';
        colorEdit.id = id;
        colorEdit.innerHTML = `
            <div class="color-swatch" style="background-color: ${color}"></div>
            <input type="text" value="${escapeHtml(name)}" placeholder="Kategoriename">
            <span class="icon del color-delete"></span>
        `;
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
        colorEdit.innerHTML = `
            <div class="color-swatch" style="background-color: #2196F3"></div>
            <input type="text" placeholder="Name">
            <span class="icon del color-delete"></span>
        `;
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
        const oldHash = localStorage.getItem('loginhash');
        if (parseInt(oldHash) !== stringToHash(oldPwdInput.value)) {
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
        localStorage.setItem('loginhash', stringToHash(newPwdInput.value));
    }
    
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
        loginhash: localStorage.getItem('loginhash')
    };
    
    await saveToServer('settings.json', configData);
    await saveToServer('bookings.json', state.bookings);
    
    localStorage.setItem('bookingColors', JSON.stringify(bookingColors));
    
    createTimeOptions();
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
    const cleanBookings = state.bookings.map(booking => {
        const clean = {};
        for (const [key, value] of Object.entries(booking)) {
            if (value !== undefined && value !== '') {
                clean[key] = value;
            }
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
            
            if (confirm('Möchten Sie die bestehenden Termine überschreiben oder ergänzen?\nOK = Überschreiben, Abbrechen = Ergänzen')) {
                state.bookings.length = 0;
            }
            state.bookings.push(...validBookings);
            
            await saveToServer('bookings.json', state.bookings);
            renderBookings();
        } catch (error) {
            alert('Fehler: Ungültiges Dateiformat. Bitte eine gültige JSON-Datei verwenden.');
            console.error('Import error:', error);
        }
    };
    reader.readAsText(file);
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
    document.documentElement.style.setProperty('--header-color', '#2196F3');
    state.bookings.length = 0;
    createTimeOptions();
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
            localStorage.setItem('loginhash', config.loginhash || CONFIG.DEFAULT_HASH);
        } else {
            initializeDefaults();
        }
        
        if (bookings && Array.isArray(bookings)) {
            state.bookings = bookings;
        }
        
    } catch (err) {
        console.error('Error loading data:', err);
        initializeDefaults();
    } finally {
        hideLoading();
    }
    
    createTimeOptions();
    createDayColumns();
    
    // Show edit button unless embedded
    if (!state.urlParams.embedded && !state.urlParams.readonly) {
        document.getElementById('editButton').style.display = 'flex';
    }
    
    // Initial sidebar state
    if (state.sidebarOpen) {
        toggleSidebar();
    }
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
    
    // New booking button
    document.getElementById('newBookingButton')?.addEventListener('click', () => {
        if (state.isLoggedIn) {
            // Reset form
            document.getElementById('bookingForm').reset();
            document.getElementById('bookingDay').value = 'Montag';
            document.getElementById('bookingStart').value = '08:00';
            document.getElementById('bookingEnd').value = '09:00';
            
            // Populate category select
            const bookingColors = JSON.parse(localStorage.getItem('bookingColors') || '[]');
            const categorySelect = document.getElementById('bookingCategory');
            categorySelect.innerHTML = '<option value="default">Standard</option>';
            bookingColors.forEach(color => {
                const option = document.createElement('option');
                option.textContent = color.name;
                option.value = color.id;
                categorySelect.appendChild(option);
            });
            
            document.getElementById('modalDeleteButton').style.display = 'none';
            document.getElementById('bookingModal').style.display = 'flex';
        }
    });
    
    // Booking form submission
    document.getElementById('bookingForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const categoryID = document.getElementById('bookingCategory').value;
        const bookingColors = JSON.parse(localStorage.getItem('bookingColors') || '[]');
        const selectedColor = bookingColors.find(c => c.id === categoryID)?.color || 'var(--secondary)';
        
        const newBooking = {
            day: document.getElementById('bookingDay').value,
            startTime: document.getElementById('bookingStart').value,
            endTime: document.getElementById('bookingEnd').value,
            location: document.getElementById('bookingLocation').value.trim(),
            title: document.getElementById('bookingTitle').value.trim(),
            trainer: document.getElementById('bookingTrainer').value.trim(),
            contact: document.getElementById('bookingContact').value.trim(),
            link: document.getElementById('bookingLink').value.trim(),
            categoryID: categoryID,
            description: document.getElementById('bookingDescription').value.trim(),
            color: selectedColor
        };
        
        if (state.selectedBookingIndex !== null) {
            state.bookings[state.selectedBookingIndex] = newBooking;
        } else {
            state.bookings.push(newBooking);
        }
        
        await saveToServer('bookings.json', state.bookings);
        renderBookings();
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
    
    // Collapse bookings when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.booking') && !e.target.closest('.mobile-booking')) {
            document.querySelectorAll('.booking, .mobile-booking').forEach(b => b.classList.remove('expanded'));
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
});

// Expose functions to global scope for onclick handlers
window.toggleSidebar = toggleSidebar;
window.login = login;
window.logout = logout;
window.closeLoginModal = closeLoginModal;
window.closeBookingModal = closeBookingModal;
window.closeViewBookingModal = closeViewBookingModal;
window.closeOptionsModal = closeOptionsModal;
window.saveSettings = saveSettings;
window.exportBookings = exportBookings;
