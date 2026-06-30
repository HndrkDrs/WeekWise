/**
 * WeekWise – Server Communication Service
 * Extracted from app.js – fetch-based save/load to PHP backend.
 */

import { CONFIG } from '../core/constants.js';

/**
 * Save data to server via save_json.php.
 */
export async function saveToServer(filename, data, onLoading) {
    // Validate filename
    if (!CONFIG.ALLOWED_FILENAMES.includes(filename)) {
        console.error('Invalid filename:', filename);
        return Promise.reject(new Error('Invalid filename'));
    }

    try {
        if (onLoading) onLoading(true);
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
        if (onLoading) onLoading(false);
    }
}

/**
 * Load data from server via save_json.php.
 */
export async function loadFromServer(filename) {
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