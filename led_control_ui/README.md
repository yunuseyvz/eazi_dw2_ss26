# @aufzug/led — LED Board Prototype Controller

Phone-friendly Next.js PWA that drives the ESP32 LED controller over WiFi. Talks to the firmware in [`firmware/led-controller`](../../firmware/led-controller) via small JSON HTTP POSTs.

## What it does

The app shows a single big **cycle button** that walks through the three situations the prototype visualises:

| State | Label in UI         | What lights up on the board                        |
|-------|---------------------|----------------------------------------------------|
| `0`   | AUS                 | everything off                                      |
| `1`   | Kein Bedarf         | Strip 1 (Querstreifen) green                       |
| `2`   | Rollstuhlfahrer     | Strip 2 (Umrandung) blue + Strip 3 (wheelchair symbol via relay) |

Two collapsible panels underneath:

- **Individuell** — override each strip independently (on/off, colour picker, effect). Changes take effect immediately and override the cycle preset until the cycle button is tapped again.
- **Einstellungen** — global brightness slider and LED count input (applies to both WS2812B strips).

## Effects

For the two WS2812B strips (`Strip 1` Querstreifen, `Strip 2` Umrandung):

| Effect     | Label       | Behaviour                                              |
|------------|-------------|--------------------------------------------------------|
| `solid`    | Statisch    | static colour, no animation                            |
| `blink`    | Blinken     | 230 ms on/off toggle                                    |
| `fade`     | Atmen       | sinusoidal brightness pulse (≈2 s period)              |
| `chase`    | Lauflicht   | light point runs along the strip with a short tail     |
| `rainbow`  | Regenbogen  | HSV colour wheel along the strip, slowly rotating       |

Strip 3 (wheelchair symbol, relay) supports only `solid` and `blink` — a relay cannot dim or show colour.

## Configuration

`NEXT_PUBLIC_ESP_URL` — base URL of the ESP32 HTTP server. Defaults to `http://192.168.4.1`, which is the ESP's soft-AP address. Override in `led_control_ui/.env.local` if you wire the ESP into an existing WiFi instead.

```bash
cp led_control_ui/.env.example led_control_ui/.env.local
# edit .env.local if needed
```

## Run

From the repo root:

```bash
npm install
npm run dev:led
```

Open the URL on your phone (it must be connected to the same WiFi as the ESP, i.e. join `Aufzug-Demo` / `demo1234`). On desktop the app reaches the ESP directly because the laptop is on the same network.

## Install as a PWA

The app ships with `public/manifest.json`. On the phone:
1. Open the dev URL in Safari/Chrome.
2. "Add to Home Screen".
3. Launches full-screen without the browser chrome.

For a classroom demo, install the PWA on the demo phone before the session.

## File map

```
led_control_ui/
├── public/                 # PWA manifest + icons
├── src/
│   ├── app/
│   │   ├── layout.tsx       # root layout + Manrope font
│   │   ├── page.tsx         # main page: state, fetch, cycle, panels
│   │   └── globals.css
│   └── components/
│       ├── CycleButton.tsx       # big cycle button (AUS / Kein Bedarf / Rollstuhlfahrer)
│       ├── StripControls.tsx     # per-strip card: on/off, colour, effect picker
│       ├── Header.tsx            # top header
│       ├── ConnectionStatus.tsx  # green/red ESP connection indicator
│       └── DisclosureArrow.tsx   # chevron that rotates when <details> is open
├── .env.example             # NEXT_PUBLIC_ESP_URL
├── next.config.ts
├── package.json             # @aufzug/led workspace
└── tsconfig.json
```

## HTTP contract

The app sends `POST /state` with any of these fields (all optional — only changed fields are sent):

```jsonc
{ "state": 0 | 1 | 2 }                       // cycle preset
{ "brightness": 120 }                        // 0–255, applies to both WS2812B strips
{ "numPixels": 60 }                          // LED count per WS2812B strip (runtime)
{ "s1_on": true, "s1_color": [0,255,0], "s1_effect": "solid" }   // Strip 1
{ "s2_on": true, "s2_color": [0,0,255], "s2_effect": "fade" } // Strip 2
{ "s3_on": true, "s3_effect": "solid" }     // Strip 3 (relay, no colour)
```

The ESP replies with the full current state, which the app uses to re-sync the UI. See [`firmware/README.md`](../../firmware/README.md) for the complete endpoint reference.