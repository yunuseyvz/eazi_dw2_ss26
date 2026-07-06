<div align="center">

# EAZI
### Elevator Adaptable Zone Indicator

![Demo](assets/demo.gif)

</div>

---

## What is EAZI?

**EAZI** is a physical interactive prototype that turns the floor in front of an elevator into a communication surface. Leading Question: How might we prioritize elevator access without becoming intrusive or annoying?

It was built as a *Design Workshop 2* project under the **Intelligent Urban Machines** topic, exploring how everyday urban infrastructure can become quietly aware of the people who use it.

---

## Prototype stack

| Layer        | Tech                                                                       |
|--------------|----------------------------------------------------------------------------|
| **Hardware** | 2× WS2812B LED strips · 1× 5 V relay module · 5 V PSU · ESP32              |
| **Firmware** | Arduino sketch (PlatformIO) · `Adafruit_NeoPixel` · built-in WiFi HTTP     |
| **Network**  | ESP32 soft AP `Aufzug-Demo`              |

---

## Quick start

**Requirements:** Node.js ≥ 20 · npm ≥ 10 · VS Code + PlatformIO (for flashing)

```bash
# 1. Install web-app dependencies
npm install

# 2. Flash the ESP32
#    Open firmware/led-controller in VS Code → click Upload

# 3. Join the WiFi "Aufzug-Demo" (password: demo1234) on your phone

# 4. Run the controller app
npm run dev:led
# → open http://localhost:3000 on your laptop, or the same URL on your phone
```

The ESP32 boots into **"all strips on"** so wiring can be verified at a glance. Tap the big cycle button to switch through `AUS → Kein Bedarf → Rollstuhlfahrer → AUS`. Open the **Individuell** panel to override each strip's colour, effect and on/off state. Open **Einstellungen** for brightness and LED count.

---

## Repository layout

```
dw2-testing/
├── apps/
├── assets/
│   └── demo.gif            # animated preview (used in this README)
├── firmware/
│   ├── led-controller/     # ESP32 Arduino sketch + PlatformIO config
│   └── led-test/           # tiny standalone sketch to smoke-test one WS2812B strip
├── led_control_ui/         # @aufzug/led — LED board controller PWA (this deliverable)
├── ui_exploration/
│   ├── alt/                # @aufzug/alt — accessibility-detection concept
│   ├── mvg/                # @aufzug/mvg — transit-style operator view
│   └── shared/             # @aufzug/shared — shared UI components
└── package.json            # npm workspace root
```

---

## Early UI explorations

Before committing to the floor panel, the team explored two digital interface directions for the same idea. They're kept in the repo as a record of the process:

- **`ui_exploration/alt`** — *Accessibility-detection concept.* A camera-based prototype that detects approaching wheelchair / stroller users and signals queueing etiquette on a phone-style screen.
- **`ui_exploration/mvg`** — *Transit-style operator view.* A dashboard-style UI exploring how an MVG-style operator might monitor elevator status, crowd level and accessibility priority in real time.

These explorations led directly to the decision to **move the interaction out of the phone and into the floor**. They're runnable, but are not part of the LED-board deliverable.

---

## Scripts

| Command             | What it does                                |
|---------------------|---------------------------------------------|
| `npm install`       | install deps across all workspaces          |
| `npm run dev:led`   | start the LED controller PWA on port 3000   |
| `npm run build:led` | production build of `@aufzug/led`           |
| `npm run dev:alt`   | run the ALT UI exploration                  |
| `npm run dev:mvg`   | run the MVG UI exploration                  |
| `npm run lint`      | lint all apps                               |

---

## Course context

- **Module** — Design Workshop 2
- **Topic** — Intelligent Urban Machines
- **Driving question** — _How can an elevator communicate queueing etiquette and accessibility awareness **before** its doors open?_
- **Form** — A wooden floor panel with inlaid WS2812B strips and a backlit wheelchair icon, switched by an ESP32 and driven by a phone-style web UI.

---