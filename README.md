# Water Leakage Detector

ATmega328p-based water leakage detector: two WFS201 flow sensors compare
readings to detect leaks, a 20x4 I2C LCD shows live status locally, and a
SIM800L GSM module pushes readings to Supabase so an admin can monitor the
system remotely via a live web dashboard.

## How it works

1. Both flow sensors sit on the same line (e.g. before and after a section of
   pipe/valve). Under normal operation they read the same flow rate.
2. If the two readings diverge by more than the configured threshold for a
   few consecutive samples, the system flags `ABNORMAL` — water is escaping
   somewhere between the two sensors.
3. The LCD always shows both sensor readings and the current status. On
   `ABNORMAL` it displays "Water Leakage!".
4. Every 30 seconds (configurable), the SIM800L sends the current reading to
   Supabase over HTTP. The LCD shows "Sending..." then "Message Sent" (or
   "Send FAILED") so you can confirm each report went out.
5. The React dashboard subscribes to Supabase Realtime and updates instantly
   whenever a new reading comes in.

## Repo layout

- `firmware/water_leakage_detector/` — Arduino sketch for the ATmega328p
- `supabase/schema.sql` — table, RLS policies, and realtime setup
- `web/` — React (Vite) dashboard

## 1. Supabase setup

1. Open the SQL editor for project `bkaelehexhgiggiorxme` and run
   [`supabase/schema.sql`](supabase/schema.sql). This creates the
   `sensor_readings` table, enables RLS with anon insert/select policies (the
   device and dashboard both use the anon key), and adds the table to the
   realtime publication.
2. Confirm Realtime is enabled: Database → Replication → make sure
   `sensor_readings` is checked (the SQL script does this, but double-check
   in the dashboard).

## 2. Firmware

### Wiring

| Component        | ATmega328p / Arduino pin |
|-------------------|---------------------------|
| Flow sensor 1 signal | D2 (INT0) |
| Flow sensor 2 signal | D3 (INT1) |
| SIM800L TXD       | D7 (via SoftwareSerial RX) |
| SIM800L RXD       | D8 (via SoftwareSerial TX, **through a voltage divider** — SIM800L RX is 3.3V) |
| SIM800L VCC       | Dedicated 3.7–4.2V, ≥2A supply — **not** the Arduino 5V pin (GSM transmit bursts need more current than the board can source) |
| SIM800L GND       | Shared GND with Arduino |
| LCD SDA           | A4 |
| LCD SCL           | A5 |
| LCD VCC/GND       | 5V / GND |

Flow sensor VCC/GND go to 5V/GND; signal wires use `INPUT_PULLUP`, no extra
resistor needed.

### Arduino IDE setup

1. Install libraries: `LiquidCrystal_I2C` and `SoftwareSerial` (bundled).
2. Open `firmware/water_leakage_detector/water_leakage_detector.ino`.
3. Edit the config block at the top:
   - `GPRS_APN` — your SIM card's carrier APN (required — ask your carrier or
     check their website, e.g. `"internet"`, `"web.safaricom.com"`, etc.)
   - `SUPABASE_URL` / `SUPABASE_ANON_KEY` — already filled in for this project
   - `PULSES_PER_LITER_PER_MIN`, `LEAK_THRESHOLD_LMIN`, `SEND_INTERVAL_MS` —
     tune to your sensors/pipe if needed
4. Select board **Arduino Uno** (or Nano, depending on which carries the
   ATmega328p) and the correct COM port, then upload.
5. Check the LCD I2C address — default `0x27`; if the display stays blank,
   scan for the address with a standard I2C scanner sketch and update
   `LiquidCrystal_I2C lcd(0x27, 20, 4);` in the sketch.

## 3. Web dashboard

```
cd web
npm install
cp .env.example .env   # already contains the project's Supabase URL/anon key
npm run dev
```

Open the printed local URL. The dashboard shows both sensors' current flow
rate, a NORMAL/ABNORMAL banner (with a leakage alert), and a recent-history
table, all updating live via Supabase Realtime.

To deploy: `npm run build` in `web/` produces a static `dist/` folder you can
host anywhere (Netlify, Vercel, GitHub Pages, etc.) — just set the same env
vars in the host's build settings.

## Notes

- The Supabase anon key is meant to be embedded in both the device firmware
  and the web client; access is restricted via the RLS policies in
  `schema.sql`, not by hiding the key.
- If HTTP POSTs from the SIM800L fail, check `AT+CREG?` and `AT+CSQ` (signal
  quality) — most failures trace back to APN misconfiguration or weak signal.
