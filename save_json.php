<?php
/**
 * WeekWise 2.0 - JSON Save/Load API
 * 
 * Provides secure file operations for storing and retrieving
 * settings and bookings data.
 */

// Allowed filenames (whitelist approach for security)
$allowedFiles = ['settings.json', 'bookings.json'];

// Get action and filename from query parameters
$action = isset($_GET['action']) ? $_GET['action'] : '';
$filename = isset($_GET['filename']) ? $_GET['filename'] : '';

// Validate filename against whitelist (prevents path traversal attacks)
if (!in_array($filename, $allowedFiles)) {
    header('HTTP/1.1 400 Bad Request');
    header('Content-Type: text/plain');
    echo 'Ungültiger Dateiname';
    exit;
}

// Handle SAVE action
if ($action === 'save') {
    // Read JSON data from request body
    $rawData = file_get_contents('php://input');
    $data = json_decode($rawData, true);
    
    // Validate JSON
    if ($data === null && json_last_error() !== JSON_ERROR_NONE) {
        header('HTTP/1.1 400 Bad Request');
        header('Content-Type: text/plain');
        echo 'Ungültige JSON-Daten';
        exit;
    }
    
    // Try to write the file
    $fp = fopen($filename, 'w');
    if (!$fp) {
        header('HTTP/1.1 500 Internal Server Error');
        header('Content-Type: text/plain');
        echo 'Fehler beim Öffnen der Datei';
        exit;
    }
    
    // Lock file for writing
    if (flock($fp, LOCK_EX)) {
        $written = fwrite($fp, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        flock($fp, LOCK_UN);
        fclose($fp);
        
        if ($written === false) {
            header('HTTP/1.1 500 Internal Server Error');
            header('Content-Type: text/plain');
            echo 'Fehler beim Schreiben der Datei';
            exit;
        }
    } else {
        fclose($fp);
        header('HTTP/1.1 500 Internal Server Error');
        header('Content-Type: text/plain');
        echo 'Fehler beim Sperren der Datei';
        exit;
    }
    
    header('Content-Type: text/plain');
    echo 'OK';
    exit;
}

// Handle LOAD action
if ($action === 'load') {
    // Check if file exists
    if (!file_exists($filename)) {
        // Return empty data structure based on file type
        header('Content-Type: application/json');
        if ($filename === 'bookings.json') {
            echo '[]';
        } else {
            echo 'null';
        }
        exit;
    }
    
    // Read and return file contents
    $data = file_get_contents($filename);
    if ($data === false) {
        header('HTTP/1.1 500 Internal Server Error');
        header('Content-Type: text/plain');
        echo 'Fehler beim Lesen der Datei';
        exit;
    }
    
    // Validate JSON before returning
    $decoded = json_decode($data);
    if ($decoded === null && json_last_error() !== JSON_ERROR_NONE) {
        // File exists but contains invalid JSON
        header('HTTP/1.1 500 Internal Server Error');
        header('Content-Type: text/plain');
        echo 'Ungültige JSON-Daten in Datei';
        exit;
    }
    
    header('Content-Type: application/json');
    echo $data;
    exit;
}

// Invalid action
header('HTTP/1.1 400 Bad Request');
header('Content-Type: text/plain');
echo 'Ungültiger Aufruf';
exit;
