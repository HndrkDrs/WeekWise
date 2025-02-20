<?php

// show a form to enter the password
if (!isset($_POST['password']) || $_POST['password'] == "") {
    echo '<style>
            body {
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
            }
            box {
                border: 1px solid #ccc;
                padding: 20px;
                box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
                background-color: #f9f9f9;
                border-radius: 5px;
                align-items: center;
                max-width: 400px;
            }

          </style>
            <box>
            <h1>Hallen-Belegungsplan</h1>
            <p>Der nächste Schritt installiert das Tool im aktuellen Verzeichnis.</p>   
            <p>Bitte geben Sie das Passwort ein, um die Installation abzuschließen. Mit diesem Passwort kannst du dich im Tool einloggen um Termine zu erstellen, das Layout anzupassen und vieles mehr.</p>
            <form method="post">
                <input type="password" name="password" placeholder="Password">
                <input type="submit" value="Bestätigen und Installieren">
            </form>
            </box>';
    exit;
}

// Get the password from the form
$password = $_POST['password'];

// Check if index.html already exists
if (file_exists('index.html')) {
    echo '<h1>Fehler</h1><p>Es existiert bereits eine Datei namens "index.html" im aktuellen Verzeichnis. Bitte lösche diese Datei und starte den Installationsprozess erneut.</p>';
    exit;
}

// set path
$sources_url = 'https://dev0.sv-wolken.de/aasource/cur/';

// list of files
$files = [
    'comp.zip',
];

// create an array with the concatenated URLs
$urls = array_map(function($file) use ($sources_url) {
    return $sources_url . $file;
}, $files);

// create download urls
foreach ($urls as $url) {
    $content = file_get_contents($url);
    $filename = basename($url); // get the file name from the URL
    file_put_contents($filename, $content);
}

foreach ($files as $filename) {
    if (substr($filename, -4) === '.zip') {
        $zip = new ZipArchive();
        if ($zip->open($filename) === true) {
            $zip->extractTo('.');
            $zip->close();
        }
    }
}



function stringToHash($string) {
  $hash = 0;
  if (strlen($string) == 0) return $hash;
  for ($i = 0; $i < strlen($string); $i++) {
    $char = ord($string[$i]);
    $hash = (($hash << 5) - $hash) + $char;
    $hash = $hash & $hash;
  }
  return $hash;
}

// Initialize settings.json file with the password
$settings = [
    'title' => 'Wochenplan',
    'headerColor' => '#2f4f7f',
    'secondaryColor' => '#ff9500',
    'startHour' => '8',
    'endHour' => '21',
    'bookingColors' => [
        ['name' => 'Demo-Kategorie', 'color' => 'rgb(33, 150, 243)', 'id' => '2k6ig92hxky4g8rqujhj4m'],
    ],
    'loginhash' => stringToHash($password),
];

// Initialize empty booking.json file
$bookings = [];
file_put_contents('bookings.json', json_encode($bookings));


// Save settings to file
file_put_contents('settings.json', json_encode($settings));

// Wait till task is done
sleep(1);

// Redirect to the tool page
header('Location: index.html');

// alle zip archive löschen
foreach ($files as $filename) {
    if (substr($filename, -4) === '.zip') {
        unlink($filename);
    }
}

// erstelle den inhalt einer .htaccess die alle Dateien versteckt außer index.html und save_json.php
$htaccess = "RewriteEngine On
RewriteBase /
RewriteRule ^$ index.html [L]
RewriteRule ^save_json\.php$ - [L]
";
file_put_contents('.htaccess', $htaccess);


//install.php löschen
unlink('install.php')


?>