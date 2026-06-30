<?php
/**
 * WeekWise – Test Orchestrator
 *
 * Runs both PHP tests and Node.js JS tests.
 * Usage: php run.php
 * Exit code: 0 = all passed, 1 = at least one failure
 *
 * Orchestrated by run.ps1 (PowerShell) for one-command runs.
 */

$startTime = microtime(true);
$exitCode = 0;

echo "\033[1;36m" . str_repeat('=', 60) . "\033[0m\n";
echo "\033[1;36m WeekWise Test Suite\033[0m\n";
echo "\033[1;36m " . date('Y-m-d H:i:s') . "\033[0m\n";
echo "\033[1;36m" . str_repeat('=', 60) . "\033[0m\n\n";

// ── PHP Tests ─────────────────────────────────────────

echo "\033[1;33m── PHP Tests ──\033[0m\n\n";

$phpTestDir = __DIR__ . '/tests/php';
$phpTestFiles = glob($phpTestDir . '/test_*.php');

if (count($phpTestFiles) === 0) {
    echo "  \033[33m⚠ No PHP test files found.\033[0m\n\n";
} else {
    foreach ($phpTestFiles as $file) {
        $filename = basename($file);
        echo "\033[1m$filename\033[0m\n";

        $descriptorspec = [
            0 => ['pipe', 'r'],
            1 => ['pipe', 'w'],
            2 => ['pipe', 'w']
        ];
        $phpBin = defined('PHP_BINARY') ? PHP_BINARY : 'php';
        $proc = proc_open('"' . $phpBin . '" "' . $file . '"', $descriptorspec, $pipes);
        if (is_resource($proc)) {
            fclose($pipes[0]);
            $stdout = stream_get_contents($pipes[1]);
            $stderr = stream_get_contents($pipes[2]);
            fclose($pipes[1]);
            fclose($pipes[2]);
            $returnCode = proc_close($proc);

            echo $stdout;
            if ($stderr) {
                echo "\033[31m$stderr\033[0m";
            }
            if ($returnCode !== 0) {
                $exitCode = 1;
            }
        } else {
            echo "  \033[31m✗ Failed to start PHP process\033[0m\n";
            $exitCode = 1;
        }
        echo "\n";
    }
}

// ── JS Tests ──────────────────────────────────────────

echo "\033[1;33m── JS Tests (Node.js) ──\033[0m\n\n";

// Check if Node.js is available
$nodeCheck = shell_exec('node --version 2>&1');
if ($nodeCheck === null || $nodeCheck === '') {
    echo "  \033[31m✗ Node.js is not available. Skipping JS tests.\033[0m\n";
    $exitCode = 1;
} else {
    echo "  Node.js version: " . trim($nodeCheck) . "\n\n";

    $jsRunner = __DIR__ . '/tests/js/runner.js';
    $descriptorspec = [
        0 => ['pipe', 'r'],
        1 => ['pipe', 'w'],
        2 => ['pipe', 'w']
    ];
    $proc = proc_open('node "' . $jsRunner . '"', $descriptorspec, $pipes);
    if (is_resource($proc)) {
        fclose($pipes[0]);
        // Stream output in real-time
        while (!feof($pipes[1])) {
            $line = fgets($pipes[1]);
            if ($line !== false) echo $line;
        }
        fclose($pipes[1]);

        $stderr = stream_get_contents($pipes[2]);
        fclose($pipes[2]);
        $returnCode = proc_close($proc);

        if ($stderr) {
            echo "\n\033[31m$stderr\033[0m";
        }
        if ($returnCode !== 0) {
            $exitCode = 1;
        }
    } else {
        echo "  \033[31m✗ Failed to start Node.js process\033[0m\n";
        $exitCode = 1;
    }
}

// ── Summary ────────────────────────────────────────────

$elapsed = round(microtime(true) - $startTime, 3);
echo "\n\033[1;36m" . str_repeat('=', 60) . "\033[0m\n";
if ($exitCode === 0) {
    echo "\033[1;32m ALL TESTS PASSED\033[0m\n";
} else {
    echo "\033[1;31m SOME TESTS FAILED\033[0m\n";
}
echo "\033[1;36m Duration: {$elapsed}s\033[0m\n";
echo "\033[1;36m" . str_repeat('=', 60) . "\033[0m\n";

exit($exitCode);