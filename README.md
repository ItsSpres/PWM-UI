# F100 SmartPump Dashboard
Static, phone-friendly Web Bluetooth dashboard for F100 SmartPump Uno v0.3 and REYAX RYB2340_Lite. Three gauges (MAP kPa absolute, fuel psi, requested PWM percent), diagnostic terminal, configuration commands, CSV/text downloads, and clearly labeled simulation mode.

## Hosting on GitHub Pages
Repository: https://github.com/ItsSpres/PWM-UI . Files are at the repository root. Enable hosting in Settings → Pages → Deploy from a branch → main → /(root) → Save. No build, npm installation, secrets, or server needed. Open the resulting HTTPS Pages URL in Bluefy on iPhone. Safari has no native Web Bluetooth support. Desktop Chromium with BLE hardware is another option; actual browser/device support must be verified.

## Connect
Power the controller correctly, with REYAX UART at 115200 and its connection-status pin wired to Uno D3 as documented in the firmware. Tap Connect Bluetooth, select your module, and allow access. The site requests only the configured REYAX service, discovers write/notify characteristics, and subscribes to notifications. If discovery is ambiguous, select explicit UUIDs in the Connection guide. The manufacturer PDF's write UUID is ambiguous, so this project does not invent it.

REYAX service: f000c0c0-0451-4000-b000-000000000000. Manufacturer guide: https://reyax.com/upload/products_download/download_file/RYB2340_AT_Command_EN.pdf . UI tested in browser simulation; real module and iPhone connection pending.

## Firmware contract
Firmware is not changed by this repository. Compatible source: F100_SmartPump.ino v0.3, supplied separately. Notifications contain newline-delimited ASCII `DATA ms=… en=… s=… f=… pADC=… mADC=… psi_x100=… kpa_x100=… duty_pm=… cal=… reduced=…`. Frames are reassembled across BLE packets. psi and kPa divide by 100; duty divides by 10 for percent. Gauges hide sender values with cal=0, clear all readings after 2 seconds without valid data, and clear on disconnect. Gauge arc scales (110 kPa/100 psi/100%) are visual references, not control limits. Numeric readouts do not clip a valid sender reading above the arc scale.

Terminal sends supported firmware commands only, adds LF, chunks writes to 20 bytes, and waits for replies. GET waits for END GET, SAVE for SAVED. No automatic retries or auto-reconnect. HELLO, UNLOCK token, SET key value, APPLY, SAVE, REVERT, CLEAR and STOP require fresh ECU-OFF telemetry in this UI; each prompts before transmission. Firmware applies its own interlocks too. STOP is not an emergency-stop system. Unlock is accidental-write protection, not authentication. Pending command outcomes after disconnect/timeouts are unknown; inspect active settings after reconnect.

Configuration guide: ECU disabled → HELLO → UNLOCK returned token → SET field value → APPLY → SAVE; wait for each reply. GET reports ACTIVE settings. Partial staged edits survive until overwritten or REVERT; APPLY validates the full draft. Do not grant source-only calibration/reduced-output permissions through this page. This project intentionally has no direct ON/duty override.

## Data and limits
No analytics, third-party scripts, telemetry server or persistent storage. Browser memory keeps up to 10,000 telemetry rows and 1,500 terminal lines; reload clears them. Export only when you want a local copy. Demo resets its rows/logs on entry/exit and cannot send commands. Background/sleep can suspend updates. Control remains autonomous in the Uno. Physical ECU-controlled pump power removal remains essential. This bench development UI does not validate pump PWM compatibility, flow reserve, sensors, electrical protection, pressure control or road suitability.

## Development
`npm test` (Node built-in test runner, no dependencies). `npm start` serves localhost:8080; localhost is eligible as a secure context on the same desktop. An HTTP LAN address on a phone is not a substitute for HTTPS Pages. No service worker/offline guarantee in this version. Browser QA and hardware status are recorded in VALIDATION.md.
