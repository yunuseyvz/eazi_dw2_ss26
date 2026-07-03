/*
 * LED-Strip-Controller — Board-Prototyp (Design Workshop 2)
 * Drei Streifen: zwei WS2812B + ein 5V-Relais für einfache LEDs.
 *
 * Zustände (Cycle):
 *   0 = alles AUS
 *   1 = Strip 1 (Umrandung, blau) + Strip 3 (Rollstuhl-Symbol, via Relais) AN, Strip 2 AUS
 *   2 = Strip 2 (Querstreifen, weiß) AN, Strip 1 + 3 AUS
 *
 * POST /state Body (alle Felder optional):
 *   {"state":0|1|2}                                  -> Cycle-Preset
 *   {"brightness":120}                                -> 0–255 (nur WS2812B)
 *   {"s1_on":true,"s1_color":[r,g,b],"s1_effect":"solid|blink|off"}
 *   {"s2_on":true,"s2_color":[r,g,b],"s2_effect":"solid|blink|off"}
 *   {"s3_on":true,"s3_effect":"solid|blink|off"}     -> nur AN/AUS (keine Farbe)
 *   {"numPixels":60}                                 -> WS2812B-Länge für beide Streifen
 *
 * Verkabelung:
 *   WS2812B-Streifen: 5V/GND ans PSU, DIN via 330Ω an GPIO 27 bzw. 26. PSU GND mit ESP GND verbinden.
 *   Relais-Modul (Berrybase HLRELM-2): VCC → 5V, GND → ESP GND, IN1 → GPIO 33.
 *     Relais-Schließer schaltet +5V zum simplen LED-Streifen durch.
 *
 * AP: SSID "Aufzug-Demo", Passwort "demo1234". IP: 192.168.4.1
 */

#include <WiFi.h>
#include <WebServer.h>
#include <Adafruit_NeoPixel.h>
#include "ui.h"

// --- User config ---------------------------------------------------------
static const char* AP_SSID     = "Aufzug-Demo";
static const char* AP_PASSWORD = "demo1234";

static const int PIN_STRIP1   = 26;   // WS2812B — Umrandung
static const int PIN_STRIP2   = 27;   // WS2812B — Querstreifen
static const int PIN_RELAY3   = 33;   // Relais für simplen Streifen (Rollstuhl-Symbol)
static const int NUMPIXELS    = 1000; // ← pro WS2812B-Streifen, anpassen
static const int DEFAULT_BRIGHTNESS = 40;

// Berrybase HLRELM-2 reagiert bei deinem Modul auf HIGH (active-HIGH).
// Bei active-LOW (Relais zieht bei LOW) auf true setzen.
static const bool INVERT_RELAY = false;

static const uint8_t STATE1_R = 255, STATE1_G = 255, STATE1_B = 255; // weiß (Querstreifen, Kein Bedarf)
static const uint8_t STATE2_R =   0, STATE2_G =   0, STATE2_B = 255; // blau (Umrandung, Rollstuhlfahrer)
// -------------------------------------------------------------------------

WebServer server(80);

Adafruit_NeoPixel strip1(NUMPIXELS, PIN_STRIP1, NEO_RGB + NEO_KHZ800);
Adafruit_NeoPixel strip2(NUMPIXELS, PIN_STRIP2, NEO_RGB + NEO_KHZ800);

struct StripCfg {
  bool on = false;
  uint8_t r = 0, g = 0, b = 0;
  String effect = "solid";
  bool blinkLit = true;
};

struct Status {
  int state = 1;
  int brightness = DEFAULT_BRIGHTNESS;
  int numPixels = NUMPIXELS;
  StripCfg s1;
  StripCfg s2;
  StripCfg s3;     // nur on + effect, color wird ignoriert
} status;

static const bool HAS_COLOR[3] = { true, true, false };
static const uint8_t EFFECTS_SIMPLE = 2; // s3 unterstützt nur solid + blink
static const char* SIMPLE_EFFECTS[] = { "solid", "blink" };

// Globaler Animations-Tick (jede loop()-Iteration +1, wraparound bei 256).
// Wird vom Renderer gelesen, um fade/chase/rainbow zu animieren.
static uint8_t animStep = 0;

void setRelay(bool on) {
  bool level = INVERT_RELAY ? !on : on;
  digitalWrite(PIN_RELAY3, level ? HIGH : LOW);
}

