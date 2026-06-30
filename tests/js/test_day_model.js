/**
 * Tests for js/models/day-model.js
 * Validates module structure and function existence.
 */

var fs = require('fs');
var path = require('path');

var moduleSrc = fs.readFileSync(
    path.join(__dirname, '..', '..', 'js', 'models', 'day-model.js'),
    'utf-8'
);

test('day-model: module file exists and is non-empty', function() {
    assertTrue(moduleSrc.length > 100, 'module file should be > 100 chars');
});

test('day-model: exports getDayCount', function() {
    assertContains('export function getDayCount', moduleSrc);
});

test('day-model: exports getDayLabel', function() {
    assertContains('export function getDayLabel', moduleSrc);
});

test('day-model: exports getDayShortLabel', function() {
    assertContains('export function getDayShortLabel', moduleSrc);
});

test('day-model: exports parseDayInput', function() {
    assertContains('export function parseDayInput', moduleSrc);
});

test('day-model: exports parseDayList', function() {
    assertContains('export function parseDayList', moduleSrc);
});

test('day-model: exports migrateDay', function() {
    assertContains('export function migrateDay', moduleSrc);
});

test('day-model: exports migrateHiddenDays', function() {
    assertContains('export function migrateHiddenDays', moduleSrc);
});

// These functions from app.js globals are already tested in test_utils.js
// (parseDayInput, migrateDay, parseDayList). Here we just confirm module parity.
test('day-model: parseDayInput from app.js works (module parity)', function() {
    assertEqual(parseDayInput('1'), 1);
    assertEqual(parseDayInput('Montag'), 1);
    assertEqual(parseDayInput('Mo'), 1);
});

test('day-model: parseDayList from app.js works (module parity)', function() {
    var result = parseDayList('Mo,Di,Mi');
    assertEqual(result.length, 3);
});

test('day-model: migrateDay from app.js works (module parity)', function() {
    assertEqual(migrateDay('Montag'), 1);
    assertEqual(migrateDay(0), 0);
    assertEqual(migrateDay('Ablage'), 0);
});

test('day-model: migrateHiddenDays from app.js works (module parity)', function() {
    var result = migrateHiddenDays(['Montag', 'Sonntag']);
    assertEqual(result.length, 2);
    assertEqual(result[0], 1);
});