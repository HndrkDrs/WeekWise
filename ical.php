<?php
/**
 * WeekWise 2.3 – ICS Calendar Endpoint
 *
 * Generates iCalendar (RFC 5545) output from bookings.
 *
 * Parameters (GET):
 *   token     – Required for subscription (Abo) access. Must match the
 *               active token stored in settings.json → icsTokens (last entry).
 *   category  – Filter by category name (case-insensitive).
 *   day       – Positive day filter (comma-separated day numbers).
 *   hide      – Negative day filter (comma-separated day numbers).
 *   download  – If "true", Content-Disposition: attachment is sent.
 *
 * Week mode:   VEVENTs use RRULE:FREQ=WEEKLY (no absolute date).
 * Event mode:  VEVENTs use absolute dates derived from eventStartDate + day offset.
 *
 * Invalid / expired token → empty calendar named "Abo abgelaufen".
 */

header('Content-Type: text/calendar; charset=utf-8');

// ── Helpers ──────────────────────────────────────────

function icalEscape($s) {
    $s = str_replace("\\", "\\\\", $s);
    $s = str_replace(",", "\\,", $s);
    $s = str_replace(";", "\\;", $s);
    $s = str_replace("\r\n", "\\n", $s);
    $s = str_replace("\n", "\\n", $s);
    return $s;
}

/** Fold long lines at 75 octets (RFC 5545 §3.1) */
function icalFold($line) {
    $result = '';
    while (strlen($line) > 75) {
        $result .= substr($line, 0, 75) . "\r\n ";
        $line = substr($line, 75);
    }
    $result .= $line;
    return $result;
}

function icalLine($key, $value) {
    return icalFold($key . ':' . $value) . "\r\n";
}

/**\n * Build a stable UID for a booking.\n * Uses the persistent booking ID if available (v2.3+),\n * falls back to content-based hash for legacy bookings.\n */
function bookingUid($booking, $index, $domain) {
    if (!empty($booking['id'])) {
        return $booking['id'] . '@' . $domain;
    }
    // Fallback for bookings without persistent ID (pre-migration)
    $raw = $index . '-' . ($booking['day'] ?? 0) . '-' . ($booking['startTime'] ?? '')
         . '-' . ($booking['title'] ?? '');
    return md5($raw) . '@' . $domain;
}

// ── Load data ────────────────────────────────────────

$settingsRaw = @file_get_contents('settings.json');
$bookingsRaw = @file_get_contents('bookings.json');

if ($settingsRaw === false || $bookingsRaw === false) {
    // Minimal valid but empty calendar
    echo "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//WeekWise//Error//DE\r\nEND:VCALENDAR\r\n";
    exit;
}

$settings = json_decode($settingsRaw, true);
$bookings = json_decode($bookingsRaw, true);

if (!is_array($settings) || !is_array($bookings)) {
    echo "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//WeekWise//Error//DE\r\nEND:VCALENDAR\r\n";
    exit;
}

// ── Token validation ─────────────────────────────────

$token = isset($_GET['token']) ? trim($_GET['token']) : '';
$icsTokens = isset($settings['icsTokens']) ? $settings['icsTokens'] : [];
$icsPublic = !empty($settings['icsPublic']);

// Determine access: either valid token, or icsPublic + no token (download only)
$tokenValid = false;
if ($token !== '' && is_array($icsTokens) && count($icsTokens) > 0) {
    // Only the newest (last) token is considered active
    $activeToken = end($icsTokens);
    if (isset($activeToken['token']) && $activeToken['token'] === $token) {
        $tokenValid = true;
    }
}

// If a token was provided but is invalid → "Abo abgelaufen" empty calendar
if ($token !== '' && !$tokenValid) {
    $calName = 'Abo abgelaufen';
    $out  = "BEGIN:VCALENDAR\r\n";
    $out .= "VERSION:2.0\r\n";
    $out .= "PRODID:-//WeekWise//ICS//DE\r\n";
    $out .= icalLine('X-WR-CALNAME', icalEscape($calName));
    $out .= "END:VCALENDAR\r\n";
    echo $out;
    exit;
}

// No token and not public → 403
if ($token === '' && !$icsPublic) {
    header('HTTP/1.1 403 Forbidden');
    echo "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//WeekWise//Forbidden//DE\r\nEND:VCALENDAR\r\n";
    exit;
}