void applyNumPixels(int n) {
  if (n < 1) n = 1;
  if (n > 2000) n = 2000;
  if (n == status.numPixels) return;
  status.numPixels = n;
  strip1.updateLength(n);
  strip2.updateLength(n);
  Serial.print("numPixels aktualisiert: "); Serial.println(n);
}

// HSV → RGB (h: 0–255, s: 0–255, v: 0–255)
static void hsv2rgb(uint8_t h, uint8_t s, uint8_t v, uint8_t &r, uint8_t &g, uint8_t &b) {
  uint8_t region = h / 43;
  uint8_t rem    = (h - (region * 43)) * 6;
  uint8_t p = (v * (255 - s)) >> 8;
  uint8_t q = (v * (255 - ((s * rem) >> 8))) >> 8;
  uint8_t t = (v * (255 - ((s * (255 - rem)) >> 8))) >> 8;
  switch (region) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    default: r = v; g = p; b = q; break;
  }
}

void paintStrip(Adafruit_NeoPixel &strip, const StripCfg &cfg) {
  if (!cfg.on) { strip.clear(); strip.show(); return; }

  const uint8_t step = animStep;
  int n = status.numPixels;
  if (n < 1) n = 1;

  if (cfg.effect == "solid") {
    strip.setBrightness(status.brightness);
    for (int i = 0; i < n; i++) strip.setPixelColor(i, strip.Color(cfg.r, cfg.g, cfg.b));
  } else if (cfg.effect == "blink") {
    strip.setBrightness(status.brightness);
    if (cfg.blinkLit) {
      for (int i = 0; i < n; i++) strip.setPixelColor(i, strip.Color(cfg.r, cfg.g, cfg.b));
    } else {
      strip.clear();
    }
  } else if (cfg.effect == "fade") {
    // Sinus-Atmung 0 → 255 → 0 in ca. 1.3 s. Schmaler Sinus für smootheres Atmen.
    uint8_t phase = step;
    // 0..255 → sin curve 0..255..0 (nur eine Halbwelle mit Offset)
    float rad = phase * 0.0617;  // 2*pi/255 ≈ 0.0246, hier doppelt für schnellere Periode
    float s = sin(rad) * 127.5 + 127.5;
    uint16_t br = (uint16_t)(status.brightness * s / 255.0);
    if (br > 255) br = 255;
    strip.setBrightness((uint8_t) br);
    for (int i = 0; i < n; i++) strip.setPixelColor(i, strip.Color(cfg.r, cfg.g, cfg.b));
  } else if (cfg.effect == "chase") {
    strip.setBrightness(status.brightness);
    strip.clear();
    // 4 Köpfe, versetzt. Schweif 12 LEDs lang.
    const int HEADS = 4;
    const int TAIL = 12;
    for (int h = 0; h < HEADS; h++) {
      int head = (step + (h * n / HEADS)) % n;
      for (int k = 0; k < TAIL; k++) {
        int idx = head - k;
        if (idx < 0) idx += n;
        uint8_t dim = 255 - (k * 255 / TAIL);
        uint32_t c = strip.Color((cfg.r * dim) / 255, (cfg.g * dim) / 255, (cfg.b * dim) / 255);
        strip.setPixelColor(idx, c);
      }
    }
  } else if (cfg.effect == "rainbow") {
    strip.setBrightness(status.brightness);
    for (int i = 0; i < n; i++) {
      uint8_t h = (uint8_t) ((i * 256L / n) + step * 2);
      uint8_t rr, gg, bb;
      hsv2rgb(h, 255, 255, rr, gg, bb);
      strip.setPixelColor(i, strip.Color(rr, gg, bb));
    }
  } else if (cfg.effect == "sparkle") {
    // Zufällige LEDs blitzen kurz auf, Rest dunkel. Sternenhimmel.
    strip.setBrightness(status.brightness);
    strip.clear();
    // Pseudo-random: einfacher LCG mit step als seed
    uint16_t rnd = step * 1103 + 12345;
    for (int k = 0; k < 5; k++) {
      rnd = rnd * 1103 + 12345;
      int idx = rnd % n;
      rnd = rnd * 1103 + 12345;
      uint8_t bright = 100 + (rnd % 156);  // 100-255
      uint32_t c = strip.Color((cfg.r * bright) / 255, (cfg.g * bright) / 255, (cfg.b * bright) / 255);
      strip.setPixelColor(idx, c);
    }
  } else {
    // unbekannt → aus
    strip.clear();
  }
  strip.show();
}

