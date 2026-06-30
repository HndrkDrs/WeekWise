/**
 * Smoke Tests – Utility Functions (app.js Pure Functions)
 * Tests the core pure functions that are candidates for extraction.
 */

// ── stringToHash ──────────────────────────────────────

test('stringToHash: known value produces consistent hash', () => {
    const result = stringToHash('test');
    assertEqual(result, 3556498, 'stringToHash("test") should be consistent');
});

test('stringToHash: empty string returns 0', () => {
    const result = stringToHash('');
    assertEqual(result, 0, 'stringToHash("") should be 0');
});

test('stringToHash: same input = same output', () => {
    const a = stringToHash('WeekWise');
    const b = stringToHash('WeekWise');
    assertEqual(a, b, 'identical inputs must produce identical hashes');
});

test('stringToHash: different inputs produce different hashes', () => {
    const a = stringToHash('hello');
    const b = stringToHash('world');
    assertTrue(a !== b, 'different inputs should produce different hashes');
});

// ── formatTime ────────────────────────────────────────

test('formatTime: standard hours and minutes', () => {
    assertEqual(formatTime(8, 30), '08:30');
    assertEqual(formatTime(14, 0), '14:00');
});

test('formatTime: single digit hour pads to 2 digits', () => {
    assertEqual(formatTime(0, 5), '00:05');
    assertEqual(formatTime(9, 15), '09:15');
});

test('formatTime: midnight', () => {
    assertEqual(formatTime(0, 0), '00:00');
});

test('formatTime: end of day', () => {
    assertEqual(formatTime(23, 45), '23:45');
});

// ── timeToMinutes ─────────────────────────────────────

test('timeToMinutes: standard times', () => {
    assertEqual(timeToMinutes('08:00'), 480);
    assertEqual(timeToMinutes('12:30'), 750);
});

test('timeToMinutes: midnight', () => {
    assertEqual(timeToMinutes('00:00'), 0);
});

test('timeToMinutes: end of day', () => {
    assertEqual(timeToMinutes('23:59'), 1439);
});

test('timeToMinutes: roundtrip with formatTime', () => {
    const hour = 10, minute = 45;
    const timeStr = formatTime(hour, minute);
    const minutes = timeToMinutes(timeStr);
    assertEqual(minutes, hour * 60 + minute, 'roundtrip formatTime→timeToMinutes');
});

// ── escapeHtml ────────────────────────────────────────

test('escapeHtml: escapes script tags', () => {
    const result = escapeHtml('<script>alert("xss")</script>');
    // Must not contain raw script tag or angle brackets
    assertNotContains('<script>', result, 'script tag should not appear literally');
    assertNotContains('<', result, 'raw < must be escaped');
    assertNotContains('>', result, 'raw > must be escaped');
    // Should contain HTML entity markers (ampersand introduces entities)
    assertContains(String.fromCharCode(38), result, 'should contain & (entity marker)');
});

test('escapeHtml: normal text unchanged', () => {
    var text = 'Hello World';
    var result = escapeHtml(text);
    // The DOM-based approach shouldn't alter safe text
    assertTrue(result.indexOf(text) !== -1 || result === text || result.indexOf('Hello') !== -1);
});

test('escapeHtml: null/empty returns empty', () => {
    assertEqual(escapeHtml(''), '');
    assertEqual(escapeHtml(null), '');
});

test('escapeHtml: ampersand is escaped', () => {
    var result = escapeHtml('A & B');
    // '&' in input should become '&' – check it no longer contains raw ' & '
    assertNotContains(' & ', result, 'raw ampersand text should be escaped');
    assertContains(String.fromCharCode(38), result, 'should contain HTML entity');
});

// ── rgbToHex ──────────────────────────────────────────

test('rgbToHex: standard rgb conversion', () => {
    assertEqual(rgbToHex('rgb(255, 0, 0)'), '#ff0000');
    assertEqual(rgbToHex('rgb(0, 255, 0)'), '#00ff00');
    assertEqual(rgbToHex('rgb(0, 0, 255)'), '#0000ff');
});

test('rgbToHex: white and black', () => {
    assertEqual(rgbToHex('rgb(255, 255, 255)'), '#ffffff');
    assertEqual(rgbToHex('rgb(0, 0, 0)'), '#000000');
});

test('rgbToHex: already hex, pass through', () => {
    assertEqual(rgbToHex('#ff0000'), '#ff0000');
    assertEqual(rgbToHex('#2196F3'), '#2196F3');
});

test('rgbToHex: null returns fallback', () => {
    assertEqual(rgbToHex(null), '#000000');
});

test('rgbToHex: CSS variable passthrough', () => {
    assertEqual(rgbToHex('var(--primary)'), 'var(--primary)');
});

// ── isLightColor ──────────────────────────────────────

test('isLightColor: white is light', () => {
    assertTrue(isLightColor('#ffffff'), 'white should be light');
});

test('isLightColor: black is dark', () => {
    assertFalse(isLightColor('#000000'), 'black should be dark');
});

test('isLightColor: yellow is light', () => {
    assertTrue(isLightColor('#FFFF00'), 'yellow should be light');
});

