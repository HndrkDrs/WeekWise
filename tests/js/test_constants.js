/**
 * Tests for js/core/constants.js – the extracted module.
 */

var fs = require('fs');
var path = require('path');

var moduleSrc = fs.readFileSync(
    path.join(__dirname, '..', '..', 'js', 'core', 'constants.js'),
    'utf-8'
);

// Load the module by evaluating it (strip export keywords, use var for global scope)
var strippedSrc = moduleSrc
    .replace(/\bexport const CONFIG\b/g, 'var CONFIG')
    .replace(/\bexport const LOADING_LOGO_MIN_MS\b/g, 'var LOADING_LOGO_MIN_MS')
    .replace(/\bexport\s+/g, '');
eval(strippedSrc);

test('constants: CONFIG object exists', function() {
    assertType(CONFIG, 'object', 'CONFIG should be an object');
});

test('constants: WEEKDAYS has 7 entries', function() {
    assertEqual(CONFIG.WEEKDAYS.length, 7, 'should have 7 weekdays');
    assertEqual(CONFIG.WEEKDAYS[0], 'Montag');
    assertEqual(CONFIG.WEEKDAYS[6], 'Sonntag');
});

test('constants: DAY_ALIASES covers German and English', function() {
    assertEqual(CONFIG.DAY_ALIASES['montag'], 1);
    assertEqual(CONFIG.DAY_ALIASES['mo'], 1);
    assertEqual(CONFIG.DAY_ALIASES['monday'], 1);
    assertEqual(CONFIG.DAY_ALIASES['sonntag'], 7);
    assertEqual(CONFIG.DAY_ALIASES['so'], 7);
    assertEqual(CONFIG.DAY_ALIASES['sunday'], 7);
});

test('constants: DEFAULT_START_HOUR is 8', function() {
    assertEqual(CONFIG.DEFAULT_START_HOUR, 8);
});

test('constants: DEFAULT_END_HOUR is 22', function() {
    assertEqual(CONFIG.DEFAULT_END_HOUR, 22);
});

test('constants: DEFAULT_HASH is -1352366804', function() {
    assertEqual(CONFIG.DEFAULT_HASH, -1352366804);
});

test('constants: ALLOWED_FILENAMES contains 2 files', function() {
    assertEqual(CONFIG.ALLOWED_FILENAMES.length, 2);
    assertTrue(CONFIG.ALLOWED_FILENAMES.indexOf('settings.json') !== -1);
    assertTrue(CONFIG.ALLOWED_FILENAMES.indexOf('bookings.json') !== -1);
});

test('constants: COLLAPSED_HOUR_HEIGHT is 12', function() {
    assertEqual(CONFIG.COLLAPSED_HOUR_HEIGHT, 12);
});

test('constants: FULL_HOUR_HEIGHT is 60', function() {
    assertEqual(CONFIG.FULL_HOUR_HEIGHT, 60);
});

test('constants: LOADING_LOGO_MIN_MS is 2000', function() {
    assertEqual(LOADING_LOGO_MIN_MS, 2000);
});

// ── Cross-check with original app.js CONFIG ──

test('constants: CONFIG matches original app.js CONFIG', function() {
    assertEqual(CONFIG.WEEKDAYS.length, 7);
    assertEqual(CONFIG.DEFAULT_START_HOUR, 8);
    assertEqual(CONFIG.DEFAULT_END_HOUR, 22);
    assertEqual(CONFIG.FULL_HOUR_HEIGHT, 60);
    assertEqual(CONFIG.COLLAPSED_HOUR_HEIGHT, 12);
});

test('constants: module exports CONFIG', function() {
    assertContains('export const CONFIG', moduleSrc);
});

test('constants: module exports LOADING_LOGO_MIN_MS', function() {
    assertContains('export const LOADING_LOGO_MIN_MS', moduleSrc);
});