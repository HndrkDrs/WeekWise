/**
 * Tests for js/features/empty-collapse.js
 * Validates module structure and runs safe pure-function smoke tests.
 */

var fs = require('fs');
var path = require('path');

var moduleSrc = fs.readFileSync(
    path.join(__dirname, '..', '..', 'js', 'features', 'empty-collapse.js'),
    'utf-8'
);

test('empty-collapse: module file exists and is non-empty', function() {
    assertTrue(moduleSrc.length > 100, 'module file should be > 100 chars');
});

test('empty-collapse: exports shouldCollapseEmpty', function() {
    assertContains('export function shouldCollapseEmpty', moduleSrc);
});

test('empty-collapse: exports analyzeEmptyHours', function() {
    assertContains('export function analyzeEmptyHours', moduleSrc);
});

test('empty-collapse: exports buildYMapper', function() {
    assertContains('export function buildYMapper', moduleSrc);
});

// Smoke tests on buildYMapper (pure function, no state dependency)
test('empty-collapse: buildYMapper all full hours', function() {
    var emptyHours = [
        { hour: 8, empty: false },
        { hour: 9, empty: false },
        { hour: 10, empty: false }
    ];
    var yMapper = buildYMapper(emptyHours, 8);

    assertEqual(yMapper.getTotalHeight(), 180, '3 * 60 = 180');
    assertEqual(yMapper.mapMinuteToPixel(0), 0);
    assertEqual(yMapper.mapMinuteToPixel(30), 30);
    assertEqual(yMapper.mapMinuteToPixel(60), 60);
    assertEqual(yMapper.mapMinuteToPixel(120), 120);
});

test('empty-collapse: buildYMapper mixed empty/full', function() {
    var emptyHours = [
        { hour: 8, empty: true },
        { hour: 9, empty: false },
        { hour: 10, empty: true },
        { hour: 11, empty: false }
    ];
    var yMapper = buildYMapper(emptyHours, 8);

    // 8(12) + 9(60) + 10(12) + 11(60) = 144
    assertEqual(yMapper.getTotalHeight(), 144);

    // Minute 0 (start of hour 8): 0
    assertEqual(yMapper.mapMinuteToPixel(0), 0);
    // Minute 30 (middle of collapsed hour 8): 6
    assertEqual(yMapper.mapMinuteToPixel(30), 6);
    // Minute 60 (start of hour 9): 12
    assertEqual(yMapper.mapMinuteToPixel(60), 12);
    // Minute 90 (middle of hour 9): 12 + 30 = 42
    assertEqual(yMapper.mapMinuteToPixel(90), 42);
    // Minute 120 (start of hour 10): 12 + 60 = 72
    assertEqual(yMapper.mapMinuteToPixel(120), 72);
    // Minute 180 (start of hour 11): 12 + 60 + 12 = 84
    assertEqual(yMapper.mapMinuteToPixel(180), 84);
});

test('empty-collapse: buildYMapper all collapsed', function() {
    var emptyHours = [
        { hour: 8, empty: true },
        { hour: 9, empty: true },
        { hour: 10, empty: true }
    ];
    var yMapper = buildYMapper(emptyHours, 8);

    assertEqual(yMapper.getTotalHeight(), 36, '3 * 12 = 36');
    assertEqual(yMapper.mapMinuteToPixel(0), 0);
    assertEqual(yMapper.mapMinuteToPixel(60), 12);
    assertEqual(yMapper.mapMinuteToPixel(120), 24);
});

test('empty-collapse: mapMinuteToPixel beyond range returns totalHeight', function() {
    var emptyHours = [{ hour: 8, empty: false }];
    var yMapper = buildYMapper(emptyHours, 8);

    var result = yMapper.mapMinuteToPixel(120);
    assertEqual(result, yMapper.getTotalHeight());
});