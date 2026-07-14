/*
  Water Leakage Detector — ATmega328p (Arduino Uno/Nano)
  - 2x WFS201 flow sensors (pulse output) -> leak detection by comparing flow rates
  - SIM800L GSM module -> HTTP POST readings to Supabase REST API
  - 20x4 I2C LCD -> live status display

  Wiring:
    Sensor 1 signal -> D2 (INT0)
    Sensor 2 signal -> D3 (INT1)
    SIM800L TXD -> D7 (Arduino RX, via SoftwareSerial)
    SIM800L RXD -> D8 (Arduino TX, via SoftwareSerial, through a voltage divider — SIM800L is 3.3V logic)
    SIM800L VCC -> separate 4V/2A supply (NOT the Arduino 5V rail), GND shared with Arduino
    LCD SDA -> A4, LCD SCL -> A5 (I2C, address 0x27 by default)

  Fill in WIFI/APN + Supabase credentials below before flashing.
*/

#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <SoftwareSerial.h>

// ---------- Configuration ----------
const char* GPRS_APN = "internet";      // set to your SIM's carrier APN
const char* GPRS_USER = "";
const char* GPRS_PASS = "";

const char* SUPABASE_HOST = "bkaelehexhgiggiorxme.supabase.co";
const char* SUPABASE_URL  = "https://bkaelehexhgiggiorxme.supabase.co/rest/v1/sensor_readings";
const char* SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrYWVsZWhleGhnaWdnaW9yeG1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQwMjQ1MTksImV4cCI6MjA5OTYwMDUxOX0.Z_XXQpcLFqoVoIeffLwLd_GgM0RQNBBwjShOAnJtJyI";
const char* DEVICE_ID = "atmega328p-01";

const uint8_t FLOW_SENSOR_1_PIN = 2;   // INT0
const uint8_t FLOW_SENSOR_2_PIN = 3;   // INT1
const float PULSES_PER_LITER_PER_MIN = 7.5; // WFS201/YF-S201: Hz = 7.5 * L/min

const unsigned long SAMPLE_INTERVAL_MS = 1000;   // recompute flow rate every 1s
const unsigned long SEND_INTERVAL_MS   = 30000;  // push to Supabase every 30s
const float LEAK_THRESHOLD_LMIN = 0.5;           // flow-rate mismatch that counts as a leak
const uint8_t LEAK_CONFIRM_SAMPLES = 3;          // consecutive abnormal samples before flagging leak

// ---------- Globals ----------
LiquidCrystal_I2C lcd(0x27, 20, 4);
SoftwareSerial sim800(7, 8); // RX, TX

volatile uint32_t pulseCount1 = 0;
volatile uint32_t pulseCount2 = 0;

float flowRate1 = 0.0;
float flowRate2 = 0.0;
bool leakDetected = false;
uint8_t abnormalStreak = 0;

unsigned long lastSampleAt = 0;
unsigned long lastSendAt = 0;

void pulseCounter1() { pulseCount1++; }
void pulseCounter2() { pulseCount2++; }

void setup() {
  Serial.begin(9600);
  sim800.begin(9600);

  pinMode(FLOW_SENSOR_1_PIN, INPUT_PULLUP);
  pinMode(FLOW_SENSOR_2_PIN, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(FLOW_SENSOR_1_PIN), pulseCounter1, FALLING);
  attachInterrupt(digitalPinToInterrupt(FLOW_SENSOR_2_PIN), pulseCounter2, FALLING);

  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("Water Leak Detector");
  lcd.setCursor(0, 1);
  lcd.print("Initializing GSM...");

  gsmInit();

  lcd.clear();
  lastSampleAt = millis();
  lastSendAt = millis();
}

void loop() {
  unsigned long now = millis();

  if (now - lastSampleAt >= SAMPLE_INTERVAL_MS) {
    sampleFlowSensors();
    evaluateLeakStatus();
    updateLcdReadings();
    lastSampleAt = now;
  }

  if (now - lastSendAt >= SEND_INTERVAL_MS) {
    sendReadingToSupabase();
    lastSendAt = now;
  }
}

// ---------- Flow sensing ----------
void sampleFlowSensors() {
  noInterrupts();
  uint32_t count1 = pulseCount1;
  uint32_t count2 = pulseCount2;
  pulseCount1 = 0;
  pulseCount2 = 0;
  interrupts();

  float seconds = SAMPLE_INTERVAL_MS / 1000.0;
  float hz1 = count1 / seconds;
  float hz2 = count2 / seconds;
  flowRate1 = hz1 / PULSES_PER_LITER_PER_MIN;
  flowRate2 = hz2 / PULSES_PER_LITER_PER_MIN;
}

