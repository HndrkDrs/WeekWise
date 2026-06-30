/**
 * WeekWise – Authentication Service
 * Extracted from app.js – login/logout with hash-based password check.
 */

import { stringToHash } from '../core/utils.js';
import { setLoggedIn, isLoggedIn } from '../core/state.js';
import { getLoginHash } from '../core/persist.js';

/**
 * Attempt login with password hash comparison.
 * @param {string} passwordInput
 * @returns {boolean}
 */
export function login(passwordInput) {
    const password = stringToHash(passwordInput);
    const storedHash = getLoginHash();

    if (!isNaN(storedHash) && password === storedHash) {
        setLoggedIn(true);
        return true;
    }
    return false;
}

/**
 * Log out the current user.
 */
export function logout() {
    setLoggedIn(false);
}