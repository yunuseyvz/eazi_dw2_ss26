# Smart Elevator — Board Prototype (Design Workshop 2)

Interactive physical prototype for the **Intelligent Urban Machines** module in *Design Workshop 2*. The project explores a smart elevator system that gently guides waiting passengers and makes bystanders aware of approaching users with accessibility needs.

The physical prototype is a wooden floor panel with LED strips inlaid into routed grooves. The strips visualise two situations at the elevator entrance:

- **Kein Bedarf** — a white cross-strip signals "no specific accessibility need right now".
- **Rollstuhlfahrer** — a blue border around the panel plus an illuminated wheelchair symbol signal "an elevator user with accessibility needs is approaching — please leave space".

A phone-friendly web UI drives the prototype over WiFi. An ESP32 runs the strips directly (no separate server).

## Repository layout

```
apps/
├── alt/                # @aufzug/alt — UI exploration: accessibility-detection concept
├── mvg/                # @aufzug/mvg — UI exploration: transit-style operator view
└── led/                # @aufzug/led — LED board prototype controller (this deliverable)
packages/
└── shared/             # @aufzug/shared — shared components across the explorations
firmware/
├── led-controller/     # ESP32 Arduino sketch + PlatformIO config for the LED controller
└── led-test/           # Tiny standalone sketch to smoke-test a single WS2812B strip
package.json            # npm workspace root
```

## Prototype stack

| Layer    | Tech                                                            |
|----------|----------------------------------------------------------------|
| Hardware | 2× WS2812B LED strips, 1× 5 V relay module, 5 V PSU, ESP32      |
| Firmware | Arduino sketch (PlatformIO), `Adafruit_NeoPixel`, built-in WiFi HTTP server |
| Network  | ESP32 soft AP `Aufzug-Demo` (no router / eduroam needed)        |
| UI       | Next.js PWA (`@aufzug/led`), single-page controller on the phone|
| Comms    | HTTP POST `/state` with small JSON body (CORS-enabled)          |

See [`firmware/README.md`](firmware/README.md) for wiring + flashing, and [`apps/led/README.md`](apps/led/README.md) for the web UI.

## Quick start (LED prototype)

Requirements: Node.js ≥ 20 / npm ≥ 10; VS Code + PlatformIO for flashing.

```bash
# 1. install web-app deps
npm install

# 2. flash the ESP32 (open firmware/led-controller in VS Code, click Upload)

# 3. join the WiFi "Aufzug-Demo" / password "demo1234" on your phone

# 4. run the controller app
npm run dev:led
# open http://localhost:3000 on your laptop, or the same URL on your phone
```

The ESP32 boots into "all strips on" so you can immediately verify wiring. Tap the big cycle button to switch between **AUS → Kein Bedarf → Rollstuhlfahrer → AUS**. Open the *Individuell* panel to override each strip's colour, effect, and on/off independently. Open *Einstellungen* for brightness and LED count.

## Early UI exploration (alt & mvg)

Before settling on the physical LED board, the team explored two digital interface directions for the same smart-elevator concept. Both are kept here as record of that exploration phase:

- **`apps/alt`** — accessibility-detection concept. A camera-based prototype that detects approaching wheelchair/stroller users and signals queueing etiquette on a phone-style screen.
- **`apps/mvg`** — transit-style operator view. A dashboard-style UI exploring how an MVG-style operator might see elevator status, crowd level, and accessibility priority in real time.

These explorations informed the decision to move the interaction into the physical space (the floor panel) rather than onto a phone screen. They are runnable but not part of the LED board deliverable.

## Scripts

| Command                | What it does                                   |
|------------------------|------------------------------------------------|
| `npm install`          | install deps across all workspaces              |
| `npm run dev:led`      | start the LED controller PWA on port 3000       |
| `npm run build:led`    | production build of `@aufzug/led`               |
| `npm run lint`         | lint all apps                                   |
| `npm run dev:alt`      | run the ALT UI exploration                       |
| `npm run dev:mvg`      | run the MVG UI exploration                       |

## Course context

- **Module**: Design Workshop 2
- **Topic**: Intelligent Urban Machines
- **Team-project question**: how can an elevator communicate queueing etiquette and accessibility awareness *before* its doors open?
- **Physical prototype**: wooden floor panel with inlaid WS2812B strips + a backlit wheelchair icon, switched by an ESP32.
- **Interaction**: phone-style web UI to cycle through the situations and to demo individual strip effects.

## License

Coursework — not distributed. All third-party libraries retain their licenses (see `package.json` files and `platformio.ini`).