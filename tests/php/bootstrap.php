<?php
/**
 * WeekWise – PHP Test Bootstrap
 * Minimal assertion framework for testing PHP endpoints.
 * No dependencies required.
 */

$__test_results = [
    'passed' => 0,
    'failed' => 0,
    'skipped' => 0,
    'failures' => [],
];

$__current_test = '';

function test($name, \Closure $fn) {
    global $__test_results, $__current_test;
    $__current_test = $name;
    try {
        $fn();
        $__test_results['passed']++;
        echo "  \033[32m✓\033[0m $name\n";
    } catch (\Throwable $e) {
        $__test_results['failed']++;
        $__test_results['failures'][] = ['test' => $name, 'error' => $e->getMessage()];
        echo "  \033[31m✗\033[0m $name\n";
        echo "    \033[31m{$e->getMessage()}\033[0m\n";
    }
}

function assertEqual($actual, $expected, $msg = '') {
    if ($actual !== $expected) {
        $details = $msg ? "$msg – " : '';
        $details .= "expected " . var_export($expected, true) . ", got " . var_export($actual, true);
        throw new \AssertionError($details);
    }
}

function assertTrue($value, $msg = '') {
    if ($value !== true) {
        $details = $msg ? "$msg – " : '';
        $details .= "expected true, got " . var_export($value, true);
        throw new \AssertionError($details);
    }
}

function assertFalse($value, $msg = '') {
    if ($value !== false) {
        $details = $msg ? "$msg – " : '';
        $details .= "expected false, got " . var_export($value, true);
        throw new \AssertionError($details);
    }
}

function assertArrayHasKey($key, $array, $msg = '') {
    if (!is_array($array) || !array_key_exists($key, $array)) {
        $details = $msg ? "$msg – " : '';
        $details .= "expected array to have key '$key'";
        throw new \AssertionError($details);
    }
}

function assertNotEmpty($value, $msg = '') {
    if (empty($value)) {
        $details = $msg ? "$msg – " : '';
        $details .= "expected non-empty value";
        throw new \AssertionError($details);
    }
}

function assertContains($needle, $haystack, $msg = '') {
    if (is_string($haystack)) {
        if (strpos($haystack, $needle) === false) {
            $details = $msg ? "$msg – " : '';
            $details .= "expected string to contain '$needle'";
            throw new \AssertionError($details);
        }
    } else {
        throw new \InvalidArgumentException('assertContains currently only supports strings');
    }
}

function assertNotContains($needle, $haystack, $msg = '') {
    if (is_string($haystack)) {
        if (strpos($haystack, $needle) !== false) {
            $details = $msg ? "$msg – " : '';
            $details .= "expected string NOT to contain '$needle'";
            throw new \AssertionError($details);
        }
    } else {
        throw new \InvalidArgumentException('assertNotContains currently only supports strings');
    }
}

/**
 * Print the final test summary and return exit code.
 * @return int 0 if all passed, 1 if failures
 */
function finishTests() {
    global $__test_results;
    $total = $__test_results['passed'] + $__test_results['failed'];
    echo "\n" . str_repeat('=', 40) . "\n";
    echo "Results: {$__test_results['passed']} passed, {$__test_results['failed']} failed";

    if ($__test_results['failed'] > 0) {
        echo "\n\nFailures:\n";
        foreach ($__test_results['failures'] as $failure) {
            echo "  \033[31m✗ {$failure['test']}\033[0m\n";
            echo "    {$failure['error']}\n";
        }
    }

    echo str_repeat('=', 40) . "\n";
    return $__test_results['failed'] > 0 ? 1 : 0;
}