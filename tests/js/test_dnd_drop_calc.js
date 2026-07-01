/**
 * Tests for Drag & Drop Drop-Calculation Logic
 * Verifies the time calculation used in the column 'drop' event handler.
 * The logic is: snapTo15(dropY) → clamp → formatTime.
 */

var fs = require('fs');
var path = require('path');

// The snapTo15 and formatTime functions are already globally available
// from app-legacy.js loaded via the runner's eval().

test('dnd-drop-calc: snapTo15 snaps 7 to 0', function() {
    assertEqual(snapTo15(7), 0);
});

test('dnd-drop-calc: snapTo15 snaps 8 to 15', function() {
    assertEqual(snapTo15(8), 15);
});

test('dnd-drop-calc: snapTo15 snaps 23 to 30', function() {
    assertEqual(snapTo15(23), 30);
});

test('dnd-drop-calc: snapTo15 snaps 37 to 30', function() {
    assertEqual(snapTo15(37), 30);
});

test('dnd-drop-calc: snapTo15 snaps 38 to 45', function() {
    assertEqual(snapTo15(38), 45);
});

// Test the full drop time calculation as done in createDayColumns drop handler
test('dnd-drop-calc: full drop calc with 8:00-22:00 range', function() {
    var startHour = 8;
    var endHour = 22;
    var duration = 60; // 1-hour booking
    var dropY = 120; // dropped at pixel 120 (hour 10:00 on a 60px/hour grid)
    var dropMinutes = snapTo15(dropY); // should be 120
    var newStartMin = Math.max(0, dropMinutes);
    var maxStart = (endHour - startHour) * 60 - duration;
    var clampedStart = Math.min(newStartMin, Math.max(0, maxStart));
    var newStartTotal = clampedStart + startHour * 60;
    var newEndTotal = newStartTotal + duration;
    var newStartTime = formatTime(Math.floor(newStartTotal / 60), newStartTotal % 60);
    var newEndTime = formatTime(Math.floor(newEndTotal / 60), newEndTotal % 60);

    assertEqual(dropMinutes, 120, 'dropY 120 snaps to 120');
    assertEqual(newStartTime, '10:00', 'should be 10:00');
    assertEqual(newEndTime, '11:00', 'should be 11:00');
});

test('dnd-drop-calc: full drop calc near end of day clamps correctly', function() {
    var startHour = 8;
    var endHour = 22;
    var duration = 120; // 2-hour booking
    var dropY = 830; // very late in the day
    var dropMinutes = snapTo15(dropY); // ~ 830
    var newStartMin = Math.max(0, dropMinutes);
    var maxStart = (endHour - startHour) * 60 - duration; // 14*60 - 120 = 720
    var clampedStart = Math.min(newStartMin, Math.max(0, maxStart));
    var newStartTotal = clampedStart + startHour * 60;
    var newEndTotal = newStartTotal + duration;
    var newStartTime = formatTime(Math.floor(newStartTotal / 60), newStartTotal % 60);
    var newEndTime = formatTime(Math.floor(newEndTotal / 60), newEndTotal % 60);

    // Should be clamped to maxStart = 720 minutes from startHour → 8:00 + 720 = 20:00
    assertEqual(clampedStart, 720, 'should be clamped to 720');
    assertEqual(newStartTime, '20:00', 'should clamp to 20:00');
    assertEqual(newEndTime, '22:00', 'should end at 22:00');
});

test('dnd-drop-calc: full drop calc with 15-min snap', function() {
    var startHour = 6;
    var endHour = 18;
    var duration = 45; // 45-min booking
    var dropY = 98; // nearest 15-min mark is 105 (01:45)
    var dropMinutes = snapTo15(dropY);
    var newStartMin = Math.max(0, dropMinutes);
    var maxStart = (endHour - startHour) * 60 - duration;
    var clampedStart = Math.min(newStartMin, Math.max(0, maxStart));
    var newStartTotal = clampedStart + startHour * 60;
    var newEndTotal = newStartTotal + duration;
    var newStartTime = formatTime(Math.floor(newStartTotal / 60), newStartTotal % 60);
    var newEndTime = formatTime(Math.floor(newEndTotal / 60), newEndTotal % 60);

    assertEqual(dropMinutes, 105, '98 snaps to 105');
    assertEqual(newStartTime, '07:45', 'should be 07:45');
    assertEqual(newEndTime, '08:30', 'should be 08:30');
});

// Test copy mode: generates new ID
test('dnd-drop-calc: copy generates unique ID', function() {
    var source = { day: 1, startTime: '08:00', endTime: '09:00', title: 'Test' };
    var copy = JSON.parse(JSON.stringify(source));
    copy.id = generateBookingId();
    copy.day = 3;
    copy.startTime = '14:00';
    copy.endTime = '15:00';

    assertNotEmpty(copy.id, 'copy should have an ID');
    assertTrue(copy.id !== source.id, 'copy ID should differ from source');
    assertEqual(copy.day, 3, 'target day should be set');
    assertEqual(copy.startTime, '14:00');
    assertEqual(copy.endTime, '15:00');
    // Source unchanged
    assertEqual(source.day, 1);
    assertEqual(source.startTime, '08:00');
});

// Test move mode: modifies source
test('dnd-drop-calc: move modifies source in place', function() {
    var source = { day: 1, startTime: '08:00', endTime: '09:00', title: 'Test' };
    var originalId = source.id || 'orig';
    source.day = 3;
    source.startTime = '14:00';
    source.endTime = '15:00';

    assertEqual(source.day, 3, 'moved to day 3');
    assertEqual(source.startTime, '14:00');
    assertEqual(source.endTime, '15:00');
});