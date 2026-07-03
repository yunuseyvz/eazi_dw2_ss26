#!/usr/bin/env node
/*
 * Mock server for the embedded LED UI — runs without an ESP32.
 *
 * Extracts the HTML from ui.h, serves it at / and /ui,
 * and implements a mock /state endpoint in memory.
 *
 * Usage:  node firmware/mock-server.js
 * Open:   http://localhost:8080
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const UI_FILE = path.join(__dirname, 'led-controller', 'ui.h');

// --- Extract HTML from ui.h ---
const raw = fs.readFileSync(UI_FILE, 'utf8');
const startMarker = 'R"rawliteral(';
const endMarker = ')rawliteral"';
const s = raw.indexOf(startMarker);
const e = raw.indexOf(endMarker, s + startMarker.length);
if (s < 0 || e < 0) {
  console.error('Could not find HTML in ui.h');
  process.exit(1);
}
const HTML = raw.slice(s + startMarker.length, e);

// --- Mock state (mirrors firmware boot default) ---
let state = {
  state: 1,
  brightness: 40,
  numPixels: 1000,
  s1: { on: true, color: [0, 0, 255], effect: 'solid' },
  s2: { on: true, color: [255, 255, 255], effect: 'solid' },
  s3: { on: true, color: [0, 0, 0], effect: 'solid' },
};

const VALID_EFFECTS = ['solid', 'blink', 'fade', 'chase', 'rainbow', 'sparkle'];
const SIMPLE_EFFECTS = ['solid', 'blink'];

function sanitizeEffect(e, simple) {
  const allowed = simple ? SIMPLE_EFFECTS : VALID_EFFECTS;
  return allowed.includes(e) ? e : 'solid';
}

function applyCycle(s) {
  state.state = s;
  if (s === 1) {
    state.s1 = { on: false, color: [0, 0, 255], effect: 'solid' };
    state.s2 = { on: true, color: [255, 255, 255], effect: 'solid' };
    state.s3 = { on: false, color: [0, 0, 0], effect: 'solid' };
  } else if (s === 2) {
    state.s1 = { on: true, color: [0, 0, 255], effect: 'solid' };
    state.s2 = { on: false, color: [255, 255, 255], effect: 'solid' };
    state.s3 = { on: true, color: [0, 0, 0], effect: 'solid' };
  } else {
    state.s1 = { on: false, color: [0, 0, 255], effect: 'solid' };
    state.s2 = { on: false, color: [255, 255, 255], effect: 'solid' };
    state.s3 = { on: false, color: [0, 0, 0], effect: 'solid' };
  }
}

function handlePost(body) {
  let d;
  try { d = JSON.parse(body); } catch { return { error: 'invalid JSON' }; }

  if (typeof d.state === 'number' && d.state >= 0 && d.state <= 2) {
    applyCycle(d.state);
  }
  if (typeof d.brightness === 'number' && d.brightness >= 0 && d.brightness <= 255) {
    state.brightness = d.brightness;
  }
  if (typeof d.numPixels === 'number' && d.numPixels > 0 && d.numPixels <= 2000) {
    state.numPixels = d.numPixels;
  }

  for (const n of [1, 2, 3]) {
    const key = 's' + n;
    const simple = n === 3;
    if (typeof d[key + '_on'] === 'boolean') {
      state[key].on = d[key + '_on'];
      if (state[key].on && state[key].effect === 'off') state[key].effect = 'solid';
    }
    if (Array.isArray(d[key + '_color']) && d[key + '_color'].length === 3 && !simple) {
      state[key].color = d[key + '_color'].map(v => v | 0);
    }
    if (typeof d[key + '_effect'] === 'string') {
      state[key].effect = sanitizeEffect(d[key + '_effect'], simple);
    }
  }

  return state;
}

// --- HTTP server ---
const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Serve embedded UI
  if ((url.pathname === '/' || url.pathname === '/ui') && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(HTML);
    return;
  }

  // Plain-text help
  if (url.pathname === '/help' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Mock LED controller\nGET /ui — web UI\nGET /state — current state\nPOST /state — update state\n');
    return;
  }

  // State endpoint
  if (url.pathname === '/state') {
    if (req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(state));
      return;
    }
    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        const result = handlePost(body);
        console.log(`POST /state  ${body}`);
        console.log(`  → state=${state.state} s1.on=${state.s1.on} s2.on=${state.s2.on} s3.on=${state.s3.on}`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      });
      return;
    }
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('not found');
});

server.listen(PORT, () => {
  console.log(`\n  Mock LED controller running.`);
  console.log(`  Open http://localhost:${PORT} in your browser.\n`);
  console.log(`  Mock state: all strips ON (boot default).`);
  console.log(`  Every POST /state is logged here.\n`);
  console.log(`  Press Ctrl+C to stop.\n`);
});
