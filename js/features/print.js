/**
 * WeekWise – Print Feature
 * Extracted from app.js – print popup and execution with temp style overrides.
 */

import { getState, getBookings, isLoggedIn } from '../core/state.js';
import {
    getStartHour, getEndHour, getBookingColors,
    getCollapseEmptyHours
} from '../core/persist.js';
import { analyzeEmptyHours, buildYMapper } from './empty-collapse.js';

/**
 * Toggle the print options popup visibility.
 */
export function togglePrintPopup() {
    const popup = document.getElementById('printPopup');
    if (!popup) return;

    const isVisible = popup.classList.contains('visible');
    if (isVisible) {
        popup.classList.remove('visible');
        return;
    }

    // Populate category dropdown
    const bookingColors = getBookingColors();
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

/**
 * Execute print with selected options (header, colors, category, orientation).
 */
export function executePrint() {
    const withHeader = document.getElementById('printWithHeader').checked;
    const withColors = document.getElementById('printWithColors').checked;
    const category = document.getElementById('printCategory').value;
    const orientation = document.getElementById('printOrientation')?.value || 'landscape';
    const state = getState();
    const bookings = getBookings();

    // Apply print classes
    if (!withHeader) document.body.classList.add('print-no-header');
    if (!withColors) document.body.classList.add('print-no-colors');
    document.body.classList.add('print-' + orientation);

    // Inject @page orientation
    const pageStyle = document.createElement('style');
    pageStyle.id = 'print-page-style';
    pageStyle.textContent = `@page { size: A4 ${orientation}; }`;
    document.head.appendChild(pageStyle);

    if (category) {
        document.querySelectorAll('.booking').forEach(el => {
            const idx = parseInt(el.dataset.index);
            const booking = bookings[idx];
            if (booking && booking.categoryID !== category) {
                el.classList.add('print-hidden');
            }
        });
    }

    // Recalculate grid (print should exclude hidden columns)
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

    // Apply empty hour collapse for print if active
    const startHour = getStartHour();
    const endHour = getEndHour();
    let printYMapper = null;
    const savedColumnStyles = [];
    const savedBookingStyles = [];

    const printCollapse = getCollapseEmptyHours() || state.urlParams.collapse;
    if (printCollapse) {
        const emptyHours = analyzeEmptyHours(bookings, startHour, endHour);
        printYMapper = buildYMapper(emptyHours, startHour);
        const collapsedTotal = printYMapper.getTotalHeight();

        document.querySelectorAll('.day-column').forEach(col => {
            savedColumnStyles.push({ column: col, height: col.style.height });
            col.style.height = `${collapsedTotal}px`;
        });

        document.querySelectorAll('.booking').forEach(el => {
            const idx = parseInt(el.dataset.index);
            const booking = bookings[idx];
            if (!booking || booking.day === 0) return;

            const [bStartH, bStartM] = booking.startTime.split(':').map(Number);
            const [bEndH, bEndM] = booking.endTime.split(':').map(Number);
            const startMinutes = (bStartH - startHour) * 60 + bStartM;
            const endMinutes = (bEndH - startHour) * 60 + bEndM;

            savedBookingStyles.push({ el, top: el.style.top, height: el.style.height });
            const topPx = printYMapper.mapMinuteToPixel(startMinutes);
            const bottomPx = printYMapper.mapMinuteToPixel(endMinutes);
            el.style.top = `${topPx}px`;
            el.style.height = `${bottomPx - topPx}px`;
        });

        // Reposition time markers
        const savedMarkerStyles = [];
        document.querySelectorAll('.time-marker').forEach(marker => {
            savedMarkerStyles.push({ marker, top: marker.style.top });
            const currentTop = parseInt(marker.style.top) || 0;
            const hour = Math.round(currentTop / 60) + startHour;
            if (hour <= endHour) {
                if (hour === endHour) {
                    marker.style.top = `${collapsedTotal}px`;
                } else {
                    marker.style.top = `${printYMapper.mapMinuteToPixel((hour - startHour) * 60)}px`;
                }
            }
        });
        savedColumnStyles.push({ _markers: savedMarkerStyles });
    }

    // Close popup before print
    document.getElementById('printPopup').classList.remove('visible');

    window.print();

    // Restore after print
    if (printYMapper) {
        savedColumnStyles.forEach(item => {
            if (item.column && item.height !== undefined) {
                item.column.style.height = item.height;
            }
            if (item._markers) {
                item._markers.forEach(m => { m.marker.style.top = m.top; });
            }
        });
        savedBookingStyles.forEach(item => {
            item.el.style.top = item.top;
            item.el.style.height = item.height;
        });
    }

    if (weekdaysContainer) weekdaysContainer.style.gridTemplateColumns = savedWeekdaysCols;
    if (dayColumnsContainer) dayColumnsContainer.style.gridTemplateColumns = savedDayColsCols;

    document.body.classList.remove('print-no-header', 'print-no-colors', 'print-landscape', 'print-portrait');
    const injectedStyle = document.getElementById('print-page-style');
    if (injectedStyle) injectedStyle.remove();
    document.querySelectorAll('.print-hidden').forEach(el => el.classList.remove('print-hidden'));
}