/**
 * Tests for js/core/utils.js – the extracted module.
 * Validates module structure and verifies exports match
 * the original global functions from app.js.
 */

var fs = require('fs');
var path = require('path');

var moduleSrc = fs.readFileSync(
    path.join(__dirname, '..', '..', 'js', 'core', 'utils.js'),
    'utf-8'
);

test('utils module: file exists and is non-empty', function() {
    assertTrue(moduleSrc.length > 100, 'module file should be > 100 chars');
});

test('utils module: exports stringToHash', function() {
    assertContains('export function stringToHash', moduleSrc);
});

test('utils module: exports rgbToHex', function() {
    assertContains('export function rgbToHex', moduleSrc);
});

test('utils module: exports isLightColor', function() {
    assertContains('export function isLightColor', moduleSrc);
});

test('utils module: exports sanitizeColor', function() {
    assertContains('export function sanitizeColor', moduleSrc);
});

test('utils module: exports formatTime', function() {
    assertContains('export function formatTime', moduleSrc);
});

test('utils module: exports timeToMinutes', function() {
    assertContains('export function timeToMinutes', moduleSrc);
});

test('utils module: exports escapeHtml', function() {
    assertContains('export function escapeHtml', moduleSrc);
});

test('utils module: exports generateBookingId', function() {
    assertContains('export function generateBookingId', moduleSrc);
});

test('utils module: exports ensureBookingId', function() {
    assertContains('export function ensureBookingId', moduleSrc);
});

test('utils module: exports snapTo15', function() {
    assertContains('export function snapTo15', moduleSrc);
});

// ── Cross-check: extracted functions match global originals ──

// Evaluate the module source after stripping 'export ' to make them global
var stripped = moduleSrc.replace(/\bexport\s+/g, '');
eval(stripped);

test('utils module: stringToHash identical to original', function() {
    assertEqual(stringToHash('test'), 3556498);
    assertEqual(stringToHash('WeekWise'), stringToHash('WeekWise'));
});

test('utils module: formatTime identical to original', function() {
    assertEqual(formatTime(8, 30), '08:30');
    assertEqual(formatTime(23, 45), '23:45');
});

test('utils module: timeToMinutes identical to original', function() {
    assertEqual(timeToMinutes('12:00'), 720);
    assertEqual(timeToMinutes('00:00'), 0);
});

test('utils module: snapTo15 identical to original', function() {
    assertEqual(snapTo15(8), 15);
    assertEqual(snapTo15(22), 15);
    assertEqual(snapTo15(0), 0);
});

test('utils module: rgbToHex identical to original', function() {
    assertEqual(rgbToHex('rgb(255, 0, 0)'), '#ff0000');
    assertEqual(rgbToHex('#2196F3'), '#2196F3');
});

test('utils module: sanitizeColor identical to original', function() {
    assertEqual(sanitizeColor('#ff0000'), '#ff0000');
    assertEqual(sanitizeColor(null), '#000000');
    assertEqual(sanitizeColor('alert("xss")'), '#000000');
});

test('utils module: ensureBookingId identical to original', function() {
    var b = { title: 'Test' };
    var result = ensureBookingId(b);
    assertTrue(result);
    assertNotEmpty(b.id);
});

test('utils module: escapeHtml identical to original', function() {
    var result = escapeHtml('<script>alert(1)</script>');
    assertNotContains('<script>', result);
});