/**
 * Tests for js/models/booking-model.js
 * Tests detectOverlaps, validateBooking.
 */

var fs = require('fs');
var path = require('path');

// validateBooking is already globally available from app.js and tested in test_utils.js
// Here we test detectOverlaps which is a pure function in the extracted model

var moduleSrc = fs.readFileSync(
    path.join(__dirname, '..', '..', 'js', 'models', 'booking-model.js'),
    'utf-8'
);

var stripped = moduleSrc
    .replace(/^import\s+.*$/gm, '')
    .replace(/^export /gm, '')
    .replace(/\btimeToMinutes\b/g, 'timeToMinutes');

eval(stripped);

// ── detectOverlaps ────────────────────────────────────

test('booking-model: detectOverlaps empty returns empty object', function() {
    var result = detectOverlaps([], 1);
    assertEqual(Object.keys(result).length, 0);
});

test('booking-model: detectOverlaps single booking no overlap', function() {
    var bookings = [
        { day: 1, startTime: '08:00', endTime: '09:00' }
    ];
    var result = detectOverlaps(bookings, 1);
    // Single booking gets count=1 (it's the only one in its group)
    assertEqual(Object.keys(result).length, 1);
});

test('booking-model: detectOverlaps two separate bookings no overlap', function() {
    var bookings = [
        { day: 1, startTime: '08:00', endTime: '09:00' },
        { day: 1, startTime: '10:00', endTime: '11:00' }
    ];
    var result = detectOverlaps(bookings, 1);
    // Both count=1 (separate groups)
    assertEqual(result[0].count, 1);
    assertEqual(result[1].count, 1);
});

test('booking-model: detectOverlaps two overlapping bookings', function() {
    var bookings = [
        { day: 1, startTime: '08:00', endTime: '10:00' },
        { day: 1, startTime: '09:00', endTime: '11:00' }
    ];
    var result = detectOverlaps(bookings, 1);
    assertEqual(result[0].count, 2, 'both overlap');
    assertEqual(result[1].count, 2, 'both overlap');
    assertEqual(result[0].index, 0, 'first in group');
    assertEqual(result[1].index, 1, 'second in group');
});

test('booking-model: detectOverlaps three overlapping', function() {
    var bookings = [
        { day: 1, startTime: '08:00', endTime: '09:30' },
        { day: 1, startTime: '08:30', endTime: '10:00' },
        { day: 1, startTime: '09:00', endTime: '09:45' }
    ];
    var result = detectOverlaps(bookings, 1);
    assertEqual(result[0].count, 3);
    assertEqual(result[1].count, 3);
    assertEqual(result[2].count, 3);
});

test('booking-model: detectOverlaps mixed groups', function() {
    var bookings = [
        { day: 1, startTime: '08:00', endTime: '09:00' },
        { day: 1, startTime: '08:30', endTime: '09:30' }, // overlaps with #0
        { day: 1, startTime: '11:00', endTime: '12:00' },
        { day: 1, startTime: '11:30', endTime: '12:30' }  // overlaps with #2
    ];
    var result = detectOverlaps(bookings, 1);
    // Group 1: indices 0,1 → count=2
    // Group 2: indices 2,3 → count=2
    assertEqual(result[0].count, 2);
    assertEqual(result[1].count, 2);
    assertEqual(result[2].count, 2);
    assertEqual(result[3].count, 2);
});

test('booking-model: detectOverlaps exact same times', function() {
    var bookings = [
        { day: 1, startTime: '08:00', endTime: '09:00' },
        { day: 1, startTime: '08:00', endTime: '09:00' }
    ];
    var result = detectOverlaps(bookings, 1);
    assertEqual(result[0].count, 2);
    assertEqual(result[1].count, 2);
});

test('booking-model: detectOverlaps adjacent bookings (no overlap)', function() {
    var bookings = [
        { day: 1, startTime: '08:00', endTime: '09:00' },
        { day: 1, startTime: '09:00', endTime: '10:00' } // starts exactly when first ends
    ];
    var result = detectOverlaps(bookings, 1);
    // They don't overlap (09:00 < 09:00 is false)
    assertEqual(result[0].count, 1);
    assertEqual(result[1].count, 1);
});

test('booking-model: detectOverlaps different days do not interfere', function() {
    var bookings = [
        { day: 1, startTime: '08:00', endTime: '09:00' },
        { day: 2, startTime: '08:00', endTime: '09:00' }
    ];
    var result = detectOverlaps(bookings, 1);
    assertEqual(Object.keys(result).length, 1, 'only day 1 booking');
    assertEqual(result[0].count, 1);
});

test('booking-model: detectOverlaps unsorted input still works', function() {
    var bookings = [
        { day: 1, startTime: '14:00', endTime: '15:00' },
        { day: 1, startTime: '08:00', endTime: '09:00' },
        { day: 1, startTime: '10:00', endTime: '11:00' }
    ];
    var result = detectOverlaps(bookings, 1);
    // After sorting: index 1 (08), 2 (10), 0 (14)
    assertEqual(result[0].count, 1);
    assertEqual(result[1].count, 1);
    assertEqual(result[2].count, 1);
});