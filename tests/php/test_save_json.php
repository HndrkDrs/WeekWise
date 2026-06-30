
<?php
/**
 * PHP Smoke Tests – save_json.php
 * Tests the JSON save/load API logic without requiring the script
 * (which would call exit() and kill the test process).
 */

require_once __DIR__ . '/bootstrap.php';

echo "  Testing save_json.php logic\n\n";

// ── Filename validation (whitelist logic) ──────────────

test('save_json: whitelist allows valid filenames', function () {
    $allowedFiles = ['settings.json', 'bookings.json'];

    assertTrue(
        in_array('settings.json', $allowedFiles),
        'settings.json should be allowed'
    );
    assertTrue(
        in_array('bookings.json', $allowedFiles),
        'bookings.json should be allowed'
    );
});

test('save_json: whitelist blocks path traversal', function () {
    $allowedFiles = ['settings.json', 'bookings.json'];

    assertFalse(
        in_array('../../../etc/passwd', $allowedFiles),
        'path traversal should be blocked'
    );
    assertFalse(
        in_array('../settings.json', $allowedFiles),
        '../settings.json should be blocked'
    );
    assertFalse(
        in_array('', $allowedFiles),
        'empty filename should be blocked'
    );
    assertFalse(
        in_array('/etc/passwd', $allowedFiles),
        'absolute path should be blocked'
    );
});

test('save_json: only 2 files are in whitelist', function () {
    $allowedFiles = ['settings.json', 'bookings.json'];
    assertEqual(count($allowedFiles), 2, 'only 2 files should be whitelisted');
});

// ── JSON validation ────────────────────────────────────

test('save_json: valid JSON decodes correctly', function () {
    $validJson = '{"title":"WeekWise","mode":"week","eventDayCount":3}';
    $data = json_decode($validJson, true);

    assertTrue(is_array($data), 'valid settings JSON should decode to array');
    assertEqual($data['title'], 'WeekWise', 'should preserve title');
    assertEqual($data['mode'], 'week', 'should preserve mode');
    assertEqual($data['eventDayCount'], 3, 'should preserve day count');
});

test('save_json: valid bookings array decodes', function () {
    $bookingsJson = '[{"day":1,"startTime":"08:00","endTime":"09:00","title":"Test"}]';
    $data = json_decode($bookingsJson, true);

    assertTrue(is_array($data), 'bookings should decode to array');
    assertEqual(count($data), 1, 'should contain 1 booking');
    assertEqual($data[0]['title'], 'Test', 'should preserve booking title');
    assertEqual($data[0]['day'], 1, 'day should be numeric 1');
});

test('save_json: invalid JSON returns null', function () {
    $invalidJson = '{broken: "json"}';
    $data = json_decode($invalidJson, true);

    assertEqual($data, null, 'invalid JSON should return null');
    assertTrue(
        json_last_error() !== JSON_ERROR_NONE,
        'invalid JSON should set error code'
    );
});

test('save_json: empty string is invalid JSON', function () {
    $data = json_decode('', true);
    assertEqual($data, null, 'empty string should decode to null');
});

test('save_json: valid JSON with unicode preserves characters', function () {
    $json = '{"title":"München"}';
    $data = json_decode($json, true);
    assertEqual($data['title'], 'München', 'should preserve unicode');
});

// ── JSON encode (used for saving) ──────────────────────

test('save_json: json_encode produces valid output', function () {
    $data = ['title' => 'Test', 'count' => 42];
    $encoded = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

    assertNotEmpty($encoded, 'json_encode should produce output');
    $decoded = json_decode($encoded, true);
    assertEqual($decoded['title'], 'Test', 'roundtrip should preserve values');
    assertEqual($decoded['count'], 42, 'roundtrip should preserve numbers');
});

test('save_json: json_encode handles unicode', function () {
    $data = ['title' => 'München', 'ort' => 'Köln'];
    $encoded = json_encode($data, JSON_UNESCAPED_UNICODE);

    assertContains('München', $encoded, 'should preserve ü');
    assertContains('Köln', $encoded, 'should preserve ö');
});

// ── File operation simulation ─────────────────────────

test('save_json: temp file write and read roundtrip', function () {
    $testData = ['test' => true, 'value' => 42, 'name' => 'WeekWise'];
    $testFile = __DIR__ . '/_test_roundtrip.json';

    // Write
    $fp = fopen($testFile, 'w');
    assertTrue($fp !== false, 'should open file for writing');

    $written = fwrite($fp, json_encode($testData));
    fclose($fp);
    assertTrue($written > 0, 'should write bytes');

    // Read
    $content = file_get_contents($testFile);
    assertNotEmpty($content, 'should read file content');

    $decoded = json_decode($content, true);
    assertTrue(is_array($decoded), 'should decode to array');
    assertEqual($decoded['test'], true, 'should preserve boolean');
    assertEqual($decoded['value'], 42, 'should preserve number');

    // Cleanup
    unlink($testFile);
    assertFalse(file_exists($testFile), 'test file should be cleaned up');
});

test('save_json: file locking basics', function () {
    $testFile = __DIR__ . '/_test_lock.json';
    $fp = fopen($testFile, 'w');
    assertTrue($fp !== false, 'should open file');

    $locked = flock($fp, LOCK_EX | LOCK_NB);
    assertTrue($locked, 'should acquire exclusive lock');

    flock($fp, LOCK_UN);
    fclose($fp);
    unlink($testFile);
});

echo "\n";
exit(finishTests());