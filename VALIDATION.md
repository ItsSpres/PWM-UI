# Validation — 2026-11-03
- `npm test`: 9 tests passed. Actual app executed with mocked DOM/GATT to verify notification parsing, calibrated/uncalibrated display, stale-data clearing, disconnect handling, GET transaction serialization and ECU-enabled write blocking. Protocol tests cover split notifications, overflow, invalid frames, command injection rejection, SAVE completion and CSV conversion.
- `node --check app.js`: passed.
- Cloud Chrome UI: connected-free initial state; demo renders MAP/fuel/duty readings with SIMULATED label; commands disabled in demo; exit clears gauges. No application-origin console errors observed (browser extension errors excluded).
- Reviewed desktop viewport. Responsive CSS included; actual iPhone layout, Bluefy behavior, download handling and BLE module communication remain UNVERIFIED.
- Firmware contract checked against current F100_SmartPump.ino v0.3. No firmware changes performed.
- Dashboard uploaded to ItsSpres/PWM-UI on main. GitHub Pages activation is separate; no live hosting URL claimed.
- No physical pump, sender, shutdown timing, flow reserve, thermal/EMC or vehicle tests performed.