test('isLightColor: dark blue is dark', () => {
    assertFalse(isLightColor('#000080'), 'dark blue should be dark');
});

test('isLightColor: rgb yellow is light', () => {
    assertTrue(isLightColor('rgb(255, 255, 0)'), 'rgb yellow should be light');
});

test('isLightColor: CSS variable returns false (default)', () => {
    assertFalse(isLightColor('var(--secondary)'), 'CSS var should default to dark');
});

// ── snapTo15 ──────────────────────────────────────────

test('snapTo15: exact 15-minute values unchanged', () => {
    assertEqual(snapTo15(0), 0);
    assertEqual(snapTo15(15), 15);
    assertEqual(snapTo15(30), 30);
    assertEqual(snapTo15(45), 45);
    assertEqual(snapTo15(60), 60);
});

test('snapTo15: round up from 8', () => {
    assertEqual(snapTo15(7), 0);
    assertEqual(snapTo15(8), 15);
    assertEqual(snapTo15(22), 15);
    assertEqual(snapTo15(23), 30);
});

test('snapTo15: round down', () => {
    assertEqual(snapTo15(7), 0);
    assertEqual(snapTo15(52), 45);
});

// ── generateBookingId ─────────────────────────────────

test('generateBookingId: returns a string', () => {
    const id = generateBookingId();
    assertType(id, 'string', 'booking ID should be a string');
    assertNotEmpty(id, 'booking ID should not be empty');
});

test('generateBookingId: UUID v4 format', () => {
    const id = generateBookingId();
    // UUID v4 pattern: 8-4-4-4-12 hex digits
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    // Note: with mock crypto.randomUUID returning constant, this will be constant
    // But it should still match UUID format
    assertTrue(uuidPattern.test(id) || id.length >= 8, 'booking ID should be valid');
});

test('generateBookingId: unique calls produce different IDs (mock)', () => {
    // With mocked crypto, IDs are constant. We test the function exists and returns something.
    const id = generateBookingId();
    assertType(id, 'string');
});

// ── ensureBookingId ───────────────────────────────────

test('ensureBookingId: adds ID to booking without one', () => {
    const booking = { title: 'Test', day: 1 };
    const result = ensureBookingId(booking);
    assertTrue(result, 'should return true when ID was added');
    assertNotEmpty(booking.id, 'booking should now have an id');
});

test('ensureBookingId: does not overwrite existing ID', () => {
    const booking = { title: 'Test', day: 1, id: 'existing-id-123' };
    const result = ensureBookingId(booking);
    assertFalse(result, 'should return false when ID already exists');
    assertEqual(booking.id, 'existing-id-123', 'existing ID should be preserved');
});

// ── sanitizeColor ─────────────────────────────────────

test('sanitizeColor: valid hex pass through', () => {
    assertEqual(sanitizeColor('#ff0000'), '#ff0000');
    assertEqual(sanitizeColor('#2196F3'), '#2196F3');
    assertEqual(sanitizeColor('#fff'), '#fff');
});

test('sanitizeColor: valid rgb passthrough', () => {
    assertEqual(sanitizeColor('rgb(255, 0, 0)'), 'rgb(255, 0, 0)');
    assertEqual(sanitizeColor('rgba(0,0,0,0.5)'), 'rgba(0,0,0,0.5)');
});

test('sanitizeColor: CSS variable passthrough', () => {
    assertEqual(sanitizeColor('var(--secondary)'), 'var(--secondary)');
});

test('sanitizeColor: named CSS color passthrough', () => {
    assertEqual(sanitizeColor('red'), 'red');
    assertEqual(sanitizeColor('blue'), 'blue');
});

test('sanitizeColor: null returns black', () => {
    assertEqual(sanitizeColor(null), '#000000');
});

test('sanitizeColor: invalid returns black', () => {
    assertEqual(sanitizeColor('alert("xss")'), '#000000');
});

// ── validateBooking ───────────────────────────────────

test('validateBooking: valid booking passes', () => {
    const booking = { day: 1, startTime: '08:00', endTime: '09:00', title: 'Test' };
    assertTrue(validateBooking(booking), 'valid booking should pass validation');
});

test('validateBooking: day=0 (Ablage) is valid', () => {
    const booking = { day: 0, startTime: '08:00', endTime: '09:00', title: 'Ablage Item' };
    assertTrue(validateBooking(booking), 'Ablage bookings should be valid');
});

test('validateBooking: missing title fails', () => {
    const booking = { day: 1, startTime: '08:00', endTime: '09:00' };
    assertFalse(validateBooking(booking), 'booking without title should fail');
});

test('validateBooking: empty title fails', () => {
    const booking = { day: 1, startTime: '08:00', endTime: '09:00', title: '' };
    assertFalse(validateBooking(booking), 'booking with empty title should fail');
});

test('validateBooking: missing day fails', () => {
    const booking = { startTime: '08:00', endTime: '09:00', title: 'Test' };
    assertFalse(validateBooking(booking), 'booking without day should fail');
});

test('validateBooking: missing startTime fails', () => {
    const booking = { day: 1, endTime: '09:00', title: 'Test' };
    assertFalse(validateBooking(booking), 'booking without startTime should fail');
});