void applyRelay() {
  // Relais unterstützt nur solid + blink; alles andere = solid an
  if (!status.s3.on) { setRelay(false); return; }
  if (status.s3.effect == "blink") setRelay(status.s3.blinkLit);
  else setRelay(true);  // solid und alle anderen
}

void applyState() {
  paintStrip(strip1, status.s1);
  paintStrip(strip2, status.s2);
  applyRelay();
}

void applyCycle(int s) {
  status.state = s;
  if (s == 1) {
    // State 1: Kein Bedarf — Querstreifen (Strip 2) weiß AN, Rest AUS
    status.s1.on = false; status.s1.effect = "solid";
    status.s2.on = true;  status.s2.r = STATE1_R; status.s2.g = STATE1_G; status.s2.b = STATE1_B; status.s2.effect = "solid";
    status.s3.on = false; status.s3.effect = "solid";
  } else if (s == 2) {
    // State 2: Rollstuhlfahrer — Umrandung (Strip 1) blau + Relais (Strip 3) AN, Querstreifen AUS
    status.s1.on = true;  status.s1.r = STATE2_R; status.s1.g = STATE2_G; status.s1.b = STATE2_B; status.s1.effect = "solid";
    status.s2.on = false; status.s2.effect = "solid";
    status.s3.on = true;  status.s3.effect = "solid";
  } else {
    status.s1.on = false; status.s1.effect = "solid";
    status.s2.on = false; status.s2.effect = "solid";
    status.s3.on = false; status.s3.effect = "solid";
  }
}

// --- tiny JSON helpers ---------------------------------------------------
bool parseIntField(const String &body, const char *key, int &out) {
  String needle = String("\"") + key + "\"";
  int i = body.indexOf(needle);
  if (i < 0) return false;
  int c = body.indexOf(':', i + needle.length());
  if (c < 0) return false;
  String tail = body.substring(c + 1); tail.trim();
  // Nur als "geparst" werten, wenn der Wert mit einer Ziffer (oder '-') beginnt.
  // Sonst sind "true"/"false" für parseBoolField reserviert.
  if (tail.length() == 0) return false;
  char first = tail[0];
  if (!isdigit(first) && first != '-') return false;
  out = tail.toInt();
  return true;
}

bool parseBoolField(const String &body, const char *key, bool &out) {
  String needle = String("\"") + key + "\"";
  int i = body.indexOf(needle);
  if (i < 0) return false;
  int c = body.indexOf(':', i + needle.length());
  if (c < 0) return false;
  String tail = body.substring(c + 1); tail.trim();
  if (tail.startsWith("true"))  { out = true;  return true; }
  if (tail.startsWith("false")) { out = false; return true; }
  int v;
  if (parseIntField(body, key, v)) { out = (v != 0); return true; }
  return false;
}

bool parseStringField(const String &body, const char *key, String &out) {
  String needle = String("\"") + key + "\"";
  int i = body.indexOf(needle);
  if (i < 0) return false;
  int c = body.indexOf(':', i + needle.length());
  if (c < 0) return false;
  int q1 = body.indexOf('"', c);
  if (q1 < 0) return false;
  int q2 = body.indexOf('"', q1 + 1);
  if (q2 < 0) return false;
  out = body.substring(q1 + 1, q2);
  return true;
}

bool parseColorField(const String &body, const char *key, uint8_t &r, uint8_t &g, uint8_t &b) {
  String needle = String("\"") + key + "\"";
  int i = body.indexOf(needle);
  if (i < 0) return false;
  int b1 = body.indexOf('[', i);
  int b2 = body.indexOf(']', b1);
  if (b1 < 0 || b2 < 0) return false;
  String arr = body.substring(b1 + 1, b2);
  int c1 = arr.indexOf(',');
  int c2 = arr.indexOf(',', c1 + 1);
  if (c1 < 0 || c2 < 0) return false;
  String rs = arr.substring(0, c1);      rs.trim();
  String gs = arr.substring(c1 + 1, c2); gs.trim();
  String bs = arr.substring(c2 + 1);     bs.trim();
  r = (uint8_t) rs.toInt();
  g = (uint8_t) gs.toInt();
  b = (uint8_t) bs.toInt();
  return true;
}

void sanitizeEffect(String &e) {
  if (e == "off") e = "solid";
  if (e != "solid" && e != "blink" && e != "fade" && e != "chase" && e != "rainbow"
   && e != "sparkle") e = "solid";
}

