/**
 * WeekWise – Pure Utility Functions
 * Extracted from app.js – no DOM or global state dependencies.
 */

// =====================================================
// Hashing
// =====================================================

/**
 * Convert string to hash (same algorithm as PHP).
 */
export function stringToHash(str) {
    let hash = 0;
    if (str.length === 0) return hash;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash | 0; // Convert to 32bit integer
    }
    return hash;
}

// =====================================================
// Color Utilities
// =====================================================

/**
 * Convert RGB string to Hex.
 */
export function rgbToHex(rgb) {
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
 * Check if a color is light or dark.
 */
export function isLightColor(color) {
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
 * Sanitize a CSS color value to prevent injection.
 */
export function sanitizeColor(color) {
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

// =====================================================
// Time Utilities
// =====================================================

/**
 * Format time string.
 */
export function formatTime(hour, minute) {
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}

/**
 * Parse time string to minutes.
 */
export function timeToMinutes(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
}

// =====================================================
// HTML / XSS
// =====================================================

/**
 * Sanitize HTML to prevent XSS.
 */
export function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// =====================================================
// ID Generation
// =====================================================

/**
 * Generate a unique booking ID (UUID v4 via crypto API, fallback to random).
 */
export function generateBookingId() {
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
export function ensureBookingId(booking) {
    if (!booking.id) {
        booking.id = generateBookingId();
        return true;
    }
    return false;
}

// =====================================================
// Math / Snap
// =====================================================

/**
 * Snap minutes to the nearest 15-minute grid.
 */
export function snapTo15(minutes) {
    return Math.round(minutes / 15) * 15;
}