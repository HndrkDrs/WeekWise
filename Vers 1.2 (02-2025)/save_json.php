<?php
// Save API endpoint
if ($_GET['action'] == 'save') {
  $filename = $_GET['filename'];
  $data = json_decode(file_get_contents('php://input'), true);
  $fp = fopen($filename, 'w');
  if (!$fp) {
    header('HTTP/1.1 500 Internal Server Error');
    echo 'Fehler beim Öffnen der Datei';
    exit;
  }
  $written = fwrite($fp, json_encode($data));
  fclose($fp);
  if ($written === false) {
    header('HTTP/1.1 500 Internal Server Error');
    echo 'Fehler beim Schreiben der Datei';
    exit;
  }
  header('Content-Type: text/plain');
  echo 'OK';
  exit;

// Load API endpoint
} elseif ($_GET['action'] == 'load') {
  $filename = $_GET['filename'];
  $data = json_decode(file_get_contents($filename), true);
  header('Content-Type: application/json');
  echo json_encode($data);
  exit;

// Error handling
} else {
  header('HTTP/1.1 400 Bad Request');
  echo 'Ungültiger Aufruf';
  exit;
}