// ── Parse filter parameters ──────────────────────────

$categoryFilter = isset($_GET['category']) ? strtolower(trim($_GET['category'])) : '';
$dayParam = isset($_GET['day']) ? trim($_GET['day']) : '';
$hideParam = isset($_GET['hide']) ? trim($_GET['hide']) : '';
$isDownload = isset($_GET['download']) && $_GET['download'] === 'true';

$dayFilter = [];
if ($dayParam !== '') {
    foreach (explode(',', $dayParam) as $d) {
        $d = intval(trim($d));
        if ($d >= 1) $dayFilter[] = $d;
    }
}

$hideDays = [];
if ($hideParam !== '') {
    foreach (explode(',', $hideParam) as $d) {
        $d = intval(trim($d));
        if ($d >= 1) $hideDays[] = $d;
    }
}

// ── Build domain for UIDs ────────────────────────────

$domain = isset($_SERVER['HTTP_HOST']) ? $_SERVER['HTTP_HOST'] : 'weekwise.local';

// ── Download header ──────────────────────────────────

if ($isDownload) {
    $fn = preg_replace('/[^a-zA-Z0-9_-]/', '_', $settings['title'] ?? 'WeekWise');
    header('Content-Disposition: attachment; filename="' . $fn . '.ics"');
}

// ── Mode detection ───────────────────────────────────

$mode = isset($settings['mode']) ? $settings['mode'] : 'week';
$eventStartDate = isset($settings['eventStartDate']) ? $settings['eventStartDate'] : null;
$calTitle = isset($settings['title']) ? $settings['title'] : 'WeekWise';
$bookingColors = isset($settings['bookingColors']) ? $settings['bookingColors'] : [];

// Map category IDs → names for filtering
$catIdToName = [];
foreach ($bookingColors as $c) {
    if (isset($c['id']) && isset($c['name'])) {
        $catIdToName[$c['id']] = $c['name'];
    }
}

// ── Filter bookings ──────────────────────────────────

$filtered = [];
foreach ($bookings as $idx => $b) {
    $day = isset($b['day']) ? intval($b['day']) : 0;

    // Skip Ablage (day=0)
    if ($day === 0) continue;

    // Positive day filter
    if (!empty($dayFilter) && !in_array($day, $dayFilter)) continue;

    // Negative day filter
    if (!empty($hideDays) && in_array($day, $hideDays)) continue;

    // Category filter
    if ($categoryFilter !== '') {
        $catId = isset($b['categoryID']) ? $b['categoryID'] : 'default';
        $catName = isset($catIdToName[$catId]) ? strtolower($catIdToName[$catId]) : '';
        if ($catName !== $categoryFilter && strtolower($catId) !== $categoryFilter) continue;
    }

    $b['_idx'] = $idx;
    $filtered[] = $b;
}

// ── Weekday map (ISO: 1=Mo→MO … 7=Su→SU) ───────────

$isoWeekdays = [1 => 'MO', 2 => 'TU', 3 => 'WE', 4 => 'TH', 5 => 'FR', 6 => 'SA', 7 => 'SU'];

// ── Generate VCALENDAR ───────────────────────────────

$out  = "BEGIN:VCALENDAR\r\n";
$out .= "VERSION:2.0\r\n";
$out .= "PRODID:-//WeekWise//ICS//DE\r\n";
$out .= icalLine('X-WR-CALNAME', icalEscape($calTitle));
$out .= "X-WR-TIMEZONE:Europe/Berlin\r\n";
$out .= "CALSCALE:GREGORIAN\r\n";
$out .= "METHOD:PUBLISH\r\n";

// VTIMEZONE for Europe/Berlin
$out .= "BEGIN:VTIMEZONE\r\n";
$out .= "TZID:Europe/Berlin\r\n";
$out .= "BEGIN:STANDARD\r\n";
$out .= "DTSTART:19701025T030000\r\n";
$out .= "RRULE:FREQ=YEARLY;BYDAY=-1SU;BYMONTH=10\r\n";
$out .= "TZOFFSETFROM:+0200\r\n";
$out .= "TZOFFSETTO:+0100\r\n";
$out .= "TZNAME:CET\r\n";
$out .= "END:STANDARD\r\n";
$out .= "BEGIN:DAYLIGHT\r\n";
$out .= "DTSTART:19700329T020000\r\n";
$out .= "RRULE:FREQ=YEARLY;BYDAY=-1SU;BYMONTH=3\r\n";
$out .= "TZOFFSETFROM:+0100\r\n";
$out .= "TZOFFSETTO:+0200\r\n";
$out .= "TZNAME:CEST\r\n";
$out .= "END:DAYLIGHT\r\n";
$out .= "END:VTIMEZONE\r\n";

