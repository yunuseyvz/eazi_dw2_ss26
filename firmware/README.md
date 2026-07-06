# LED-Controller Firmware (ESP32 + WS2812B + Relay)

Arduino sketch for the smart-elevator board prototype. The ESP32 hosts a WiFi soft AP and a small HTTP server that the `@aufzug/led` Next.js app talks to. Drives **two independent WS2812B/NeoPixel strips** (digital) plus **one 5 V relay module** (for a simple on/off LED strip behind the wheelchair symbol).

## Hardware

- **Board**: any ESP32 dev module (ESP32-WROOM, -S3, etc.).
- **Two WS2812B strips** (3-wire: 5V / GND / DIN) — Strip 1 (Querstreifen), Strip 2 (Umrandung).
- **One 5 V relay module** (e.g. Berrybase HLRELM-1) switching a simple LED strip for the wheelchair symbol (Strip 3).
- **5 V PSU** rated for the *combined* current of all strips: ~60 mA per WS2812B LED at full white → LEDs × 0.06 A × 1.2. The relay strip adds its own current.

### Wiring

```
PSU 5V  ──┬── Strip1 5V
          ├── Strip2 5V
          └── (relay strip +5V via the relay's COM/NO contact)

PSU GND ─┬── Strip1 GND
         ├── Strip2 GND
         ├── Relay GND
         └── ESP32 GND          (common ground — mandatory)

Strip1 DIN ── 330 Ω ── ESP GPIO 27
Strip2 DIN ── 330 Ω ── ESP GPIO 26
Relay IN             ── ESP GPIO 33
```

> Pin numbers, LED count, default brightness and the relay's active-HIGH/active-LOW polarity are all configured at the top of `led-controller.ino` (`PIN_STRIP1`, `PIN_STRIP2`, `PIN_RELAY3`, `NUMPIXELS`, `DEFAULT_BRIGHTNESS`, `INVERT_RELAY`).

## Flash

1. Install VS Code + the **PlatformIO IDE** extension.
2. `File → Open Folder…` → `firmware/led-controller`.
3. Wait for PlatformIO to install the ESP32 toolchain + Adafruit NeoPixel library (status bar spinner).
4. **Disconnect the LED strips' 5 V** during upload to avoid browning out the ESP via inrush current. Reconnect after flashing.
5. Click the **→ Upload** arrow in the bottom status bar.
6. Open the **Serial Monitor** at 115200 baud. On boot you should see:
   ```
   AP IP: 192.168.4.1
   HTTP server up
   ```
   Every subsequent `POST /state` is logged with the request body and the resulting strip states.

### If the upload errors with "Unable to verify flash chip connection"

- Disconnect LED strip 5 V during upload (inrush current browns out the ESP).
- Lower `upload_speed` in `platformio.ini` to `460800` or `115200` (CH340 on some macOS setups is unstable above 460800).
- Use a data-rated USB cable, plug directly into the laptop (not a hub).
- Hold the **BOOT** button while clicking Upload; release once you see `Connecting...`.

## Boot state

On power-up the firmware sets **all three strips on** (Strip 1 blue, Strip 2 white, relay on) so wiring can be verified at a glance. The first `POST /state` from the app overrides this.

## States — two ways to drive it

**Cycle preset** (`state`): mutually exclusive presets the big UI button uses.

| `state` | Strip 1 (Querstreifen)| Strip 2 (Umrandung)    | Strip 3 (wheelchair relay) |
|---------|------------------------|------------------------|----------------------------|
| `0`     | OFF                    | OFF                    | OFF                        |
| `1`     | ON, green              | OFF                    | OFF                        |
| `2`     | OFF                    | ON, blue               | ON                         |

State labels in the UI: `0 = AUS`, `1 = Kein Bedarf`, `2 = Rollstuhlfahrer`.

**Individual mode** (per-strip fields): the *Individuell* panel in the app sends these. All fields optional; only the fields present are applied. Tapping any individual control overrides the active cycle preset until the cycle button is tapped again.

| Field         | Type                              | Applies to | Description                          |
|---------------|-----------------------------------|------------|--------------------------------------|
| `s1_on`       | bool                              | Strip 1    | on/off                                |
| `s1_color`    | `[r,g,b]` 0–255                   | Strip 1    | colour                                |
| `s1_effect`   | `solid\|blink\|fade\|chase\|rainbow` | Strip 1  | effect (see below)                    |
| `s2_on`       | bool                              | Strip 2    | on/off                                |
| `s2_color`    | `[r,g,b]` 0–255                   | Strip 2    | colour                                |
| `s2_effect`   | `solid\|blink\|fade\|chase\|rainbow` | Strip 2  | effect                                |
| `s3_on`       | bool                              | Strip 3    | on/off (relay)                        |
| `s3_effect`   | `solid\|blink`                    | Strip 3    | effect (relay cannot dim or colour)   |
| `brightness`  | 0–255                             | both       | global brightness for WS2812B strips    |
| `numPixels`   | 1–2000                            | both       | runtime LED count per WS2812B strip    |

## Effects

Implemented in `loop()` with `millis()`-based non-blocking timing:

