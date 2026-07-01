/**
 * WeekWise – Minimal Node.js Test Runner
 * No dependencies. Runs all test_*.js files in this directory.
 *
 * Strategy:
 * 1. Patch global with browser API stubs
 * 2. eval() app.js so all functions become global
 * 3. Define test() / assert*() helpers globally
 * 4. eval() each test_*.js file sequentially
 * 5. Print summary, exit 0 or 1
 */

const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;
const failures = [];

// ── Browser API stubs ─────────────────────────────────

global.window = global;

function makeTextContainer() {
    const el = {
        _text: '',
        _html: '',
        style: {},
        classList: {
            add() {},
            remove() {},
            toggle() {},
            contains() { return false; }
        },
        appendChild() {},
        addEventListener() {},
        setAttribute() {},
        remove() {},
        closest() { return null; },
        querySelector() { return null; },
        querySelectorAll() { return []; },
        dataset: {},
        get textContent() { return this._text; },
        set textContent(v) {
            this._text = v;
            const s = String(v);
            // Simulate real DOM: innerHTML is HTML-escaped textContent
            // Order matters: & first to avoid double-escaping
            // Use hex escapes to prevent formatter from eating HTML entities
            var escaped = '';
            for (var i = 0; i < s.length; i++) {
                var ch = s[i];
                if (ch === '&') escaped += '\x26amp;';
                else if (ch === '<') escaped += '\x26lt;';
                else if (ch === '>') escaped += '\x26gt;';
                else if (ch === '"') escaped += '\x26quot;';
                else if (ch === "'") escaped += '\x26#039;';
                else escaped += ch;
            }
            this._html = escaped;
        },
        get innerHTML() { return this._html || ''; },
        set innerHTML(v) { this._html = v; }
    };
    return el;
}

global.document = {
    body: {
        classList: {
            add() {},
            remove() {}
        }
    },
    createElement: makeTextContainer,
    querySelector() { return null; },
    querySelectorAll() { return []; },
    getElementById() { return null; },
    addEventListener() {},
    head: { appendChild() {} },
    documentElement: {
        style: {
            setProperty() {},
            getPropertyValue() { return ''; }
        }
    }
};

global.localStorage = {
    _data: {},
    getItem(k) { return this._data[k] || null; },
    setItem(k, v) { this._data[k] = String(v); },
    removeItem(k) { delete this._data[k]; }
};

global.fetch = async function () {
    return { ok: true, json: async () => ({}), text: async () => 'OK', status: 200 };
};

global.URLSearchParams = function (s) {
    this._params = new Map();
    if (s) {
        s.replace(/^\?/, '').split('&').forEach(function (p) {
            var parts = p.split('=');
            if (parts[0]) {
                this._params.set(
                    decodeURIComponent(parts[0]),
                    decodeURIComponent(parts[1] || 'true')
                );
            }
        }.bind(this));
    }
    this.get = function (k) { return this._params.get(k) || null; };
};

global.alert = function () {};
global.confirm = function () { return true; };
global.setTimeout = function (fn) { if (typeof fn === 'function') fn(); };
global.getComputedStyle = function () { return { getPropertyValue() { return ''; } }; };
global.crypto = { randomUUID() { return '00000000-0000-0000-0000-000000000000'; } };
global.location = { search: '', pathname: '/WeekWise/', protocol: 'https:', host: 'localhost' };
global.navigator = { clipboard: { writeText() { return Promise.resolve(); } } };
global.FormData = function () {};
global.FileReader = function () { this.readAsText = function () {}; };
global.XMLHttpRequest = function () {};
global.requestAnimationFrame = function (fn) { fn(); };
global.Image = function () {};
global.Event = function () {};

// ── Load app.js ────────────────────────────────────────

const appSrc = fs.readFileSync(
    path.join(__dirname, '..', '..', 'app-legacy.js'),
    'utf-8'
);

try {
    eval(appSrc);
    console.log('[runner] app.js loaded successfully\n');
} catch (e) {
    console.log('[runner] WARNING: app.js top-level eval had errors (expected for DOM code):');
    console.log('  ' + e.message + '\n');
}

// ── Assertion helpers ─────────────────────────────────

global.test = function test(name, fn) {
    try {
        fn();
        console.log('  \x1b[32m\u2713\x1b[0m ' + name);
        passed++;
    } catch (e) {
        console.log('  \x1b[31m\u2717\x1b[0m ' + name);
        console.log('    \x1b[31m' + e.message + '\x1b[0m');
        failed++;
        failures.push({ test: name, error: e.message });
    }
};

global.assertEqual = function assertEqual(actual, expected, msg) {
    if (actual !== expected) {
        var details = msg ? msg + ' - ' : '';
        throw new Error(details + 'expected ' + JSON.stringify(expected) + ', got ' + JSON.stringify(actual));
    }
};

global.assertTrue = function assertTrue(value, msg) {
    if (value !== true) {
        var details = msg ? msg + ' - ' : '';
        throw new Error(details + 'expected true, got ' + JSON.stringify(value));
    }
};

global.assertFalse = function assertFalse(value, msg) {
    if (value !== false) {
        var details = msg ? msg + ' - ' : '';
        throw new Error(details + 'expected false, got ' + JSON.stringify(value));
    }
};

global.assertNotEmpty = function assertNotEmpty(value, msg) {
    if (!value || (Array.isArray(value) && value.length === 0)) {
        var details = msg ? msg + ' - ' : '';
        throw new Error(details + 'expected non-empty value');
    }
};

global.assertContains = function assertContains(needle, haystack, msg) {
    if (typeof haystack === 'string' && haystack.indexOf(needle) === -1) {
        var details = msg ? msg + ' - ' : '';
        throw new Error(details + 'expected string to contain "' + needle + '"');
    }
};

global.assertNotContains = function assertNotContains(needle, haystack, msg) {
    if (typeof haystack === 'string' && haystack.indexOf(needle) !== -1) {
        var details = msg ? msg + ' - ' : '';
        throw new Error(details + 'expected string NOT to contain "' + needle + '"');
    }
};

global.assertType = function assertType(value, type, msg) {
    var actualType = Array.isArray(value) ? 'array' : typeof value;
    if (actualType !== type) {
        var details = msg ? msg + ' - ' : '';
        throw new Error(details + 'expected type ' + type + ', got ' + actualType);
    }
};

// ── Run all test files ────────────────────────────────

var testDir = __dirname;
var testFiles = fs.readdirSync(testDir)
    .filter(function (f) { return f.startsWith('test_') && f.endsWith('.js'); })
    .sort();

if (testFiles.length === 0) {
    console.log('No test files found.');
    process.exit(0);
}

testFiles.forEach(function (file) {
    console.log('\n' + '\u2500'.repeat(40));
    console.log(' ' + file);
    console.log('\u2500'.repeat(40));
    var testSrc = fs.readFileSync(path.join(testDir, file), 'utf-8');
    try {
        eval(testSrc);
    } catch (e) {
        console.log('  \x1b[31m\u2717 SCRIPT ERROR: ' + e.message + '\x1b[0m');
        failed++;
    }
});

// ── Summary ────────────────────────────────────────────

console.log('\n' + '='.repeat(40));
console.log('Results: ' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) {
    console.log('\nFailures:');
    failures.forEach(function (f) {
        console.log('  \x1b[31m\u2717 ' + f.test + '\x1b[0m');
        console.log('    ' + f.error);
    });
}
console.log('='.repeat(40));

process.exit(failed > 0 ? 1 : 0);