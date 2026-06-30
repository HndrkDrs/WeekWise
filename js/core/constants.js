/**
 * WeekWise – Application Constants
 * Extracted from app.js – no runtime dependencies.
 */

export const CONFIG = {
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
    ALLOWED_FILENAMES: ['settings.json', 'bookings.json'],
    COLLAPSED_HOUR_HEIGHT: 12,
    FULL_HOUR_HEIGHT: 60
};

/** Minimum display time in ms (1s default) */
export const LOADING_LOGO_MIN_MS = 2000;