const char* stateName(int s) {
  if (s == 1) return "State 1: Kein Bedarf (Querstreifen)";
  if (s == 2) return "State 2: Rollstuhlfahrer (Umrandung + Symbol)";
  return "State 0: AUS";
}

void logStatus() {
  Serial.println("------------------------------------------");
  Serial.print("Zustand: "); Serial.println(stateName(status.state));
  Serial.print("Helligkeit: "); Serial.println(status.brightness);
  Serial.print("numPixels: "); Serial.println(status.numPixels);
  Serial.print("Strip 1 (Umrandung):   ");
  if (status.s1.on) {
    Serial.print("AN  Farbe="); Serial.print(status.s1.r); Serial.print(","); Serial.print(status.s1.g); Serial.print(","); Serial.print(status.s1.b);
    Serial.print("  Effekt="); Serial.println(status.s1.effect);
  } else { Serial.println("AUS"); }
  Serial.print("Strip 2 (Querstreifen):");
  if (status.s2.on) {
    Serial.print(" AN  Farbe="); Serial.print(status.s2.r); Serial.print(","); Serial.print(status.s2.g); Serial.print(","); Serial.print(status.s2.b);
    Serial.print("  Effekt="); Serial.println(status.s2.effect);
  } else { Serial.println(" AUS"); }
  Serial.print("Strip 3 (Rollstuhl-Relais): ");
  if (status.s3.on) { Serial.print("AN  Effekt="); Serial.println(status.s3.effect); }
  else { Serial.println("AUS"); }
}

// --- HTTP handlers -------------------------------------------------------
String statusJson() {
  String j = "{";
  j += "\"state\":" + String(status.state);
  j += ",\"brightness\":" + String(status.brightness);
  j += ",\"numPixels\":" + String(status.numPixels);
  j += ",\"s1\":{\"on\":"; j += (status.s1.on ? "true" : "false");
  j += ",\"color\":[" + String(status.s1.r) + "," + String(status.s1.g) + "," + String(status.s1.b) + "]";
  j += ",\"effect\":\"" + status.s1.effect + "\"}";
  j += ",\"s2\":{\"on\":"; j += (status.s2.on ? "true" : "false");
  j += ",\"color\":[" + String(status.s2.r) + "," + String(status.s2.g) + "," + String(status.s2.b) + "]";
  j += ",\"effect\":\"" + status.s2.effect + "\"}";
  j += ",\"s3\":{\"on\":"; j += (status.s3.on ? "true" : "false");
  j += ",\"effect\":\"" + status.s3.effect + "\"}";
  j += "}";
  return j;
}

void sendStatus() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "application/json", statusJson());
}

void handleState() {
  if (!server.hasArg("plain")) {
    server.send(400, "application/json", "{\"error\":\"missing body\"}");
    return;
  }
  String body = server.arg("plain");

  int s;
  if (parseIntField(body, "state", s)) {
    if (s < 0 || s > 2) { server.send(400, "application/json", "{\"error\":\"state must be 0,1,2\"}"); return; }
    applyCycle(s);
  }

  int br;
  if (parseIntField(body, "brightness", br) && br >= 0 && br <= 255) status.brightness = br;

  int np;
  if (parseIntField(body, "numPixels", np)) applyNumPixels(np);

  parseBoolField(body, "s1_on", status.s1.on);
  parseColorField(body, "s1_color", status.s1.r, status.s1.g, status.s1.b);
  String e1; if (parseStringField(body, "s1_effect", e1)) { sanitizeEffect(e1); status.s1.effect = e1; }
  if (status.s1.on && status.s1.effect == "off") status.s1.effect = "solid";

  parseBoolField(body, "s2_on", status.s2.on);
  parseColorField(body, "s2_color", status.s2.r, status.s2.g, status.s2.b);
  String e2; if (parseStringField(body, "s2_effect", e2)) { sanitizeEffect(e2); status.s2.effect = e2; }
  if (status.s2.on && status.s2.effect == "off") status.s2.effect = "solid";

  parseBoolField(body, "s3_on", status.s3.on);
  String e3; if (parseStringField(body, "s3_effect", e3)) { sanitizeEffect(e3); status.s3.effect = e3; }
  if (status.s3.on && status.s3.effect == "off") status.s3.effect = "solid";

  applyState();
  Serial.println(">>> POST /state");
  Serial.print("  Body: "); Serial.println(body);
  logStatus();
  sendStatus();
}

