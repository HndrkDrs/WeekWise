/**
 * WeekWise 3.0 – Application Entry Point (ES Module Bridge)
 * 
 * Imports all extracted modules, then defines the remaining
 * UI-layer functions (renderer, modals, sidebar, drag-drop, context-menu).
 * 
 * This is the active entry point for index.html via:
 *   <script type="module" src="app.js"></script>
 */

import { CONFIG, LOADING_LOGO_MIN_MS } from './js/core/constants.js';
import { stringToHash, rgbToHex, isLightColor, sanitizeColor, formatTime, timeToMinutes, escapeHtml, generateBookingId, ensureBookingId, snapTo15 } from './js/core/utils.js';
import { getState, onStateChange, getBookings, setBookings, isLoggedIn, setLoggedIn, getSelectedDay, setSelectedDay, getSelectedBookingIndex, setSelectedBookingIndex, getSelectedBookingIndices, clearMultiSelection, isSidebarOpen, setSidebarOpen, getMode, setMode, getEventStartDate, setEventStartDate, getEventDayCount, setEventDayCount, getDragBookingIndex, setDragBookingIndex, isDragCopy, setDragCopy, isResizing, setResizing, isJustResized, setJustResized, getIcsTokens, setIcsTokens, getUrlParams, setUrlParams, getLoadingStartTime, resetLoadingStartTime } from './js/core/state.js';
import { getStartHour, setStartHour, getEndHour, setEndHour, getHiddenDays, setHiddenDays, getHideEmptyDays, setHideEmptyDays, getCollapseEmptyHours, setCollapseEmptyHours, getBookingColors, setBookingColors, getLoginHash, setLoginHash, getHeaderColor, setHeaderColor, getSecondaryColor, setSecondaryColor, getCalendarTitle, setCalendarTitle } from './js/core/persist.js';
import { saveToServer, loadFromServer } from './js/services/server.js';
import { login as authLogin, logout as authLogout } from './js/services/auth.js';
import { generateToken, getIcsBaseUrl, buildIcsUrls, countFilteredIcsBookings } from './js/services/ics-service.js';
import { getDayCount, getDayLabel, getDayShortLabel, parseDayInput, parseDayList, migrateDay, migrateHiddenDays } from './js/models/day-model.js';
import { validateBooking, detectOverlaps, ensureDefaultCategory, getDefaultCategoryName, buildCategoryOptions } from './js/models/booking-model.js';
import { buildFullConfigData, renderColorOptions, initializeDefaults } from './js/models/settings-model.js';
import { parseUrlParams } from './js/features/url-params.js';
import { shouldCollapseEmpty, analyzeEmptyHours, buildYMapper } from './js/features/empty-collapse.js';
import { togglePrintPopup, executePrint } from './js/features/print.js';
import { exportBookings, importBookings } from './js/features/import-export.js';

// Re-expose to window for HTML onclick handlers
Object.assign(window, {
    stringToHash, rgbToHex, isLightColor, sanitizeColor, formatTime, timeToMinutes,
    escapeHtml, generateBookingId, ensureBookingId, snapTo15,
    CONFIG, LOADING_LOGO_MIN_MS,
    saveToServer, loadFromServer,
    generateToken, getIcsBaseUrl, buildIcsUrls, countFilteredIcsBookings,
    getDayCount, getDayLabel, getDayShortLabel, parseDayInput, parseDayList, migrateDay, migrateHiddenDays,
    validateBooking, detectOverlaps, ensureDefaultCategory, getDefaultCategoryName, buildCategoryOptions,
    buildFullConfigData, renderColorOptions, initializeDefaults,
    parseUrlParams, shouldCollapseEmpty, analyzeEmptyHours, buildYMapper,
    togglePrintPopup, executePrint, exportBookings, importBookings,
});

// ── State references for inline UI code ───────────────

const state = getState();

// Internal loading start time (used by showLoading/hideLoading)
let _loadingStartTime = Date.now();

function showLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (!overlay) return;
    _loadingStartTime = Date.now();
}

function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (!overlay) return;
    const elapsed = _loadingStartTime ? Date.now() - _loadingStartTime : Infinity;
    const delay = Math.max(0, LOADING_LOGO_MIN_MS - elapsed);
    setTimeout(() => {
        const el = document.getElementById('loadingOverlay');
        if (el) el.classList.remove('active');
    }, delay);
}

// ── Drag Ghost ───────────────────────────────────────

