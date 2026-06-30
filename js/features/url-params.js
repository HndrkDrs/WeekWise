/**
 * WeekWise – URL Parameter Handling (Embedded Mode)
 * Extracted from app.js – parses query string and applies body classes.
 */

import { setUrlParams, getState } from '../core/state.js';
import { parseDayList } from '../models/day-model.js';

/**
 * Parse URL parameters and update application state.
 * Supports: embedded, readonly, compact, category, day, hide, hideempty,
 * collapse, view.
 */
export function parseUrlParams() {
    const params = new URLSearchParams(window.location.search);

    // Parse day parameter: supports single or comma-separated, flexible formats
    const dayParam = params.get('day');
    const parsedDays = parseDayList(dayParam);

    // ?hide=6,7 or ?hide=Sa,So → hide these days (negative filter)
    const hideParam = params.get('hide');
    const parsedHide = parseDayList(hideParam);

    const urlParams = {
        embedded: params.get('embedded') === 'true',
        category: params.get('category'),
        days: parsedDays,
        hideDays: parsedHide,
        readonly: params.get('readonly') === 'true',
        compact: params.get('compact') === 'true',
        hideempty: params.get('hideempty') === 'true',
        collapse: params.get('collapse') === 'true',
        view: params.get('view') || null
    };

    setUrlParams(urlParams);

    // Apply body classes for embedded modes
    if (urlParams.embedded) {
        document.body.classList.add('embedded');
    }
    if (urlParams.compact) {
        document.body.classList.add('compact');
    }
    if (urlParams.readonly) {
        document.body.classList.add('readonly');
    }
}