/*
 * LED-Strip Test-Sketch (WS2812B / NeoPixel, 3 Adern: 5V / GND / DIN)
 *
 * Verkabelung:
 *   Strip 5V  ── PSU 5V  (NICHT an den ESP32 5V-Pin — ESP liefert nur ~400 mA)
 *   Strip GND ─┬── PSU GND
 *              └── ESP32 GND        (gemeinsame Masse — MUSS)
 *   Strip DIN  ── 330 Ω Reihewiderstand ── ESP32 GPIO 27
 *
 * Streifen WECHSELT alle 1,5 s die Farbe (rot → grün → blau → weiß),
 * so sieht man sofort ob alle LEDs und alle Farbkanäle funktionieren.
 */

#include <Adafruit_NeoPixel.h>

#define PIN        27
#define NUMPIXELS  20        // ← an eure Streifenlänge anpassen
#define BRIGHTNESS 40          // 0–255; niedrig halten beim ersten Test (Strom!)

Adafruit_NeoPixel strip(NUMPIXELS, PIN, NEO_GRB + NEO_KHZ800);

void setColor(uint8_t r, uint8_t g, uint8_t b) {
  for (int i = 0; i < NUMPIXELS; i++) strip.setPixelColor(i, strip.Color(r, g, b));
  strip.show();
}

void setup() {
  Serial.begin(115200);
  strip.begin();
  strip.setBrightness(BRIGHTNESS);
  strip.clear();
  strip.show();
  Serial.println("WS2812B-Test gestartet");
}

void loop() {
  Serial.println("rot");
  setColor(255, 0,   0);   delay(1500);
  Serial.println("grün");
  setColor(0,   255, 0);   delay(1500);
  Serial.println("blau");
  setColor(0,   0,   255); delay(1500);
  Serial.println("weiß");
  setColor(255, 255, 255); delay(1500);
}