function updateDragGhost(isCopy, bookingIndex) {
    if (isCopy && !state.dragGhost) {
        const booking = getBookings()[bookingIndex];
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

// ── Sidebar ──────────────────────────────────────────

function toggleSidebar(updateVisibility = false) {
    if (isSidebarOpen()) closeSidebar(updateVisibility);
    else openSidebar(updateVisibility);
}

function openSidebar(updateVisibility = false) {
    setSidebarOpen(true);
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
    setSidebarOpen(false);
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

// ── Time Options ─────────────────────────────────────

function createTimeOptions() {
    const startH = getStartHour();
    const endH = getEndHour();
    const startSelect = document.getElementById('bookingStart');
    const endSelect = document.getElementById('bookingEnd');
    if (!startSelect || !endSelect) return;
    startSelect.innerHTML = '';
    endSelect.innerHTML = '';
    for (let hour = startH; hour <= endH; hour++) {
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

// ── Day Visibility ───────────────────────────────────

function getDaysToShow() {
    const count = getDayCount();
    const allDays = [];
    for (let i = 1; i <= count; i++) allDays.push(i);
    const hiddenDays = getHiddenDays();
    const hideEmptyDays = getHideEmptyDays() || getUrlParams().hideempty;
    const bookings = getBookings();
    const daysWithBookings = new Set(bookings.map(b => b.day));
    const allHiddenDays = new Set([
        ...(getMode() === 'week' ? hiddenDays : []),
        ...getUrlParams().hideDays
    ]);
    return allDays.map(dayNum => {
        const hiddenByDayParam = getUrlParams().days.length > 0 && !getUrlParams().days.includes(dayNum);
        const hiddenBySetting = allHiddenDays.has(dayNum);
        const isEmpty = !daysWithBookings.has(dayNum);
        const hiddenByEmpty = hideEmptyDays && isEmpty;
        const isHidden = hiddenByDayParam || hiddenBySetting || hiddenByEmpty;
        return { day: dayNum, label: getDayLabel(dayNum), hidden: isHidden, empty: isEmpty };
    });
}

// ── Day Columns ──────────────────────────────────────

function createDayColumns() {
    const container = document.getElementById('dayColumns');
    if (!container) return;
    container.innerHTML = '';
    const bookings = getBookings();
    const startHour = getStartHour();
    const endHour = getEndHour();
    let yMapper = null;
    const useCollapse = shouldCollapseEmpty();
    if (useCollapse) {
        const dayInfo = getDaysToShow();
        const visibleDayNums = new Set(dayInfo.filter(d => !d.hidden || isLoggedIn()).map(d => d.day));
        const emptyHours = analyzeEmptyHours(bookings, startHour, endHour, visibleDayNums);
        yMapper = buildYMapper(emptyHours, startHour);
    }
    const totalHeight = useCollapse && yMapper ? yMapper.getTotalHeight() : (endHour - startHour) * 60;
    const dayInfo = getDaysToShow();
    const visibleDays = dayInfo.filter(d => !d.hidden || isLoggedIn());
    const weekdaysContainer = document.querySelector('.weekdays');
    if (weekdaysContainer) {
        weekdaysContainer.innerHTML = visibleDays.map(d =>
            `<div class="weekday${d.hidden ? ' weekday-hidden' : ''}">${escapeHtml(d.label)}</div>`
        ).join('');
        weekdaysContainer.style.gridTemplateColumns = `repeat(${visibleDays.length}, 1fr)`;
        container.style.gridTemplateColumns = `repeat(${visibleDays.length}, 1fr)`;
        const needsScroll = visibleDays.length > 7;
        const scrollWrapper = document.getElementById('desktopScrollWrapper');
        weekdaysContainer.classList.toggle('event-scroll', needsScroll);
        container.classList.toggle('event-scroll', needsScroll);
        if (scrollWrapper) scrollWrapper.classList.toggle('event-scroll', needsScroll);
        if (needsScroll) {
            weekdaysContainer.style.gridTemplateColumns = `repeat(${visibleDays.length}, minmax(120px, 1fr))`;
            container.style.gridTemplateColumns = `repeat(${visibleDays.length}, minmax(120px, 1fr))`;
        }
    }
    const emptyHoursCache = useCollapse ? analyzeEmptyHours(bookings, startHour, endHour) : null;
    const urlParams = getUrlParams();
    visibleDays.forEach(({ day, label, hidden }) => {
        const column = document.createElement('div');
        column.className = 'day-column' + (hidden ? ' day-column-hidden' : '');
        column.dataset.day = day;
        column.style.height = `${totalHeight}px`;
        if (useCollapse) column.classList.add('day-column-collapsed');
        const timeMarkers = document.createElement('div');
        timeMarkers.className = 'time-markers';
        for (let hour = startHour; hour <= endHour; hour++) {
            const marker = document.createElement('div');
            marker.className = 'time-marker';
            if (useCollapse && yMapper) {
                let topPx;
                if (hour === endHour) topPx = yMapper.getTotalHeight();
                else topPx = yMapper.mapMinuteToPixel((hour - startHour) * 60);
                marker.style.top = `${topPx}px`;
                const hourInfo = emptyHoursCache ? emptyHoursCache.find(e => e.hour === hour) : null;
                if (hourInfo && hourInfo.empty) marker.classList.add('time-marker-collapsed');
            } else {
                marker.style.top = `${(hour - startHour) * 60}px`;
            }
            marker.textContent = `${hour}:00`;
            timeMarkers.appendChild(marker);
        }
        column.appendChild(timeMarkers);
        if (!urlParams.readonly && !urlParams.embedded) {
            column.addEventListener('click', (e) => {
                if (isJustResized()) return;
                if (isLoggedIn() && e.target.classList.contains('day-column')) {
                    setSelectedDay(day);
                    state.selectedColumn = column;
                    setSelectedBookingIndex(null);
                    document.getElementById('bookingForm')?.reset();
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
                    buildCategoryOptions(document.getElementById('bookingCategory'));
                    document.getElementById('modalDeleteButton').style.display = 'none';
                    const dupBtn = document.getElementById('modalDuplicateButton');
                    if (dupBtn) dupBtn.style.display = 'none';
                    document.getElementById('bookingModal').style.display = 'flex';
                }
            });
        }
        // ── Drag & drop target (admin only, desktop) ──
        if (!urlParams.readonly && !urlParams.embedded) {
            column.addEventListener('dragover', (e) => {
                if (getDragBookingIndex() === null) return;
                e.preventDefault();
                setDragCopy(e.shiftKey || e.ctrlKey);
                e.dataTransfer.dropEffect = isDragCopy() ? 'copy' : 'move';
                updateDragGhost(isDragCopy(), getDragBookingIndex());
                column.classList.add('drag-over');
            });
            column.addEventListener('dragleave', () => {
                column.classList.remove('drag-over');
            });
            column.addEventListener('drop', async (e) => {
                e.preventDefault();
                column.classList.remove('drag-over');
                setDragCopy(e.shiftKey || e.ctrlKey);
                const bookingIndex = getDragBookingIndex();
                if (bookingIndex === null || bookingIndex < 0) return;

                const targetDay = parseInt(column.dataset.day);
                const sourceBooking = getBookings()[bookingIndex];
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

                const bookings = getBookings();
                if (isDragCopy()) {
                    // Shift/Ctrl+Drag: duplicate to target day + time
                    const copy = JSON.parse(JSON.stringify(sourceBooking));
                    copy.id = generateBookingId();
                    copy.day = targetDay;
                    copy.startTime = newStartTime;
                    copy.endTime = newEndTime;
                    bookings.push(copy);
                } else {
                    // Normal drag: move to target day + time
                    sourceBooking.day = targetDay;
                    sourceBooking.startTime = newStartTime;
                    sourceBooking.endTime = newEndTime;
                }

                await saveToServer('bookings.json', bookings);
                createDayColumns();
            });
        }

        container.appendChild(column);
    });
    renderBookings();
}

// ── Mobile Tiles ─────────────────────────────────────

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
    if (isLoggedIn()) {
        const ablageTile = document.createElement('div');
        ablageTile.className = 'day-tile ablage-tile';
        ablageTile.id = 'ablage-tile';
        ablageTile.dataset.day = '0';
        ablageTile.innerHTML = '<div class="day-name filing-tile">Ablage</div><div class="day-bookings"></div>';
        container.appendChild(ablageTile);
    }
}

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
    const ablageOption = document.createElement('option');
    ablageOption.value = 0;
    ablageOption.textContent = 'Ablage';
    select.appendChild(ablageOption);
}

function buildHiddenDaysCheckboxes() {
    const container = document.getElementById('hiddenDaysCheckboxes');
    if (!container) return;
    container.innerHTML = '';
    const hiddenDays = getHiddenDays();
    for (let i = 1; i <= 7; i++) {
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

// ── Booking Element ──────────────────────────────────

function createBookingElement(booking, index, isMobile) {
    const el = document.createElement('div');
    el.className = isMobile ? 'mobile-booking' : 'booking';
    el.dataset.index = index;
    el.dataset.bookingIndex = index;
    const bgColor = sanitizeColor(rgbToHex(booking.color) || booking.color || 'var(--secondary)');
    el.style.backgroundColor = bgColor;
    if (isLightColor(bgColor)) el.classList.add('light-bg');
    else el.classList.add('dark-bg');
    const titleClass = isMobile ? 'mobile-booking-title' : 'booking-title';
    const timeClass = isMobile ? 'mobile-booking-time' : 'booking-time';
    const actionsClass = isMobile ? 'mobile-booking-actions' : 'booking-actions';
    let html = `<div class="${titleClass}">${escapeHtml(booking.title)}</div>
        <div class="${timeClass}">${escapeHtml(booking.startTime)} - ${escapeHtml(booking.endTime)}</div>`;
    if (isLoggedIn() && !getUrlParams().readonly) {
        html += `<div class="${actionsClass}">
            <button class="action-button edit-button" data-action="edit" data-index="${index}">Bearbeiten</button>
            <button class="action-button delete-button" data-action="delete" data-index="${index}">Löschen</button>
        </div>`;
    }
    if (!isMobile && isLoggedIn() && !getUrlParams().readonly && !getUrlParams().embedded) {
        html += '<div class="resize-handle"></div>';
    }
    el.innerHTML = html;

    // ── Desktop Drag & Drop (admin only) ──
    if (!isMobile && isLoggedIn() && !getUrlParams().readonly && !getUrlParams().embedded) {
        el.setAttribute('draggable', 'true');
        el.addEventListener('dragstart', (e) => {
            if (state.resizing) { e.preventDefault(); return; }
            setDragBookingIndex(index);
            setDragCopy(e.shiftKey || e.ctrlKey);
            el.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'all';
            e.dataTransfer.setData('text/plain', String(index));
        });
        el.addEventListener('dragend', () => {
            el.classList.remove('dragging');
            setDragBookingIndex(null);
            setDragCopy(false);
            if (state.dragGhost) {
                state.dragGhost.remove();
                state.dragGhost = null;
            }
            document.querySelectorAll('.day-column').forEach(c => c.classList.remove('drag-over'));
        });

        // ── Resize handle ──
        const resizeHandle = el.querySelector('.resize-handle');
        if (resizeHandle) {
            resizeHandle.addEventListener('mousedown', (e) => {
                e.preventDefault();
                e.stopPropagation();
                el.setAttribute('draggable', 'false');
                setResizing(true);

                const column = el.parentElement;
                const startHourVal = getStartHour();
                const endHourVal = getEndHour();
                const colRect = column.getBoundingClientRect();
                el.classList.add('resizing');

                const onMouseMove = (moveE) => {
                    const relY = moveE.clientY - colRect.top;
                    const snappedMinutes = snapTo15(relY);
                    const bookingStartMin = timeToMinutes(booking.startTime) - startHourVal * 60;
                    const minHeight = 15;
                    const maxMinutes = (endHourVal - startHourVal) * 60;
                    const newHeight = Math.max(minHeight, Math.min(snappedMinutes - bookingStartMin, maxMinutes - bookingStartMin));
                    el.style.height = `${newHeight}px`;
                };

                const onMouseUp = async () => {
                    document.removeEventListener('mousemove', onMouseMove);
                    document.removeEventListener('mouseup', onMouseUp);
                    el.classList.remove('resizing');
                    setResizing(false);
                    setJustResized(true);
                    setTimeout(() => { setJustResized(false); }, 200);
                    el.setAttribute('draggable', 'true');

                    const newHeight = parseInt(el.style.height);
                    const bookingTopPx = parseInt(el.style.top);
                    const endHourVal = getEndHour();
                    const startHourVal = getStartHour();
                    const endTotalMin = startHourVal * 60 + bookingTopPx + newHeight;
                    const endH = Math.min(Math.floor(endTotalMin / 60), endHourVal);
                    const endM = endTotalMin % 60;

                    booking.endTime = formatTime(endH, endM);
                    await saveToServer('bookings.json', getBookings());
                    createDayColumns();
                };

                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            });
        }
    }

    el.addEventListener('click', (e) => {
        const action = e.target.dataset.action;
        const targetIndex = e.target.dataset.index;

        if (action === 'edit') {
            editBooking(parseInt(targetIndex));
        } else if (action === 'delete') {
            deleteBooking(parseInt(targetIndex));
        } else if (!isLoggedIn() && !getUrlParams().readonly) {
            showBookingDetails(booking);
        } else if (isLoggedIn()) {
            // Multi-select with Ctrl/Cmd key
            if (e.ctrlKey || e.metaKey) {
                e.stopPropagation();
                const sel = getSelectedBookingIndices();
                const allBookings = document.querySelectorAll(isMobile ? '.mobile-booking' : '.booking');

                // Toggle the clicked booking first
                const wasSelected = sel.has(index);
                if (wasSelected) {
                    sel.delete(index);
                    el.classList.remove('selected');
                } else {
                    sel.add(index);
                    el.classList.add('selected');
                }

                // Collect any OTHER expanded bookings into the selection
                allBookings.forEach(b => {
                    if (b === el) return; // already handled above
                    if (b.classList.contains('expanded')) {
                        const bIndex = parseInt(b.dataset.bookingIndex);
                        if (!isNaN(bIndex) && !sel.has(bIndex)) {
                            sel.add(bIndex);
                            b.classList.add('selected');
                        }
                        b.classList.remove('expanded');
                    }
                });
                return;
            }

            // Normal click (no Ctrl): clear selection, toggle expand
            clearMultiSelection();
            document.querySelectorAll(isMobile ? '.mobile-booking.selected' : '.booking.selected')
                .forEach(b => b.classList.remove('selected'));

            const allBookings = document.querySelectorAll(isMobile ? '.mobile-booking' : '.booking');
            allBookings.forEach(b => {
                if (b !== el) b.classList.remove('expanded');
            });
            el.classList.toggle('expanded');
        }
    });

    // Right-click context menu (admin only)
    if (isLoggedIn() && !getUrlParams().readonly) {
        el.addEventListener('contextmenu', (e) => {
            showBookingContextMenu(e, index);
        });
    }
    return el;
}

// ── Render Bookings ──────────────────────────────────

function renderBookings() {
    const bookingColors = getBookingColors();
    const bookings = getBookings();
    bookings.forEach(booking => {
        if (!booking.categoryID) booking.categoryID = 'default';
        const colorConfig = bookingColors.find(c => c.id === booking.categoryID);
        booking.color = colorConfig ? colorConfig.color : 'var(--secondary)';
    });
    bookings.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
    let filtered = bookings;
    if (getUrlParams().category) {
        const catFilter = getUrlParams().category.toLowerCase();
        filtered = bookings.filter(b => {
            const cfg = bookingColors.find(c => c.id === b.categoryID);
            return cfg && cfg.name.toLowerCase() === catFilter;
        });
    }
    renderMobileBookings(filtered);
    renderDesktopBookings(filtered);
    renderSidebarBookings(filtered);
}

function renderMobileBookings(bookings) {
    const mobileColumns = document.querySelectorAll('.day-tile');
    mobileColumns.forEach(col => col.querySelectorAll('.mobile-booking').forEach(b => b.remove()));
    const dayInfo = getDaysToShow();
    const tileMap = {};
    mobileColumns.forEach(col => {
        const dayNum = parseInt(col.dataset.day);
        if (!isNaN(dayNum)) tileMap[dayNum] = col;
    });
    dayInfo.forEach(info => {
        const tile = tileMap[info.day];
        if (!tile) return;
        if (info.hidden && !isLoggedIn()) tile.style.display = 'none';
        else { tile.style.display = 'block'; tile.classList.toggle('day-tile-hidden', info.hidden && isLoggedIn()); }
    });
    bookings.forEach((booking, index) => {
        if (booking.day === 0 && isLoggedIn()) {
            const ablageTile = tileMap[0];
            if (ablageTile) ablageTile.appendChild(createBookingElement(booking, index, true));
            return;
        }
        const tile = tileMap[booking.day];
        if (tile && tile.style.display !== 'none') {
            tile.appendChild(createBookingElement(booking, index, true));
        }
    });
}

function renderDesktopBookings(bookings) {
    const columns = document.querySelectorAll('.day-column');
    columns.forEach(col => col.querySelectorAll('.booking').forEach(b => b.remove()));
    const startHour = getStartHour();
    const endHour = getEndHour();
    let yMapper = null;
    const useCollapse = shouldCollapseEmpty();
    if (useCollapse) {
        const emptyHours = analyzeEmptyHours(bookings, startHour, endHour);
        yMapper = buildYMapper(emptyHours, startHour);
    }
    const dayColumns = {};
    columns.forEach(col => { dayColumns[parseInt(col.dataset.day)] = col; });
    const overlapInfoByDay = {};
    Object.keys(dayColumns).forEach(key => {
        overlapInfoByDay[parseInt(key)] = detectOverlaps(bookings, parseInt(key));
    });
    bookings.forEach((booking, index) => {
        if (booking.day === 0) return;
        const column = dayColumns[booking.day];
        if (!column) return;
        const bookingEl = createBookingElement(booking, index, false);
        const [startH, startM] = booking.startTime.split(':').map(Number);
        const [endH, endM] = booking.endTime.split(':').map(Number);
        let top, height;
        if (useCollapse && yMapper) {
            top = yMapper.mapMinuteToPixel((startH - startHour) * 60 + startM);
            height = yMapper.mapMinuteToPixel((endH - startHour) * 60 + endM) - top;
        } else {
            top = (startH - startHour) * 60 + startM;
            height = (endH - startH) * 60 + (endM - startM);
        }
        bookingEl.style.top = `${top}px`;
        bookingEl.style.height = `${height}px`;
        const overlapInfo = overlapInfoByDay[booking.day];
        if (overlapInfo && overlapInfo[index] && overlapInfo[index].count > 1) {
            bookingEl.dataset.overlapCount = overlapInfo[index].count;
            bookingEl.dataset.overlapIndex = overlapInfo[index].index;
        }
        column.appendChild(bookingEl);
    });
}

function renderSidebarBookings(bookings) {
    const sidebar = document.getElementById('Ablage');
    if (!sidebar) return;
    sidebar.querySelectorAll('.mobile-booking').forEach(b => b.remove());
    const urlParams = getUrlParams();
    bookings.filter(b => b.day === 0).forEach((booking, idx) => {
        const originalIndex = getBookings().indexOf(booking);
        const bookingEl = createBookingElement(booking, originalIndex, true);

        // Make sidebar bookings draggable (admin only, desktop)
        if (isLoggedIn() && !urlParams.readonly && !urlParams.embedded) {
            bookingEl.setAttribute('draggable', 'true');
            bookingEl.addEventListener('dragstart', (e) => {
                if (state.resizing) { e.preventDefault(); return; }
                setDragBookingIndex(originalIndex);
                setDragCopy(e.shiftKey || e.ctrlKey);
                bookingEl.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'all';
                e.dataTransfer.setData('text/plain', String(originalIndex));
            });
            bookingEl.addEventListener('dragend', () => {
                bookingEl.classList.remove('dragging');
                setDragBookingIndex(null);
                setDragCopy(false);
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

// ── Booking Details ──────────────────────────────────

function showBookingDetails(booking) {
    const modal = document.getElementById('viewBookingModal');
    if (!modal) return;
    document.querySelector('.view-booking-header').style.backgroundColor = sanitizeColor(booking.color);
    document.getElementById('viewBookingTitle').textContent = booking.title;
    document.getElementById('viewBookingTime').textContent = `${booking.startTime} - ${booking.endTime}`;
    document.getElementById('viewBookingLocation').textContent = booking.location || '';
    const trainersDiv = document.getElementById('viewBookingTrainers');
    if (booking.trainer) {
        trainersDiv.innerHTML = booking.trainer.split('\n').filter(t => t.trim())
            .map(t => `<span class="trainer-tag">${escapeHtml(t)}</span>`).join('');
    } else trainersDiv.innerHTML = '';
    document.getElementById('viewBookingContact').innerHTML = booking.contact ? `Kontakt: ${escapeHtml(booking.contact)}` : '';
    const descDiv = document.getElementById('viewBookingDescription');
    descDiv.innerHTML = booking.description ? escapeHtml(booking.description).replace(/\n/g, '<br>') : '';
    descDiv.style.display = booking.description ? 'block' : 'none';
    const linkDiv = document.getElementById('viewBookingLink');
    if (booking.link) {
        linkDiv.innerHTML = `<a href="${escapeHtml(booking.link)}" target="_blank" rel="noopener noreferrer" class="link-button"><span class="icon link"></span></a>`;
        linkDiv.style.display = 'block';
    } else { linkDiv.innerHTML = ''; linkDiv.style.display = 'none'; }
    modal.style.display = 'flex';
}

function closeViewBookingModal() {
    document.getElementById('viewBookingModal').style.display = 'none';
}

// ── Booking CRUD ─────────────────────────────────────

function editBooking(index) {
    const booking = getBookings()[index];
    if (!booking) return;
    buildCategoryOptions(document.getElementById('bookingCategory'));
    buildDaySelect();
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
    const dupBtn = document.getElementById('modalDuplicateButton');
    if (dupBtn) { dupBtn.style.display = 'inline'; dupBtn.onclick = () => duplicateBooking(index); }
    setSelectedBookingIndex(index);
    document.getElementById('bookingModal').style.display = 'flex';
}

async function deleteBooking(index) {
    if (confirm('Möchten Sie diesen Termin wirklich löschen?')) {
        const bookings = getBookings();
        bookings.splice(index, 1);
        await saveToServer('bookings.json', bookings);
        createDayColumns();
        closeBookingModal();
    }
}

async function deleteSelectedBookings() {
    const indices = Array.from(getSelectedBookingIndices()).sort((a, b) => b - a);
    if (indices.length === 0) return;
    if (!confirm(`${indices.length} Termin${indices.length > 1 ? 'e' : ''} wirklich löschen?`)) return;
    const bookings = getBookings();
    indices.forEach(i => bookings.splice(i, 1));
    clearMultiSelection();
    await saveToServer('bookings.json', bookings);
    buildMobileTiles();
    createDayColumns();
}

async function duplicateBooking(index) {
    const source = getBookings()[index];
    if (!source) return;
    const copy = JSON.parse(JSON.stringify(source));
    copy.id = generateBookingId();
    const bookings = getBookings();
    bookings.push(copy);
    await saveToServer('bookings.json', bookings);
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
    setSelectedBookingIndex(null);
}

// ── Auth ─────────────────────────────────────────────

function login() {
    const passwordInput = document.getElementById('password');
    if (authLogin(passwordInput.value)) {
        document.getElementById('editButton').innerHTML = '<span class="icon settings"></span>';
        document.getElementById('newBookingButton').style.display = 'flex';
        document.getElementById('printButton').style.display = 'flex';
        document.getElementById('icsButton').style.display = 'flex';
        document.getElementById('helpButton').style.display = 'flex';
        closeLoginModal();
        buildMobileTiles();
        createDayColumns();
        renderBookings();
        toggleSidebar(true);
    } else {
        alert('Falsches Passwort!');
    }
}

function logout() {
    if (confirm('Möchten Sie sich wirklich abmelden?')) {
        authLogout();
        document.getElementById('editButton').innerHTML = '<span class="icon edit"></span>';
        document.getElementById('newBookingButton').style.display = 'none';
        document.getElementById('printButton').style.display = 'none';
        document.getElementById('icsButton').style.display = 'none';
        document.getElementById('helpButton').style.display = 'none';
        document.getElementById('printPopup')?.classList.remove('visible');
        closeOptionsModal();
        if (isSidebarOpen()) toggleSidebar(true);
        buildMobileTiles();
        createDayColumns();
        renderBookings();
    }
}

function closeLoginModal() {
    document.getElementById('loginModal').style.display = 'none';
    document.getElementById('password').value = '';
}

// ── Settings Modal ───────────────────────────────────

function showOptionsModal() {
    const modal = document.getElementById('optionsModal');
    if (!modal) return;
    modal.style.display = 'flex';
    document.getElementById('calendarTitle').value = document.querySelector('.calendar-header h2').textContent;
    const modeSelect = document.getElementById('calendarModeSelect');
    if (modeSelect) modeSelect.value = getMode();
    updateModeUI();
    document.getElementById('eventStartDate').value = getEventStartDate() || '';
    document.getElementById('eventDayCount').value = getEventDayCount();
    updateEventPreview();
    populateTimeOptions();
    document.getElementById('startHour').value = getStartHour();
    document.getElementById('endHour').value = getEndHour();
    buildHiddenDaysCheckboxes();
    document.getElementById('hideEmptyDays').checked = getHideEmptyDays();
    document.getElementById('collapseEmptyHours').checked = getCollapseEmptyHours();
    renderColorOptions(document.getElementById('bookingColors'));
    // Populate header/secondary color swatches from current CSS values
    const headerSwatch = document.querySelector('.header-color-edit .color-swatch');
    const secondarySwatch = document.querySelector('.secondary-color-edit .color-swatch');
    if (headerSwatch) {
        headerSwatch.style.backgroundColor = getComputedStyle(document.documentElement).getPropertyValue('--header-color').trim();
    }
    if (secondarySwatch) {
        secondarySwatch.style.backgroundColor = getComputedStyle(document.documentElement).getPropertyValue('--secondary').trim();
    }
    const icsPublicCb = document.getElementById('icsPublicCheckbox');
    if (icsPublicCb) icsPublicCb.checked = !!state.icsPublic;
    const icsDayFilterCb = document.getElementById('icsDayFilterCheckbox');
    if (icsDayFilterCb) icsDayFilterCb.checked = !!state.icsDayFilter;
    const icsAboCb = document.getElementById('icsAboCheckbox');
    if (icsAboCb) icsAboCb.checked = !!state.icsAboEnabled;
    updateIcsTokenDisplay();
}

function updateModeUI() {
    const mode = document.getElementById('calendarModeSelect')?.value || 'week';
    document.getElementById('weekModeSection').style.display = mode === 'week' ? '' : 'none';
    document.getElementById('eventModeSection').style.display = mode === 'event' ? '' : 'none';
}

function updateEventPreview() {
    const preview = document.getElementById('eventDayPreview');
    if (!preview) return;
    const startDate = document.getElementById('eventStartDate')?.value;
    const dayCount = parseInt(document.getElementById('eventDayCount')?.value) || 3;
    if (!startDate) { preview.textContent = ''; return; }
    const labels = [];
    for (let i = 0; i < Math.min(dayCount, 14); i++) {
        const d = new Date(startDate + 'T00:00:00');
        d.setDate(d.getDate() + i);
        labels.push(`${d.toLocaleDateString('de-DE', { weekday: 'short' })} ${d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}`);
    }
    preview.textContent = '→ ' + labels.join(' │ ');
}

async function saveSettings() {
    document.querySelector('.calendar-header h2').textContent = document.getElementById('calendarTitle').value;
    const newMode = document.getElementById('calendarModeSelect')?.value || 'week';
    const eventStartDate = document.getElementById('eventStartDate')?.value || null;
    const eventDayCount = parseInt(document.getElementById('eventDayCount')?.value) || 3;
    if (newMode === 'event' && !eventStartDate) { alert('Bitte ein Startdatum für den Eventmodus angeben.'); return; }
    if (newMode !== getMode() && getBookings().length > 0) {
        if (newMode === 'event' && !confirm('Modus wird zu "Event" gewechselt.')) return;
        if (newMode === 'week' && getBookings().some(b => b.day > 7) && !confirm('Modus wird zu "Woche" gewechselt.')) return;
    }
    setMode(newMode);
    setEventStartDate(eventStartDate);
    setEventDayCount(Math.max(1, Math.min(99, eventDayCount)));
    const headerColor = rgbToHex(document.querySelector('.header-color-edit .color-swatch').style.backgroundColor);
    const secondaryColor = rgbToHex(document.querySelector('.secondary-color-edit .color-swatch').style.backgroundColor);
    document.documentElement.style.setProperty('--header-color', headerColor);
    document.documentElement.style.setProperty('--secondary', secondaryColor);
    setHeaderColor(headerColor);
    setSecondaryColor(secondaryColor);
    setStartHour(document.getElementById('startHour').value);
    setEndHour(document.getElementById('endHour').value);
    const oldPwdInput = document.getElementById('oldpwd');
    const newPwdInput = document.getElementById('newpwd');
    let newLoginhash = getLoginHash();
    if (oldPwdInput.value) {
        if (getLoginHash() !== stringToHash(oldPwdInput.value)) { alert('Das alte Passwort ist falsch'); return; }
        if (!newPwdInput.value) { alert('Das neue Passwort darf nicht leer sein'); return; }
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
        newLoginhash = stringToHash(newPwdInput.value);
    }
    const hiddenDays = [];
    if (newMode === 'week') {
        document.querySelectorAll('#hiddenDaysCheckboxes input[type="checkbox"]').forEach(cb => {
            if (!cb.checked) hiddenDays.push(parseInt(cb.value));
        });
    }
    setHiddenDays(hiddenDays);
    setHideEmptyDays(document.getElementById('hideEmptyDays').checked);
    setCollapseEmptyHours(document.getElementById('collapseEmptyHours').checked);
    const bookingColors = Array.from(document.querySelectorAll('#bookingColors .color-edit')).map(el => ({
        name: el.querySelector('input').value,
        color: el.querySelector('.color-swatch').style.backgroundColor,
        id: el.id
    }));
    setBookingColors(bookingColors);
    setLoginHash(newLoginhash);
    const icsAboEnabled = document.getElementById('icsAboCheckbox')?.checked || false;
    const configData = {
        title: document.querySelector('.calendar-header h2').textContent,
        headerColor, secondaryColor,
        startHour: document.getElementById('startHour').value,
        endHour: document.getElementById('endHour').value,
        bookingColors, hiddenDays,
        hideEmptyDays: getHideEmptyDays(),
        collapseEmptyHours: getCollapseEmptyHours(),
        loginhash: newLoginhash,
        mode: newMode, eventStartDate, eventDayCount,
        icsTokens: getIcsTokens(),
        icsPublic: document.getElementById('icsPublicCheckbox')?.checked || false,
        icsDayFilter: document.getElementById('icsDayFilterCheckbox')?.checked || false,
        icsAboEnabled
    };
    state.icsPublic = configData.icsPublic;
    state.icsDayFilter = configData.icsDayFilter;
    state.icsAboEnabled = icsAboEnabled;
    await saveToServer('settings.json', configData);
    await saveToServer('bookings.json', getBookings());
    oldPwdInput.value = ''; newPwdInput.value = '';
    createTimeOptions(); buildMobileTiles(); createDayColumns(); closeOptionsModal();
}

function closeOptionsModal() {
    document.getElementById('optionsModal').style.display = 'none';
}

// ── ICS Modal ────────────────────────────────────────

function updateIcsTokenDisplay() {
    const display = document.getElementById('icsTokenDisplay');
    const hint = document.getElementById('icsTokenHint');
    if (!display || !hint) return;
    const tokens = getIcsTokens();
    if (!Array.isArray(tokens) || tokens.length === 0) {
        display.textContent = 'Kein Token vorhanden';
        hint.textContent = 'Ein Token wird für Kalender-Abonnements benötigt.';
    } else {
        const active = tokens[tokens.length - 1];
        const created = new Date(active.created);
        display.textContent = `Aktiver Token: ${active.token}`;
        hint.textContent = `Generiert am ${created.toLocaleDateString('de-DE')}`;
    }
}

async function generateIcsToken() {
    if (!confirm('Neuen Token generieren?')) return;
    const token = generateToken();
    const tokens = getIcsTokens();
    tokens.push({ token, created: new Date().toISOString() });
    const configData = buildFullConfigData();
    await saveToServer('settings.json', configData);
    updateIcsTokenDisplay();
}

function showIcsModal() {
    const modal = document.getElementById('icsModal');
    if (!modal) return;
    const catContainer = document.getElementById('icsCategoryChips');
    catContainer.innerHTML = '';
    const bookingColors = ensureDefaultCategory();
    bookingColors.forEach(c => {
        const chip = document.createElement('label');
        chip.className = 'ics-chip';
        const cb = document.createElement('input');
        cb.type = 'checkbox'; cb.value = c.id; cb.dataset.name = c.name; cb.checked = true;
        cb.addEventListener('change', updateIcsModal);
        chip.appendChild(cb);
        chip.appendChild(document.createTextNode(c.name));
        catContainer.appendChild(chip);
    });
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
            cb.type = 'checkbox'; cb.value = i; cb.checked = true;
            cb.addEventListener('change', updateIcsModal);
            chip.appendChild(cb);
            chip.appendChild(document.createTextNode(getDayLabel(i)));
            dayContainer.appendChild(chip);
        }
    } else { if (daySection) daySection.style.display = 'none'; }
    updateIcsModal();
    modal.style.display = 'flex';
}

function updateIcsModal() {
    const catChecks = document.querySelectorAll('#icsCategoryChips input[type="checkbox"]');
    const dayChecks = document.querySelectorAll('#icsDayChips input[type="checkbox"]');
    const count = countFilteredIcsBookings(getBookings(), catChecks, state.icsDayFilter ? dayChecks : null);
    document.getElementById('icsCounter').textContent = `${count} Termin${count !== 1 ? 'e' : ''} ausgewählt`;
    const { downloadUrl, aboUrl } = buildIcsUrls(catChecks, state.icsDayFilter ? dayChecks : null);
    document.getElementById('icsDownloadUrl').value = downloadUrl;
    document.getElementById('icsAboUrl').value = aboUrl;
    const aboSection = document.getElementById('icsAboSection');
    if (aboSection) aboSection.style.display = (state.icsAboEnabled && getIcsTokens().length > 0) ? '' : 'none';
}

function closeIcsModal() { document.getElementById('icsModal').style.display = 'none'; }
function showHelpModal() { document.getElementById('helpModal').style.display = 'flex'; }
function closeHelpModal() { document.getElementById('helpModal').style.display = 'none'; }

// ── Context Menu ──────────────────────────────────────

function closeContextMenu() {
    document.querySelectorAll('.context-menu').forEach(m => m.remove());
}

function showBookingContextMenu(e, bookingIndex) {
    e.preventDefault();
    e.stopPropagation();
    closeContextMenu();

    const isMulti = getSelectedBookingIndices().size > 1 && getSelectedBookingIndices().has(bookingIndex);
    const menu = document.createElement('div');
    menu.className = 'context-menu';

    if (!isMulti) {
        // ── Single booking menu ──
        const editItem = createCtxItem('✎', 'Bearbeiten', () => { closeContextMenu(); editBooking(bookingIndex); });
        menu.appendChild(editItem);

        const dupItem = createCtxItem('⧉', 'Duplizieren', () => { closeContextMenu(); duplicateBookingDirect(bookingIndex); });
        menu.appendChild(dupItem);

        menu.appendChild(createCtxDivider());
        menu.appendChild(createCategorySubmenu([bookingIndex]));
        menu.appendChild(createCtxDivider());

        const delItem = createCtxItem('🗑', 'Löschen', () => { closeContextMenu(); deleteBooking(bookingIndex); }, true);
        menu.appendChild(delItem);
    } else {
        // ── Multi-selection menu ──
        const count = getSelectedBookingIndices().size;
        const indices = Array.from(getSelectedBookingIndices());

        const header = document.createElement('div');
        header.className = 'context-menu-item disabled';
        header.innerHTML = `<span class="ctx-icon">☰</span><span class="ctx-label">${count} Termine ausgewählt</span>`;
        menu.appendChild(header);
        menu.appendChild(createCtxDivider());
        menu.appendChild(createCategorySubmenu(indices));
        menu.appendChild(createCtxDivider());

        const delItem = createCtxItem('🗑', `${count} Termine löschen`, () => { closeContextMenu(); deleteSelectedBookings(); }, true);
        menu.appendChild(delItem);
    }

    document.body.appendChild(menu);
    positionContextMenu(menu, e.clientX, e.clientY);

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

function createCtxItem(icon, label, onclick, isDanger) {
    const item = document.createElement('div');
    item.className = 'context-menu-item' + (isDanger ? ' danger' : '');
    item.innerHTML = `<span class="ctx-icon">${icon}</span><span class="ctx-label">${escapeHtml(label)}</span>`;
    item.addEventListener('click', onclick);
    return item;
}

function createCtxDivider() {
    const div = document.createElement('div');
    div.className = 'context-menu-divider';
    return div;
}

function createCategorySubmenu(bookingIndices) {
    const item = document.createElement('div');
    item.className = 'context-menu-item';
    item.innerHTML = '<span class="ctx-icon">●</span><span class="ctx-label">Kategorie</span><span class="ctx-arrow">▸</span>';

    const submenu = document.createElement('div');
    submenu.className = 'context-submenu';

    const categories = ensureDefaultCategory();
    let currentCatId = null;
    if (bookingIndices.length === 1) {
        const b = getBookings()[bookingIndices[0]];
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

async function applyCategoryToBookings(indices, categoryId) {
    const bookingColors = getBookingColors();
    const colorConfig = bookingColors.find(c => c.id === categoryId);
    const color = colorConfig ? colorConfig.color : 'var(--secondary)';

    indices.forEach(i => {
        const booking = getBookings()[i];
        if (booking) {
            booking.categoryID = categoryId;
            booking.color = color;
            if (colorConfig) booking.categoryName = colorConfig.name;
        }
    });

    await saveToServer('bookings.json', getBookings());
    clearMultiSelection();
    createDayColumns();
}

async function duplicateBookingDirect(index) {
    const source = getBookings()[index];
    if (!source) return;

    const copy = JSON.parse(JSON.stringify(source));
    copy.id = generateBookingId();
    const bookings = getBookings();
    bookings.push(copy);

    await saveToServer('bookings.json', bookings);
    buildMobileTiles();
    createDayColumns();
}

function positionContextMenu(menu, x, y) {
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;

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

// ── Initialize ────────────────────────────────────────

async function initialize() {
    showLoading();
    parseUrlParams();
    try {
        const [config, bookings] = await Promise.all([
            loadFromServer('settings.json'),
            loadFromServer('bookings.json')
        ]);
        if (config) {
            document.querySelector('.calendar-header h2').textContent = config.title || 'Wochenplan';
            const headerColor = config.headerColor || '#2196F3';
            const secondaryColor = config.secondaryColor || '#FFC107';
            document.documentElement.style.setProperty('--header-color', headerColor);
            document.documentElement.style.setProperty('--secondary', secondaryColor);
            setHeaderColor(headerColor);
            setSecondaryColor(secondaryColor);
            setStartHour(config.startHour || CONFIG.DEFAULT_START_HOUR);
            setEndHour(config.endHour || CONFIG.DEFAULT_END_HOUR);
            setBookingColors(config.bookingColors || []);
            setLoginHash(config.loginhash || CONFIG.DEFAULT_HASH);
            setMode(config.mode || 'week');
            setEventStartDate(config.eventStartDate || null);
            setEventDayCount(config.eventDayCount || 3);
            setIcsTokens(Array.isArray(config.icsTokens) ? config.icsTokens : []);
            state.icsPublic = !!config.icsPublic;
            state.icsDayFilter = !!config.icsDayFilter;
            state.icsAboEnabled = !!config.icsAboEnabled;
            const rawHidden = config.hiddenDays || [];
            setHiddenDays(migrateHiddenDays(rawHidden));
            setHideEmptyDays(config.hideEmptyDays || false);
            setCollapseEmptyHours(config.collapseEmptyHours || false);
        } else { initializeDefaults(); }
        if (bookings && Array.isArray(bookings)) {
            let migrated = false;
            const migratedBookings = bookings.map(b => {
                if (typeof b.day === 'string') { const nd = migrateDay(b.day); if (nd !== null) { b.day = nd; migrated = true; } }
                if (ensureBookingId(b)) migrated = true;
                return b;
            });
            setBookings(migratedBookings);
            if (migrated) { try { await saveToServer('bookings.json', migratedBookings); } catch (e) {} }
        }
    } catch (err) { console.error('Error loading data:', err); initializeDefaults(); } finally { hideLoading(); }
    createTimeOptions(); buildMobileTiles(); createDayColumns();
    const urlParams = getUrlParams();
    if (!urlParams.embedded && !urlParams.readonly) document.getElementById('editButton').style.display = 'flex';
    if (state.icsPublic && !urlParams.readonly && !urlParams.embedded) document.getElementById('icsButton').style.display = 'flex';
    if (urlParams.view === 'ics' && urlParams.embedded) {
        document.getElementById('main').style.display = 'none';
        document.getElementById('sidebar')?.style.setProperty('display', 'none', 'important');
        showIcsModal();
    }
}

// ── Direct init (module scripts run after DOM is ready) ──

initialize();

// ── Event Listeners ───────────────────────────────────

document.getElementById('editButton')?.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!isLoggedIn()) { document.getElementById('loginModal').style.display = 'flex'; document.getElementById('password').focus(); }
        else showOptionsModal();
    });
    document.getElementById('printButton')?.addEventListener('click', () => togglePrintPopup());
    document.getElementById('icsButton')?.addEventListener('click', () => showIcsModal());
    document.getElementById('helpButton')?.addEventListener('click', () => showHelpModal());
    document.getElementById('newBookingButton')?.addEventListener('click', () => {
        if (isLoggedIn()) {
            setSelectedBookingIndex(null);
            document.getElementById('bookingForm').reset();
            buildDaySelect();
            document.getElementById('bookingDay').value = 1;
            document.getElementById('bookingStart').value = '08:00';
            document.getElementById('bookingEnd').value = '09:00';
            buildCategoryOptions(document.getElementById('bookingCategory'));
            document.getElementById('modalDeleteButton').style.display = 'none';
            const dupBtn = document.getElementById('modalDuplicateButton');
            if (dupBtn) dupBtn.style.display = 'none';
            document.getElementById('bookingModal').style.display = 'flex';
        }
    });
    document.getElementById('bookingForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const categoryID = document.getElementById('bookingCategory').value;
        const bookingColors = getBookingColors();
        const selectedCat = bookingColors.find(c => c.id === categoryID);
        const newBooking = {
            day: parseInt(document.getElementById('bookingDay').value),
            startTime: document.getElementById('bookingStart').value,
            endTime: document.getElementById('bookingEnd').value,
            location: document.getElementById('bookingLocation').value.trim(),
            title: document.getElementById('bookingTitle').value.trim(),
            trainer: document.getElementById('bookingTrainer').value.trim(),
            contact: document.getElementById('bookingContact').value.trim(),
            link: document.getElementById('bookingLink').value.trim(),
            categoryID, categoryName: selectedCat?.name || '',
            description: document.getElementById('bookingDescription').value.trim(),
            color: selectedCat?.color || 'var(--secondary)'
        };
        if (timeToMinutes(newBooking.endTime) <= timeToMinutes(newBooking.startTime)) {
            alert('Die Endzeit muss nach der Startzeit liegen.'); return;
        }
        const bookings = getBookings();
        if (getSelectedBookingIndex() !== null) {
            newBooking.id = bookings[getSelectedBookingIndex()].id || generateBookingId();
            bookings[getSelectedBookingIndex()] = newBooking;
        } else {
            newBooking.id = generateBookingId();
            bookings.push(newBooking);
        }
        await saveToServer('bookings.json', bookings);
        createDayColumns(); closeBookingModal();
    });
    document.getElementById('bookingColors')?.addEventListener('click', (e) => {
        if (e.target.classList.contains('color-swatch')) {
            const cp = document.createElement('input'); cp.type = 'color';
            cp.value = rgbToHex(e.target.style.backgroundColor); cp.click();
            cp.addEventListener('change', () => { e.target.style.backgroundColor = cp.value; });
        } else if (e.target.classList.contains('color-delete')) { e.target.closest('.color-edit').remove(); }
    });
    document.querySelector('.header-color-edit .color-swatch')?.addEventListener('click', (e) => {
        const cp = document.createElement('input'); cp.type = 'color';
        cp.value = rgbToHex(e.target.style.backgroundColor); cp.click();
        cp.addEventListener('change', () => { e.target.style.backgroundColor = cp.value; });
    });
    document.querySelector('.secondary-color-edit .color-swatch')?.addEventListener('click', (e) => {
        const cp = document.createElement('input'); cp.type = 'color';
        cp.value = rgbToHex(e.target.style.backgroundColor); cp.click();
        cp.addEventListener('change', () => { e.target.style.backgroundColor = cp.value; });
    });
    document.getElementById('importFile')?.addEventListener('change', (e) => {
        importBookings(e.target.files[0], () => { buildMobileTiles(); createDayColumns(); });
    });
    document.getElementById('password')?.addEventListener('keypress', (e) => { if (e.key === 'Enter') login(); });
    // Mode select handled via onchange="updateModeUI()" in HTML
    document.getElementById('eventStartDate')?.addEventListener('change', updateEventPreview);
    document.getElementById('eventDayCount')?.addEventListener('input', updateEventPreview);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (document.querySelector('.context-menu')) { document.querySelectorAll('.context-menu').forEach(m => m.remove()); return; }
            if (document.getElementById('printPopup')?.classList.contains('visible')) {
                document.getElementById('printPopup').classList.remove('visible'); return;
            }
            if (getSelectedBookingIndices().size > 0) { clearMultiSelection(); return; }
            const modals = ['loginModal', 'bookingModal', 'viewBookingModal', 'helpModal', 'icsModal', 'optionsModal'];
            for (const id of modals) {
                const el = document.getElementById(id);
                if (el && el.style.display === 'flex') { el.style.display = 'none'; break; }
            }
        }
        if (e.key === 'Delete' && isLoggedIn() && !getUrlParams().readonly && !e.target.closest('input, textarea, select, .modal')) {
            if (getSelectedBookingIndices().size > 0) { e.preventDefault(); deleteSelectedBookings(); return; }
        }
    });
    document.addEventListener('click', (e) => {
        const popup = document.getElementById('printPopup');
        if (popup && popup.classList.contains('visible') && !popup.contains(e.target) && !document.getElementById('printButton')?.contains(e.target)) {
            popup.classList.remove('visible');
        }

        // Close view-only booking modal on outside click (no login)
        const viewModal = document.getElementById('viewBookingModal');
        if (viewModal && viewModal.style.display === 'flex' && !viewModal.querySelector('.view-booking')?.contains(e.target)) {
            closeViewBookingModal();
        }

        if (!e.target.closest('.booking') && !e.target.closest('.mobile-booking')) {
            document.querySelectorAll('.booking, .mobile-booking').forEach(b => b.classList.remove('expanded'));
            if (!e.ctrlKey && !e.metaKey) clearMultiSelection();
        }
    });
    // ── Sidebar (Ablage) drag & drop target ──
    const sidebarEl = document.getElementById('Ablage');
    const contentSidebarEl = document.getElementById('contentSidebar');

    const handleSidebarDragOver = (e) => {
        if (getDragBookingIndex() === null) return;
        e.preventDefault();
        setDragCopy(e.shiftKey || e.ctrlKey);
        e.dataTransfer.dropEffect = isDragCopy() ? 'copy' : 'move';
        updateDragGhost(isDragCopy(), getDragBookingIndex());
        if (sidebarEl) sidebarEl.classList.add('drag-over');
    };
    const handleSidebarDragLeave = (e) => {
        const related = e.relatedTarget;
        if (contentSidebarEl && contentSidebarEl.contains(related)) return;
        if (sidebarEl) sidebarEl.classList.remove('drag-over');
    };
    const handleSidebarDrop = async (e) => {
        e.preventDefault();
        if (sidebarEl) sidebarEl.classList.remove('drag-over');
        setDragCopy(e.shiftKey || e.ctrlKey);
        const bookingIndex = getDragBookingIndex();
        if (bookingIndex === null || bookingIndex < 0) return;

        const sourceBooking = getBookings()[bookingIndex];
        if (!sourceBooking || sourceBooking.day === 0) return;

        const bookings = getBookings();
        if (isDragCopy()) {
            const copy = JSON.parse(JSON.stringify(sourceBooking));
            copy.id = generateBookingId();
            copy.day = 0;
            bookings.push(copy);
        } else {
            sourceBooking.day = 0;
        }

        await saveToServer('bookings.json', bookings);
        createDayColumns();
    };

    [sidebarEl, contentSidebarEl].forEach(el => {
        if (!el) return;
        el.addEventListener('dragover', handleSidebarDragOver);
        el.addEventListener('dragleave', handleSidebarDragLeave);
        el.addEventListener('drop', handleSidebarDrop);
    });

    // ── ICS modal button listeners ──
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

    window.addEventListener('resize', () => { if (window.innerWidth < 826 && isSidebarOpen()) toggleSidebar(); });

// ── Settings Tab Switching ───────────────────────────

window.switchSettingsTab = function (tabName) {
    document.querySelectorAll('.settings-tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
        btn.setAttribute('aria-selected', btn.dataset.tab === tabName);
    });
    document.querySelectorAll('.settings-tab-panel').forEach(panel => {
        panel.classList.toggle('active', panel.id === 'settingsTab' + tabName.charAt(0).toUpperCase() + tabName.slice(1));
    });
};

// ── Expose to window for HTML onclick handlers ───────

Object.assign(window, {
    toggleSidebar, login, logout, closeLoginModal, closeBookingModal,
    closeViewBookingModal, closeIcsModal, closeHelpModal, closeOptionsModal,
    saveSettings, exportBookings, executePrint, togglePrintPopup,
    updateModeUI, updateEventPreview, duplicateBooking, generateIcsToken,
    showIcsModal, showHelpModal, updateIcsModal,
});
