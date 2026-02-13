<?php
/**
 * WeekWise 2.0 - Installer
 * 
 * This installer sets up WeekWise on any standard webspace.
 * Requirements: PHP 5.6+ with ZipArchive extension
 */

// Show installation form if password not yet provided
if (!isset($_POST['password']) || $_POST['password'] === '') {
    showInstallForm();
    exit;
}

// Get the password from the form
$password = isset($_POST['password']) ? trim((string)$_POST['password']) : '';

// Check if installation is to clean space,
// update an existing installation
// or working in a directory containing other files.

// collect all files (no folders) except install.php
$filesInDir = [];
foreach (array_diff(scandir('.'), ['.', '..', 'install.php']) as $item) {
    if (is_file($item)) {
        $filesInDir[] = $item;
    }
}

// Check if index.html already exists
$fileExists = file_exists('index.html');

// Check if settings.json already exists
$settingsExists = file_exists('settings.json');

// Check if bookings.json already exists
$bookingsExists = file_exists('bookings.json');

// Logic to determine installation type
if ($fileExists && $settingsExists && $bookingsExists) {
    // Existing installation detected
    showError('Eine bestehende Installation von WeekWise wurde erkannt. Möchten sie die Anwendung neu installieren? Dann löschen Sie die index.html und starten Sie die Installation neu. Möchten sie die Anwendung aktualisieren? Sichern sie bookings.json und settings.json in einem Unterverzeichnis und überschreiben Sie damit die neu installierten Dateien nach der Installation. (Termine können auch uber die UI importiert/exportiert werden)');
    exit;
}

// Any other files present -> likely not an empty target directory
if (!empty($filesInDir)) {
    showError('Das Verzeichnis ist nicht leer. Möglicherweise befindet sich eine andere Anwendung/Website in diesem Verzeichnis. Bitte zunächst prüfen und die Dateien löschen.');
    exit;
}

// Source URL for installation files (files are now in root of main branch)
$sourceUrl = 'https://raw.githubusercontent.com/hndrk-fegko/WeekWise/main/';

// List of files to download
$files = [
    'index.html',
    'style.css',
    'app.js',
    'save_json.php',
    'ico/add.svg',
    'ico/del.svg',
    'ico/edit.svg',
    'ico/link.svg',
    'ico/print.svg',
    'ico/settings.svg',
    'ico/chevron-left.svg',
    'ico/chevron-right.svg',
    'ico/favicon.ico'
];

// Create ico directory
if (!file_exists('ico')) {
    mkdir('ico', 0755, true);
}

// Download all files with proper error handling
$downloadErrors = [];
$streamContext = stream_context_create([
    'http' => [
        'timeout' => 30,
        'ignore_errors' => false
    ],
    'ssl' => [
        'verify_peer' => true,
        'verify_peer_name' => true
    ]
]);

foreach ($files as $file) {
    $url = $sourceUrl . $file;
    $content = file_get_contents($url, false, $streamContext);
    
    if ($content === false) {
        $downloadErrors[] = $file;
        continue;
    }
    
    $written = file_put_contents($file, $content);
    if ($written === false) {
        $downloadErrors[] = $file . ' (write error)';
    }
}

// Report download errors
if (!empty($downloadErrors)) {
    showError('Einige Dateien konnten nicht heruntergeladen werden: ' . implode(', ', $downloadErrors) . '<br><br>Bitte versuchen Sie es später erneut oder laden Sie die Dateien manuell herunter.');
    exit;
}

// Hash function matching the JavaScript implementation
function stringToHash($string) {
    $hash = 0;
    $len = strlen($string);
    if ($len === 0) return $hash;
    
    for ($i = 0; $i < $len; $i++) {
        $char = ord($string[$i]);
        $hash = (($hash << 5) - $hash) + $char;
        // Convert to 32-bit signed integer (same as JavaScript)
        $hash = $hash & 0xFFFFFFFF;
        if ($hash > 0x7FFFFFFF) {
            $hash -= 0x100000000;
        }
    }
    return (int)$hash;
}

// Initialize settings.json with password and default values
$settings = [
    'title' => 'Wochenplan',
    'headerColor' => '#2196F3',
    'secondaryColor' => '#FFC107',
    'startHour' => '8',
    'endHour' => '22',
    'bookingColors' => [],
    'loginhash' => stringToHash($password)
];