| Effect    | Behaviour                                                     |
|-----------|---------------------------------------------------------------|
| `solid`   | static colour, no animation                                    |
| `blink`   | 230 ms on/off toggle (all strips)                              |
| `fade`    | sinusoidal brightness pulse, ~2 s period (WS2812B only)        |
| `chase`   | light point runs along the strip with a short fading tail       |
| `rainbow` | HSV colour wheel along the strip, slowly rotating              |

Strip 3 (relay) only honours `solid` and `blink`; other effect strings fall back to solid-on. The legacy `"off"` effect value is still accepted for backward compatibility and is treated as `"solid"`.

## Connect

1. From your phone/laptop, join WiFi: **`Aufzug-Demo`** / password **`demo1234`**.
2. Open <http://192.168.4.1/> — the embedded web UI loads directly from the ESP (no laptop, no npm, no separate app needed).
3. Alternatively, use the `@aufzug/led` Next.js app (`npm run dev:led` from the repo root) for a richer PWA experience with animations, or call the API directly:

   ```bash
   # Cycle to "Rollstuhlfahrer" (Strip 1 blue + relay on)
   curl -X POST http://192.168.4.1/state \
        -H 'Content-Type: application/json' \
        -d '{"state":2}'

   # Independent strip control: Strip 1 off, Strip 2 red + blinking, brightness 120
   curl -X POST http://192.168.4.1/state \
        -H 'Content-Type: application/json' \
        -d '{"s1_on":false,"s2_on":true,"s2_color":[255,0,0],"s2_effect":"blink","brightness":120}'

   # Change LED count at runtime (no reflash needed)
   curl -X POST http://192.168.4.1/state \
        -H 'Content-Type: application/json' \
        -d '{"numPixels":60}'
   ```

## Endpoints

| Method  | Path     | Body                                                    | Effect                              |
|---------|----------|---------------------------------------------------------|-------------------------------------|
| GET     | `/`      | —                                                       | Embedded web UI (HTML)              |
| GET     | `/ui`    | —                                                       | Same embedded web UI (alias)        |
| GET     | `/help`  | —                                                       | Plain-text API help                 |
| GET     | `/state` | —                                                       | Current state as JSON               |
| POST    | `/state` | `{"state":0\|1\|2}`                                     | Apply cycle preset                  |
| POST    | `/state` | `{"s1_on":true,"s1_color":[r,g,b],"s1_effect":"solid", ...}` | Independent per-strip control |
| OPTIONS | `/state` | —                                                       | CORS preflight (handled)            |

CORS is enabled (`Access-Control-Allow-Origin: *`), so the Next.js app can POST directly from the browser.

## Two UI options

The firmware supports two independent front-ends that coexist:

1. **Embedded web UI** (default, zero-setup): open `http://192.168.4.1/` in any phone browser. The full UI is served from the ESP's flash — no laptop, no npm, no separate app. Covers all features: cycle button, individual strip controls, effects, brightness, LED count. Served from `ui.h` (~13 KB of HTML/CSS/JS stored in PROGMEM).

2. **Next.js PWA** (`led_control_ui/`): run `npm run dev:led` on a laptop for a richer experience with Framer Motion animations, Tailwind styling, and PWA install. Talks to the same `/state` endpoint over HTTP.

Both can be used interchangeably — changes made in one are immediately reflected in the other since state lives on the ESP.

## Configuration constants (top of `led-controller.ino`)

| Constant             | Default | Meaning                                              |
|----------------------|---------|------------------------------------------------------|
| `AP_SSID`            | `Aufzug-Demo` | WiFi network name the ESP hosts                |
| `AP_PASSWORD`        | `demo1234`    | WiFi password (min 8 chars)                    |
| `PIN_STRIP1`         | `27`    | GPIO for Strip 1 DIN                                  |
| `PIN_STRIP2`         | `26`    | GPIO for Strip 2 DIN                                  |
| `PIN_RELAY3`         | `33`    | GPIO for the relay IN pin                             |
| `NUMPIXELS`          | `1000`  | Initial LED count per WS2812B strip (runtime-tunable) |
| `DEFAULT_BRIGHTNESS` | `40`    | Safe-for-USB brightness on first boot                |
| `INVERT_RELAY`       | `false` | `false` = active-HIGH relay, `true` = active-LOW     |
| `STATE1_R/G/B`       | `0,255,0`      | Cycle state 1 colour (green Querstreifen)         |
| `STATE2_R/G/B`       | `0,0,255`      | Cycle state 2 colour (blue Umrandung)            |

The WS2812B strip colour order is configured in the `Adafruit_NeoPixel` constructor (`NEO_RGB` in this build). If colours come out wrong after wiring a new strip, try `NEO_GRB` instead.

## Why AP mode?

University eduroam uses WPA2-Enterprise + client isolation, which makes inbound connections to the ESP unreliable or impossible. Running the ESP as its own AP sidesteps all of that — the demo works anywhere you can power it. If your venue mandates using a provided IoT SSID instead, replace the `WiFi.softAP(...)` block with `WiFi.begin(SSID, PASS)` and add `ESPmDNS` (`ESPmDNS.h`) for `http://aufzug.local`.

## Smoke-test sketch

`firmware/led-test/led-test.ino` is a standalone sketch that cycles one WS2812B strip through red → green → blue → white every 1.5 s. Use it to verify a strip's data direction, DIN pin, and colour order before wiring it into the controller sketch. Open `firmware/led-test` in PlatformIO and Upload.