void evaluateLeakStatus() {
  float diff = fabs(flowRate1 - flowRate2);
  bool sampleAbnormal = diff > LEAK_THRESHOLD_LMIN;

  if (sampleAbnormal) {
    if (abnormalStreak < 255) abnormalStreak++;
  } else {
    abnormalStreak = 0;
  }

  leakDetected = abnormalStreak >= LEAK_CONFIRM_SAMPLES;
}

// ---------- LCD ----------
void updateLcdReadings() {
  lcd.setCursor(0, 0);
  lcd.print("S1: ");
  lcd.print(flowRate1, 2);
  lcd.print(" L/min   ");

  lcd.setCursor(0, 1);
  lcd.print("S2: ");
  lcd.print(flowRate2, 2);
  lcd.print(" L/min   ");

  lcd.setCursor(0, 2);
  lcd.print("Status: ");
  lcd.print(leakDetected ? "ABNORMAL" : "NORMAL  ");

  lcd.setCursor(0, 3);
  if (leakDetected) {
    lcd.print("! Water Leakage !   ");
  } else {
    lcd.print("System OK           ");
  }
}

void showLcdLine4(const char* msg) {
  lcd.setCursor(0, 3);
  lcd.print("                    "); // clear 20-char line
  lcd.setCursor(0, 3);
  lcd.print(msg);
}

// ---------- GSM / HTTP ----------
bool sendAT(const String& cmd, const String& expect, unsigned long timeoutMs) {
  sim800.println(cmd);
  unsigned long start = millis();
  String resp;
  while (millis() - start < timeoutMs) {
    while (sim800.available()) {
      resp += (char)sim800.read();
    }
    if (resp.indexOf(expect) != -1) return true;
  }
  return false;
}

void gsmInit() {
  sendAT("AT", "OK", 2000);
  sendAT("ATE0", "OK", 2000);
  sendAT("AT+CPIN?", "READY", 5000);
  sendAT("AT+CREG?", "OK", 5000);

  sendAT("AT+SAPBR=3,1,\"Contype\",\"GPRS\"", "OK", 3000);
  sendAT("AT+SAPBR=3,1,\"APN\",\"" + String(GPRS_APN) + "\"", "OK", 3000);
  if (strlen(GPRS_USER) > 0) sendAT("AT+SAPBR=3,1,\"USER\",\"" + String(GPRS_USER) + "\"", "OK", 3000);
  if (strlen(GPRS_PASS) > 0) sendAT("AT+SAPBR=3,1,\"PWD\",\"" + String(GPRS_PASS) + "\"", "OK", 3000);
  sendAT("AT+SAPBR=1,1", "OK", 5000);
  sendAT("AT+SAPBR=2,1", "OK", 5000);
}

void sendReadingToSupabase() {
  showLcdLine4("Sending...");

  String payload = "{\"device_id\":\"" + String(DEVICE_ID) +
                    "\",\"sensor1_flow\":" + String(flowRate1, 2) +
                    ",\"sensor2_flow\":" + String(flowRate2, 2) +
                    ",\"status\":\"" + (leakDetected ? "ABNORMAL" : "NORMAL") +
                    "\",\"leak_detected\":" + (leakDetected ? "true" : "false") + "}";

  bool ok = true;
  ok &= sendAT("AT+HTTPTERM", "", 1000); // clear any previous session, ignore result
  ok &= sendAT("AT+HTTPINIT", "OK", 5000);
  ok &= sendAT("AT+HTTPPARA=\"CID\",1", "OK", 3000);
  ok &= sendAT("AT+HTTPPARA=\"URL\",\"" + String(SUPABASE_URL) + "\"", "OK", 3000);
  ok &= sendAT("AT+HTTPPARA=\"CONTENT\",\"application/json\"", "OK", 3000);
  ok &= sendAT("AT+HTTPPARA=\"USERDATA\",\"apikey: " + String(SUPABASE_ANON_KEY) +
               "\\r\\nAuthorization: Bearer " + String(SUPABASE_ANON_KEY) +
               "\\r\\nPrefer: return=minimal\"", "OK", 3000);

  sim800.println("AT+HTTPDATA=" + String(payload.length()) + ",10000");
  delay(200);
  sim800.print(payload);
  delay(200);
  ok &= sendAT("", "OK", 10000);

  ok &= sendAT("AT+HTTPACTION=1", "+HTTPACTION: 1,", 15000); // POST
  sendAT("AT+HTTPTERM", "OK", 3000);

  showLcdLine4(ok ? "Message Sent" : "Send FAILED");
  delay(2000);
}