// Save settings
file_put_contents('settings.json', json_encode($settings, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

// Initialize empty bookings
file_put_contents('bookings.json', '[]');

// Create .htaccess for security (optional, Apache only)
$htaccess = <<<HTACCESS
# WeekWise 2.0 Security Rules
<FilesMatch "\.(json)$">
    <IfModule mod_authz_core.c>
        Require all denied
    </IfModule>
    <IfModule !mod_authz_core.c>
        Order deny,allow
        Deny from all
    </IfModule>
</FilesMatch>

# Allow access to save_json.php
<Files "save_json.php">
    <IfModule mod_authz_core.c>
        Require all granted
    </IfModule>
    <IfModule !mod_authz_core.c>
        Allow from all
    </IfModule>
</Files>
HTACCESS;

file_put_contents('.htaccess', $htaccess);

// Short delay to ensure files are written
usleep(500000);

// Delete installer
@unlink('install.php');

// Redirect to the application
header('Location: index.html');
exit;

// ============================================
// Helper Functions
// ============================================

function showInstallForm() {
    echo <<<HTML
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WeekWise 2.0 - Installation</title>
    <style>
        * {
            box-sizing: border-box;
        }
        body {
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            padding: 20px;
            font-family: Arial, sans-serif;
            background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%);
        }
        .install-box {
            background: white;
            padding: 40px;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            max-width: 450px;
            width: 100%;
        }
        h1 {
            margin: 0 0 10px 0;
            color: #333;
            font-size: 1.8em;
        }
        .version {
            color: #2196F3;
            font-size: 0.9em;
            margin-bottom: 20px;
        }
        p {
            color: #666;
            line-height: 1.6;
            margin-bottom: 20px;
        }
        .form-group {
            margin-bottom: 20px;
        }
        label {
            display: block;
            margin-bottom: 8px;
            font-weight: 500;
            color: #333;
        }
        input[type="password"] {
            width: 100%;
            padding: 12px 15px;
            border: 2px solid #ddd;
            border-radius: 8px;
            font-size: 16px;
            transition: border-color 0.2s;
        }
        input[type="password"]:focus {
            outline: none;
            border-color: #2196F3;
        }
        .requirements {
            font-size: 0.85em;
            color: #888;
            margin-top: 8px;
        }
        button {
            width: 100%;
            padding: 14px;
            background: #2196F3;
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 500;
            cursor: pointer;
            transition: background 0.2s;
        }
        button:hover {
            background: #1976D2;
        }
        .features {
            background: #f5f5f5;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 25px;
        }
        .features h4 {
            margin: 0 0 10px 0;
            color: #333;
            font-size: 0.95em;
        }
        .features ul {
            margin: 0;
            padding-left: 20px;
            color: #666;
            font-size: 0.9em;
        }
        .features li {
            margin-bottom: 5px;
        }
    </style>
</head>
<body>
    <div class="install-box">
        <h1>WeekWise</h1>
        <div class="version">Version 2.0</div>
        
        <div class="features">
            <h4>Neue Features:</h4>
            <ul>
                <li>Überlappende Termine werden nebeneinander angezeigt</li>
                <li>iFrame-Einbettung mit Filteroptionen</li>
                <li>Verbesserte Mobile-Ansicht</li>
                <li>Automatische Textfarben-Anpassung</li>
            </ul>
        </div>
        
        <p>Der nächste Schritt installiert WeekWise im aktuellen Verzeichnis. Bitte legen Sie ein Passwort für den Admin-Zugang fest.</p>
        
        <form method="post">
            <div class="form-group">
                <label for="password">Admin-Passwort</label>
                <input type="password" id="password" name="password" placeholder="Sicheres Passwort eingeben" required>
                <div class="requirements">Mind. 8 Zeichen, mit Groß-/Kleinbuchstaben und Zahlen</div>
            </div>
            <button type="submit">Installieren</button>
        </form>
    </div>
</body>
</html>
HTML;
}

function showError($message) {
    echo <<<HTML
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WeekWise 2.0 - Fehler</title>
    <style>
        body {
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            padding: 20px;
            font-family: Arial, sans-serif;
            background: #f44336;
        }
        .error-box {
            background: white;
            padding: 40px;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            max-width: 450px;
            width: 100%;
            text-align: center;
        }
        h1 {
            color: #f44336;
            margin-bottom: 20px;
        }
        p {
            color: #666;
            line-height: 1.6;
        }
        a {
            display: inline-block;
            margin-top: 20px;
            padding: 12px 24px;
            background: #2196F3;
            color: white;
            text-decoration: none;
            border-radius: 8px;
        }
        a:hover {
            background: #1976D2;
        }
    </style>
</head>
<body>
    <div class="error-box">
        <h1>Installationsfehler</h1>
        <p>$message</p>
        <a href="install.php">Erneut versuchen</a>
    </div>
</body>
</html>
HTML;
}
?>
