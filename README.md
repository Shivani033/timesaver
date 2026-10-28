# Cadence • Academic Deadline & Smart Redirection Sentinel ✦

An aesthetic, professional academic companion built with Node.js, Express, and a responsive web client with Progressive Web App (PWA) capabilities.

Designed to automate syllabus deadlines, reservation windows, and meeting schedules with automated PDF date extraction, persistent alarms, cross-platform background alerts, and one-tap website redirection.

---

## 🌟 Key Features

### 1. Document & Syllabus PDF Extraction
* **Drag-and-Drop Dropzone**: Upload any course syllabus, exam schedule, or reservation PDF (or paste text directly).
* **Smart Table & Layout Reconstruction**: Accurately extracts multi-row tables (e.g. `12-11-2026 Google Meet https://meet.google.com/`).
* **Accurate Date Engine**: Parses international `DD-MM-YYYY` formats (e.g. `12-11-2026` = 12 Nov 2026) without placeholder fallbacks.
* **Batch Scheduling**: Confirm and schedule all detected tasks in a single click.

### 2. Tailored Alert Choices (Per Task)
For every single deadline or detected assignment, you choose your alert preference:
* 🔔 **Reminder Only**: Gentle advance notice (5-day preparation window & 1-day warning).
* ↗ **Redirect to Site**: Automatically opens the submission portal, course website, or booking link when it is time to work.
* ⏰ **Persistent Alarm**: Loud ringing alarm (*"tee - tee - tee"*) generated via the Web Audio API that rings continuously until you stop it.
* ⚡ **Alarm + Redirect**: The ultimate combination — persistent ringing with a single **"Stop Alarm & Open Website to Work"** button that silences the alarm, copies credentials/notes to your clipboard, and launches the portal.

### 3. Cross-Platform & Android Support (Over Other Apps)
* **Android & Mobile**: Powered by a Service Worker (`sw.js`). When an alarm fires while you are using other apps or your screen is locked, an interactive notification banner appears with a **`[🚀 Open Website to Work]`** button that immediately launches the browser to that site.
* **Physical Vibration**: Uses Android's Vibration API (`navigator.vibrate`) to vibrate your phone in persistent alarm patterns.
* **Screen Wake Lock**: Uses `navigator.wakeLock` to keep the mobile display awake and bright during alerts.
* **PWA Installable**: Tap **"📱 Install App"** in the header to add Cadence directly to your Android or Desktop Home Screen.

### 4. macOS Space & Fullscreen Integration
* When working on macOS across multiple Desktop Spaces or full-screen apps (like Antigravity or Xcode), the backend triggers native macOS notifications and launches the target website on your active space via `open <url>`.

### 5. Missed Alarms & Offline Recovery
* **"Missed While Away / Offline" Drawer**: If your computer was shut down or in sleep mode when a deadline arrived, Cadence automatically detects it as soon as you boot up and provides one-tap **"Open Website to Work Now"** and **"+1 Hour Reschedule"** options.
* **Phone & Google Calendar Sync (`.ics`)**: Tap **"📅 Sync Calendar (.ics)"** to export an iCalendar file with built-in alarms into Google Calendar, Samsung Calendar, or Apple Calendar — ensuring your phone will ring even if your computer is completely powered off.

### 6. Edit & Management
* **✏️ Edit Option**: In-place editor on every card to update dates, links, categories, notes, or alert styles.
* **Header Quick Navigation**: Tap **"Your Scheduled Reminders"** to immediately scroll and focus on your active list.
* **Professional UI**: Aesthetic light beige/cream theme (`#FAF7F2`), serif typography, floating toast notifications, and custom confirmation dialogs (no browser `alert()` popups).

---

## 🚀 Quick Start Guide

### Prerequisites
* [Node.js](https://nodejs.org/) (v16 or higher)

### Installation & Run

1. Open your terminal in this folder:
```bash
cd Cadence_Academic_Sentinel
```

2. Start the server:
```bash
npm start
```
*(or run `node server.js`)*

3. Open your browser and navigate to:
👉 **`http://localhost:5001`**

---

## 📁 Project Structure

```
Cadence_Academic_Sentinel/
├── package.json               # Project manifest & start scripts
├── server.js                  # Express API, macOS system events & static server
├── data/
│   └── deadlines.json         # JSON database storing scheduled deadlines & modes
└── public/                    # Frontend client & PWA assets
    ├── index.html             # Responsive dashboard, modals & drawer layouts
    ├── style.css              # Aesthetic beige palette, typography & animations
    ├── app.js                 # PDF extraction, audio alarm synthesizer & alert engine
    ├── sw.js                  # Service Worker for Android/mobile background alerts
    └── manifest.json          # PWA manifest for Android & Desktop installation
```

---

## 🛠 API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/deadlines` | List all scheduled deadlines |
| `POST` | `/api/deadlines` | Create a single deadline |
| `POST` | `/api/deadlines/batch` | Batch schedule multiple deadlines |
| `PUT` | `/api/deadlines/:id` | Edit / update an existing deadline |
| `DELETE`| `/api/deadlines/:id` | Delete a deadline |
| `POST` | `/api/deadlines/:id/test-trigger` | Trigger a 5-second test alarm |
| `POST` | `/api/deadlines/:id/snooze` | Postpone a deadline by specified minutes |
| `POST` | `/api/deadlines/:id/acknowledge` | Mark a missed or finished deadline completed |
| `GET` | `/api/deadlines/export-ics` | Download `.ics` file for Google/Apple Calendar |
| `GET` | `/api/alarm/current` | Check currently active ringing alarm |
| `POST` | `/api/alarm/dismiss` | Dismiss active ringing alarm |