void handleCors() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
  server.send(204);
}

void handleUI() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send_P(200, "text/html", UI_HTML);
}

void handleHelp() {
  server.send(200, "text/plain",
    "Aufzug-Demo LED controller (3-Strip)\r\n"
    "GET  /ui       — embedded web UI (phone-friendly)\r\n"
    "POST /state {\"state\":0|1|2}                 — 0=alles aus / 1=Kein Bedarf (Querstreifen) / 2=Rollstuhlfahrer (Umrandung+Symbol)\r\n"
    "POST /state {\"s1_on\":...,\"s2_on\":...,\"s3_on\":...,...}\r\n"
    "GET  /state                                — Zustand lesen\r\n");
}

// Initial-Zustand beim Boot: alle drei Streifen an.
void applyBootDefault() {
  status.state = 1;
  // Strip 1: Umrandung blau
  status.s1.on = true;
  status.s1.r = STATE2_R; status.s1.g = STATE2_G; status.s1.b = STATE2_B;
  status.s1.effect = "solid";
  // Strip 2: Querstreifen weiß
  status.s2.on = true;
  status.s2.r = STATE1_R; status.s2.g = STATE1_G; status.s2.b = STATE1_B;
  status.s2.effect = "solid";
  // Strip 3: Rollstuhl-Relais an
  status.s3.on = true;
  status.s3.effect = "solid";
}

void setup() {
  Serial.begin(115200);
  pinMode(PIN_RELAY3, OUTPUT);
  setRelay(false);
  strip1.begin(); strip2.begin();
  applyBootDefault();
  applyState();
  Serial.println("==========================================");
  Serial.println("LED-Controller gestartet (Setup-Zustand)");
  logStatus();

  WiFi.mode(WIFI_AP);
  WiFi.softAP(AP_SSID, AP_PASSWORD);
  Serial.print("AP IP: ");
  Serial.println(WiFi.softAPIP());

  server.on("/",        HTTP_GET,     handleUI);
  server.on("/ui",      HTTP_GET,     handleUI);
  server.on("/help",     HTTP_GET,     handleHelp);
  server.on("/state",   HTTP_GET,     sendStatus);
  server.on("/state",   HTTP_POST,    handleState);
  server.on("/state",   HTTP_OPTIONS, handleCors);
  server.onNotFound([]() { server.send(404, "text/plain", "not found"); });
  server.begin();
  Serial.println("HTTP server up");
  Serial.println("==========================================");
}

unsigned long lastAnim = 0;
unsigned long lastBlink = 0;

// Rendert nur Strips, die gerade animiert werden müssen.
static void repaintAnimatedStrips() {
  if (status.s1.on && status.s1.effect != "solid") paintStrip(strip1, status.s1);
  if (status.s2.on && status.s2.effect != "solid") paintStrip(strip2, status.s2);
  if (status.s3.on && status.s3.effect == "blink") applyRelay();
}

void loop() {
  server.handleClient();

  unsigned long now = millis();

  // Blink: alle 230 ms umschalten
  if (now - lastBlink > 230) {
    lastBlink = now;
    bool anyBlink = false;
    if (status.s1.effect == "blink" && status.s1.on) { status.s1.blinkLit = !status.s1.blinkLit; anyBlink = true; }
    if (status.s2.effect == "blink" && status.s2.on) { status.s2.blinkLit = !status.s2.blinkLit; anyBlink = true; }
    if (status.s3.effect == "blink" && status.s3.on) { status.s3.blinkLit = !status.s3.blinkLit; anyBlink = true; }
    if (anyBlink) repaintAnimatedStrips();
  }

  // Animation: fade/chase/rainbow/strobe/pulse/bounce/sparkle — animStep alle 20 ms erhöhen
  if (now - lastAnim > 20) {
    lastAnim = now;
    bool anyAnim = false;
    const char* animEffects[] = {"fade","chase","rainbow","sparkle"};
    int nAnims = sizeof(animEffects) / sizeof(animEffects[0]);
    for (int i = 0; i < nAnims; i++) {
      if (status.s1.on && status.s1.effect == animEffects[i]) anyAnim = true;
      if (status.s2.on && status.s2.effect == animEffects[i]) anyAnim = true;
    }
    if (anyAnim) {
      animStep++;
      repaintAnimatedStrips();
    }
  }
}