// ── Generate VEVENTs ─────────────────────────────────

$now = gmdate('Ymd\THis\Z');

foreach ($filtered as $b) {
    $day = intval($b['day']);
    $startTime = isset($b['startTime']) ? $b['startTime'] : '08:00';
    $endTime   = isset($b['endTime'])   ? $b['endTime']   : '09:00';

    // Parse times
    $startParts = explode(':', $startTime);
    $endParts   = explode(':', $endTime);
    $sH = str_pad($startParts[0], 2, '0', STR_PAD_LEFT);
    $sM = str_pad(isset($startParts[1]) ? $startParts[1] : '0', 2, '0', STR_PAD_LEFT);
    $eH = str_pad($endParts[0], 2, '0', STR_PAD_LEFT);
    $eM = str_pad(isset($endParts[1]) ? $endParts[1] : '0', 2, '0', STR_PAD_LEFT);

    $out .= "BEGIN:VEVENT\r\n";
    $out .= icalLine('UID', bookingUid($b, $b['_idx'], $domain));
    $out .= icalLine('DTSTAMP', $now);

    if ($mode === 'event' && $eventStartDate) {
        // ── Event mode: absolute date ────────────────
        $date = new DateTime($eventStartDate);
        $date->modify('+' . ($day - 1) . ' days');
        $dateStr = $date->format('Ymd');

        $out .= icalLine('DTSTART;TZID=Europe/Berlin', $dateStr . 'T' . $sH . $sM . '00');
        $out .= icalLine('DTEND;TZID=Europe/Berlin',   $dateStr . 'T' . $eH . $eM . '00');
    } else {
        // ── Week mode: recurring weekly ──────────────
        // Use a reference Monday (2024-01-01 was a Monday) + day offset
        $refDate = new DateTime('2024-01-01'); // Monday
        $refDate->modify('+' . ($day - 1) . ' days');
        $dateStr = $refDate->format('Ymd');

        $out .= icalLine('DTSTART;TZID=Europe/Berlin', $dateStr . 'T' . $sH . $sM . '00');
        $out .= icalLine('DTEND;TZID=Europe/Berlin',   $dateStr . 'T' . $eH . $eM . '00');

        // Weekly recurrence on the correct weekday
        $wd = isset($isoWeekdays[$day]) ? $isoWeekdays[$day] : 'MO';
        $out .= icalLine('RRULE', 'FREQ=WEEKLY;BYDAY=' . $wd);
    }

    // Summary (title)
    $out .= icalLine('SUMMARY', icalEscape($b['title'] ?? ''));

    // Location
    if (!empty($b['location'])) {
        $out .= icalLine('LOCATION', icalEscape($b['location']));
    }

    // Description: combine description, trainer, contact
    $descParts = [];
    if (!empty($b['description'])) $descParts[] = $b['description'];
    if (!empty($b['trainer']))     $descParts[] = 'Trainer: ' . str_replace("\n", ", ", $b['trainer']);
    if (!empty($b['contact']))     $descParts[] = 'Kontakt: ' . $b['contact'];
    if (!empty($b['link']))        $descParts[] = 'Link: ' . $b['link'];
    if (!empty($descParts)) {
        $out .= icalLine('DESCRIPTION', icalEscape(implode("\n", $descParts)));
    }

    // URL
    if (!empty($b['link'])) {
        $out .= icalLine('URL', $b['link']);
    }

    // Category
    $catId = isset($b['categoryID']) ? $b['categoryID'] : 'default';
    if ($catId !== 'default' && isset($catIdToName[$catId])) {
        $out .= icalLine('CATEGORIES', icalEscape($catIdToName[$catId]));
    }

    $out .= "END:VEVENT\r\n";
}

$out .= "END:VCALENDAR\r\n";

echo $out;
