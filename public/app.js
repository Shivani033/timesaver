/**
 * Cadence • Academic Deadline & Smart Redirection Assistant
 * Client Application Logic
 */

// Configure PDF.js worker
if (window.pdfjsLib) {
  window.pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

// ==============================================================
// 1. PROFESSIONAL TOAST & CONFIRM MODAL SYSTEM
// ==============================================================
const toastContainer = document.getElementById('toastContainer');
const confirmModal = document.getElementById('confirmModal');
const confirmModalTitle = document.getElementById('confirmModalTitle');
const confirmModalMessage = document.getElementById('confirmModalMessage');
const btnConfirmCancel = document.getElementById('btnConfirmCancel');
const btnConfirmProceed = document.getElementById('btnConfirmProceed');

let confirmCallback = null;

function showToast({ title, message, type = 'success', duration = 4000 }) {
  if (!toastContainer) return;

  const icons = {
    success: '✦',
    info: 'ℹ',
    warning: '⚠',
    error: '✕'
  };

  const toast = document.createElement('div');
  toast.className = `toast-item toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || '✦'}</span>
    <div class="toast-body">
      <div class="toast-title">${escapeHtml(title)}</div>
      <div class="toast-message">${escapeHtml(message)}</div>
    </div>
    <button class="toast-close" aria-label="Close">&times;</button>
    <div class="toast-progress"></div>
  `;

  const closeBtn = toast.querySelector('.toast-close');
  const dismiss = () => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    setTimeout(() => toast.remove(), 250);
  };

  closeBtn.onclick = dismiss;
  setTimeout(dismiss, duration);

  toastContainer.appendChild(toast);
}

function showConfirm({ title, message, confirmText = 'Confirm', onConfirm }) {
  confirmModalTitle.textContent = title;
  confirmModalMessage.textContent = message;
  btnConfirmProceed.textContent = confirmText;
  confirmCallback = onConfirm;
  confirmModal.classList.remove('hidden');
}

btnConfirmCancel.onclick = () => {
  confirmModal.classList.add('hidden');
  confirmCallback = null;
};

btnConfirmProceed.onclick = () => {
  confirmModal.classList.add('hidden');
  if (confirmCallback) {
    confirmCallback();
    confirmCallback = null;
  }
};

// ==============================================================
// 2. WEB AUDIO PERSISTENT ALARM ("TEE-TEE-TEE")
// ==============================================================
class AlarmAudioEngine {
  constructor() {
    this.audioCtx = null;
    this.intervalId = null;
    this.isPlaying = false;
  }

  init() {
    if (!this.audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioContext();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  playBeep() {
    if (!this.audioCtx) return;
    const now = this.audioCtx.currentTime;

    // First tone (1000Hz)
    const osc1 = this.audioCtx.createOscillator();
    const gain1 = this.audioCtx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(1000, now);
    gain1.gain.setValueAtTime(0.3, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc1.connect(gain1);
    gain1.connect(this.audioCtx.destination);
    osc1.start(now);
    osc1.stop(now + 0.1);

    // Second tone (1600Hz, "tee-tee")
    const osc2 = this.audioCtx.createOscillator();
    const gain2 = this.audioCtx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1600, now + 0.12);
    gain2.gain.setValueAtTime(0.35, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
    osc2.connect(gain2);
    gain2.connect(this.audioCtx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.24);
  }

  startAlarm() {
    this.init();
    if (this.isPlaying) return;
    this.isPlaying = true;

    this.playBeep();
    this.intervalId = setInterval(() => {
      this.playBeep();
    }, 650);

    if ('vibrate' in navigator) {
      try { navigator.vibrate([400, 200, 400, 200]); } catch (e) {}
    }
  }

  stopAlarm() {
    this.isPlaying = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if ('vibrate' in navigator) {
      try { navigator.vibrate(0); } catch (e) {}
    }
  }
}

const alarmAudio = new AlarmAudioEngine();

// ==============================================================
// 3. STATE & SELECTORS
// ==============================================================
let deadlines = [];
let detectedItems = [];
let activeRingingItem = null;
let activeFilter = 'ALL';
let tickerInterval = null;

const scheduleGrid = document.getElementById('scheduleGrid');
const emptyState = document.getElementById('emptyState');

// Dropzone & Extraction
const dropzone = document.getElementById('dropzone');
const pdfFileInput = document.getElementById('pdfFileInput');
const togglePasteBox = document.getElementById('togglePasteBox');
const pasteScheduleBox = document.getElementById('pasteScheduleBox');
const scheduleTextInput = document.getElementById('scheduleTextInput');
const btnParseText = document.getElementById('btnParseText');

const extractionReviewSection = document.getElementById('extractionReviewSection');
const detectedItemsList = document.getElementById('detectedItemsList');
const btnCancelExtraction = document.getElementById('btnCancelExtraction');
const btnSaveExtractedDeadlines = document.getElementById('btnSaveExtractedDeadlines');

// Alarm Sheet Elements
const alarmModal = document.getElementById('alarmModal');
const alarmTitle = document.getElementById('alarmTitle');
const alarmUrl = document.getElementById('alarmUrl');
const alarmNotesBox = document.getElementById('alarmNotesBox');
const alarmNotes = document.getElementById('alarmNotes');
const alarmClockTime = document.getElementById('alarmClockTime');
const btnAlarmRedirect = document.getElementById('btnAlarmRedirect');
const btnAlarmSnooze = document.getElementById('btnAlarmSnooze');
const btnAlarmDismiss = document.getElementById('btnAlarmDismiss');

// Header Navigation & Desktop Alert Elements
const btnNavScheduled = document.getElementById('btnNavScheduled');
const navScheduleCount = document.getElementById('navScheduleCount');
const btnEnableDesktopNotifs = document.getElementById('btnEnableDesktopNotifs');
const notifStatusIcon = document.getElementById('notifStatusIcon');
const notifStatusText = document.getElementById('notifStatusText');

// Wire "Your Scheduled Reminders" button in header
if (btnNavScheduled) {
  btnNavScheduled.onclick = () => {
    const section = document.getElementById('scheduleSection');
    if (section) {
      section.scrollIntoView({ behavior: 'smooth' });
      section.style.transition = 'box-shadow 0.4s ease';
      section.style.boxShadow = '0 0 0 3px rgba(179, 125, 78, 0.4)';
      setTimeout(() => {
        section.style.boxShadow = '';
      }, 1200);
    }
  };
}

// Screen Wake Lock & PWA Installation Handlers for Android & Mobile
let wakeLockObj = null;
async function requestScreenWakeLock() {
  if ('wakeLock' in navigator) {
    try {
      wakeLockObj = await navigator.wakeLock.request('screen');
    } catch (err) {
      console.warn('Wake Lock warning:', err);
    }
  }
}

function releaseScreenWakeLock() {
  if (wakeLockObj) {
    try { wakeLockObj.release(); } catch(e) {}
    wakeLockObj = null;
  }
}

// PWA Install prompt on Android / Chrome
let deferredPrompt = null;
const btnInstallPwa = document.getElementById('btnInstallPwa');

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  if (btnInstallPwa) {
    btnInstallPwa.style.display = 'inline-flex';
  }
});

if (btnInstallPwa) {
  btnInstallPwa.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      btnInstallPwa.style.display = 'none';
      showToast({ title: 'App Installed', message: 'Cadence added to your device Home Screen!', type: 'success' });
    }
    deferredPrompt = null;
  });
}

// Register Service Worker for Android, Windows, and iOS
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

// ==============================================================
// CROSS-PLATFORM ALERT & BACKGROUND NOTIFICATION MANAGER (ANDROID, WINDOWS, MAC)
// ==============================================================
class DesktopAlertManager {
  constructor() {
    this.titleInterval = null;
    this.originalTitle = document.title;
    this.activeNotification = null;
  }

  init() {
    this.updateUi();
    if (btnEnableDesktopNotifs) {
      btnEnableDesktopNotifs.onclick = () => this.requestPermission();
    }
  }

  updateUi() {
    if (!btnEnableDesktopNotifs) return;
    if (!('Notification' in window)) {
      btnEnableDesktopNotifs.style.display = 'none';
      return;
    }
    if (Notification.permission === 'granted') {
      if (notifStatusIcon) notifStatusIcon.textContent = '✓';
      if (notifStatusText) notifStatusText.textContent = 'System Alerts Active';
      btnEnableDesktopNotifs.classList.add('btn-outline');
      btnEnableDesktopNotifs.classList.remove('btn-ghost');
    } else if (Notification.permission === 'denied') {
      if (notifStatusIcon) notifStatusIcon.textContent = '✕';
      if (notifStatusText) notifStatusText.textContent = 'Alerts Blocked';
    } else {
      if (notifStatusIcon) notifStatusIcon.textContent = '🔔';
      if (notifStatusText) notifStatusText.textContent = 'Enable Device Alerts';
    }
  }

  async requestPermission() {
    if (!('Notification' in window)) {
      showToast({ title: 'Not Supported', message: 'Device notifications are not supported.', type: 'warning' });
      return;
    }
    const perm = await Notification.requestPermission();
    this.updateUi();
    if (perm === 'granted') {
      showToast({
        title: 'Device Alerts Enabled',
        message: 'Alarms will now pop up over other apps, tabs, and lock screens!',
        type: 'success'
      });
    } else {
      showToast({
        title: 'Permission Denied',
        message: 'Please enable notifications in your browser or phone site settings.',
        type: 'info'
      });
    }
  }

  async triggerBackgroundAlert(item) {
    // 1. Keep mobile screen awake
    requestScreenWakeLock();

    // 2. Physical device vibration pattern for Android / mobile
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate([600, 250, 600, 250, 600]);
      } catch (e) {}
    }

    // 3. Service Worker Notification with Direct Action Buttons (Android & Windows)
    if ('serviceWorker' in navigator && Notification.permission === 'granted') {
      try {
        const reg = await navigator.serviceWorker.ready;
        if (reg && reg.showNotification) {
          await reg.showNotification(`⏰ Action Due: ${item.title}`, {
            body: `Due right now! Tap to open ${item.targetUrl}`,
            icon: 'https://cdn-icons-png.flaticon.com/512/2972/2972531.png',
            badge: 'https://cdn-icons-png.flaticon.com/512/2972/2972531.png',
            vibrate: [500, 250, 500, 250, 500],
            requireInteraction: true,
            data: { url: item.targetUrl },
            actions: [
              { action: 'open', title: '🚀 Open Website to Work' }
            ]
          });
          return;
        }
      } catch (err) {
        console.warn('SW notification fallback:', err);
      }
    }

    // 4. Standard window.Notification (macOS / Desktop Chrome / Edge)
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        if (this.activeNotification) {
          this.activeNotification.close();
        }
        this.activeNotification = new Notification(`⏰ Action Due: ${item.title}`, {
          body: `Due right now! Click here to stop alarm and open ${item.targetUrl}`,
          requireInteraction: true,
          tag: item.id
        });

        this.activeNotification.onclick = () => {
          window.focus();
          btnAlarmRedirect.click();
          this.activeNotification.close();
        };
      } catch (e) {
        console.warn('Notification fallback error:', e);
      }
    }

    // 5. Tab Bar Title Flashing (draws immediate attention in browser tab bar)
    if (!this.titleInterval) {
      this.originalTitle = document.title;
      let flash = false;
      this.titleInterval = setInterval(() => {
        flash = !flash;
        document.title = flash ? `🚨 URGENT: ${item.title}` : `⚡ CLICK TO OPEN: ${item.title}`;
      }, 600);
    }
  }

  stopBackgroundAlert() {
    releaseScreenWakeLock();
    if (this.activeNotification) {
      try { this.activeNotification.close(); } catch(e) {}
      this.activeNotification = null;
    }
    if (this.titleInterval) {
      clearInterval(this.titleInterval);
      this.titleInterval = null;
      document.title = this.originalTitle;
    }
  }
}

const desktopAlerts = new DesktopAlertManager();

// ==============================================================
// 4. API & STORAGE
// ==============================================================
async function loadDeadlines() {
  try {
    const res = await fetch('/api/deadlines');
    const json = await res.json();
    if (json.success) {
      deadlines = json.data;
      renderSchedule();
    }
  } catch (err) {
    console.error('Failed to load deadlines:', err);
  }
}

async function saveDeadline(data) {
  try {
    const res = await fetch('/api/deadlines', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const json = await res.json();
    if (json.success) {
      await loadDeadlines();
      showToast({
        title: 'Deadline Scheduled',
        message: `"${data.title}" added to your schedule.`,
        type: 'success'
      });
      return true;
    }
  } catch (err) {
    showToast({
      title: 'Connection Error',
      message: 'Failed to save to server.',
      type: 'error'
    });
  }
  return false;
}

async function removeDeadline(id, title) {
  showConfirm({
    title: 'Remove Deadline?',
    message: `Are you sure you want to remove "${title}" from your schedule?`,
    confirmText: 'Yes, Remove',
    onConfirm: async () => {
      try {
        const res = await fetch(`/api/deadlines/${id}`, { method: 'DELETE' });
        const json = await res.json();
        if (json.success) {
          await loadDeadlines();
          showToast({
            title: 'Deadline Removed',
            message: `"${title}" has been deleted.`,
            type: 'info'
          });
        }
      } catch (err) {
        showToast({ title: 'Error', message: 'Could not remove deadline.', type: 'error' });
      }
    }
  });
}

// ==============================================================
// 5. ACCURATE DATE PARSING HELPER
// ==============================================================
function parseDateString(dateStr, timeStr = null) {
  if (!dateStr) return new Date();

  const clean = dateStr.trim();

  // Pattern 1: DD-MM-YYYY or DD/MM/YYYY
  const dmyMatch = clean.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1; // 0-indexed in JS
    const year = parseInt(dmyMatch[3], 10);

    let hours = 10;
    let mins = 0;
    if (timeStr) {
      const t = parseTimeString(timeStr);
      if (t) { hours = t.hours; mins = t.mins; }
    }

    const d = new Date(year, month, day, hours, mins, 0);
    if (!isNaN(d.getTime())) return d;
  }

  // Pattern 2: YYYY-MM-DD
  const ymdMatch = clean.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10) - 1;
    const day = parseInt(ymdMatch[3], 10);
    const d = new Date(year, month, day, 10, 0, 0);
    if (!isNaN(d.getTime())) return d;
  }

  // Pattern 3: Standard textual date "Nov 12, 2026" or "12 November 2026"
  const standardParsed = Date.parse(clean);
  if (!isNaN(standardParsed)) {
    return new Date(standardParsed);
  }

  return new Date();
}

function parseTimeString(timeStr) {
  const match = timeStr.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (!match) return null;
  let hours = parseInt(match[1], 10);
  const mins = match[2] ? parseInt(match[2], 10) : 0;
  const ampm = match[3] ? match[3].toLowerCase() : null;

  if (ampm === 'pm' && hours < 12) hours += 12;
  if (ampm === 'am' && hours === 12) hours = 0;

  return { hours, mins };
}

// ==============================================================
// 6. ROBUST PDF & SYLLABUS TEXT PARSER
// ==============================================================
async function handlePdfUpload(file) {
  if (!window.pdfjsLib) {
    showToast({ title: 'Loading Library', message: 'PDF engine loading, please try in 3 seconds.', type: 'info' });
    return;
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let reconstructedText = '';

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const items = textContent.items;

      // Group text items by vertical Y line to reconstruct tables accurately
      items.sort((a, b) => {
        if (Math.abs(a.transform[5] - b.transform[5]) > 5) {
          return b.transform[5] - a.transform[5]; // Top to bottom
        }
        return a.transform[4] - b.transform[4]; // Left to right
      });

      let lastY = null;
      for (const it of items) {
        if (lastY === null || Math.abs(it.transform[5] - lastY) > 5) {
          reconstructedText += '\n';
          lastY = it.transform[5];
        } else {
          reconstructedText += '   ';
        }
        reconstructedText += it.str;
      }
      reconstructedText += '\n';
    }

    parseSyllabusText(reconstructedText);
  } catch (err) {
    console.error('PDF Parse Error:', err);
    showToast({
      title: 'PDF Parsing Failed',
      message: 'Could not read PDF. Try pasting the text directly below.',
      type: 'error'
    });
  }
}

function parseSyllabusText(rawText) {
  const results = [];

  // PASS 1: Table Pattern with Date, Title & URL
  // Matches: 12-11-2026   Google Meet   https://meet.google.com/
  const tableRegex = /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})\s+([\s\S]+?)\s+(https?:\/\/[^\s\)\>]+)/g;
  let match;

  while ((match = tableRegex.exec(rawText)) !== null) {
    const rawDate = match[1].trim();
    let rawTitle = match[2].replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
    const rawUrl = match[3].trim();

    // Remove unwanted header words if caught
    rawTitle = rawTitle.replace(/^(Date|Website|URL|Name)\s+/i, '').trim();

    if (rawTitle.length > 0 && rawUrl.length > 5) {
      const targetDate = parseDateString(rawDate);

      results.push({
        id: 'det-' + Math.random().toString(36).substring(2, 9),
        title: rawTitle,
        targetTime: targetDate,
        targetUrl: rawUrl,
        mode: 'ALARM_REDIRECT' // User preference: persistent alarm + website redirect
      });
    }
  }

  // PASS 2: If table parser didn't catch, parse line-by-line for assignments/deadlines
  if (results.length === 0) {
    const lines = rawText.split(/\r?\n/);
    const dateRegex = /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2}(?:,\s*\d{4})?)/i;
    const urlRegex = /(https?:\/\/[^\s\)\>]+)/i;

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.length < 5) continue;

      const dateMatch = trimmed.match(dateRegex);
      const urlMatch = trimmed.match(urlRegex);

      if (dateMatch) {
        let title = trimmed.replace(dateRegex, '').replace(urlRegex, '').trim();
        title = title.replace(/^[:\-\–\s]+/, '').replace(/[:\-\–\s]+$/, '');
        if (!title) title = 'Scheduled Deadline';

        const targetDate = parseDateString(dateMatch[1]);
        const targetUrl = urlMatch ? urlMatch[1] : 'https://canvas.instructure.com';

        results.push({
          id: 'det-' + Math.random().toString(36).substring(2, 9),
          title: title,
          targetTime: targetDate,
          targetUrl: targetUrl,
          mode: 'ALARM_REDIRECT'
        });
      }
    }
  }

  if (results.length === 0) {
    showToast({
      title: 'No Dates Found',
      message: 'Could not detect dates in text. Check your format or enter manually.',
      type: 'warning'
    });
    return;
  }

  detectedItems = results;
  renderDetectedReview();
  showToast({
    title: 'Extraction Complete',
    message: `Detected ${results.length} deadline${results.length > 1 ? 's' : ''} with exact dates from document.`,
    type: 'success'
  });
}

function renderDetectedReview() {
  extractionReviewSection.classList.remove('hidden');

  detectedItemsList.innerHTML = detectedItems.map((item, idx) => `
    <div class="detected-row" data-index="${idx}">
      <div class="detected-row-top">
        <input type="text" class="detected-title-input" value="${escapeHtml(item.title)}" placeholder="Assignment Title">
        <input type="datetime-local" class="detected-date-input" value="${formatDateTimeLocal(item.targetTime)}">
      </div>

      <div class="detected-options-row">
        <div class="detected-url-group">
          <label style="font-size: 11px; margin: 0; color: #8E8478;">Platform Link:</label>
          <input type="url" class="detected-url-input" value="${escapeHtml(item.targetUrl)}" placeholder="https://canvas.edu">
        </div>

        <div class="mode-pills-selector">
          <button type="button" class="mode-pill-opt ${item.mode === 'REMINDER' ? 'selected' : ''}" data-mode="REMINDER">🔔 Reminder Only</button>
          <button type="button" class="mode-pill-opt ${item.mode === 'REDIRECT' ? 'selected' : ''}" data-mode="REDIRECT">↗ Redirect to Site</button>
          <button type="button" class="mode-pill-opt ${item.mode === 'ALARM' ? 'selected' : ''}" data-mode="ALARM">⏰ Alarm</button>
          <button type="button" class="mode-pill-opt ${item.mode === 'ALARM_REDIRECT' ? 'selected' : ''}" data-mode="ALARM_REDIRECT">⚡ Alarm + Redirect</button>
        </div>
      </div>
    </div>
  `).join('');

  // Attach mode toggle click listeners
  detectedItemsList.querySelectorAll('.mode-pill-opt').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const row = e.target.closest('.detected-row');
      const idx = row.getAttribute('data-index');
      const mode = e.target.getAttribute('data-mode');

      row.querySelectorAll('.mode-pill-opt').forEach(p => p.classList.remove('selected'));
      e.target.classList.add('selected');
      detectedItems[idx].mode = mode;
    });
  });

  extractionReviewSection.scrollIntoView({ behavior: 'smooth' });
}

// BATCH CONFIRM & SAVE ALL DETECTED ITEMS AT ONCE
btnSaveExtractedDeadlines.addEventListener('click', async () => {
  const rows = detectedItemsList.querySelectorAll('.detected-row');
  const payloadList = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const title = row.querySelector('.detected-title-input').value.trim();
    const dateVal = row.querySelector('.detected-date-input').value;
    const url = row.querySelector('.detected-url-input').value.trim();
    const mode = detectedItems[i].mode || 'ALARM_REDIRECT';

    if (!title || !url || !dateVal) continue;

    payloadList.push({
      title: title,
      category: 'Schedule',
      targetUrl: url,
      targetTime: new Date(dateVal).toISOString(),
      notes: `Alert Mode: ${mode}`,
      mode: mode,
      remind5Days: true,
      remind1Day: true,
      remindExact: true
    });
  }

  if (payloadList.length === 0) {
    showToast({ title: 'Validation Warning', message: 'No valid items to save.', type: 'warning' });
    return;
  }

  try {
    const res = await fetch('/api/deadlines/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: payloadList })
    });
    const json = await res.json();

    if (json.success) {
      await loadDeadlines();
      extractionReviewSection.classList.add('hidden');
      detectedItems = [];

      showToast({
        title: 'All Deadlines Scheduled',
        message: `Successfully scheduled ${json.count} task${json.count > 1 ? 's' : ''} with exact dates and redirect links!`,
        type: 'success',
        duration: 5000
      });
    } else {
      showToast({ title: 'Scheduling Error', message: json.error || 'Could not schedule.', type: 'error' });
    }
  } catch (err) {
    showToast({ title: 'Server Error', message: 'Failed to connect to backend.', type: 'error' });
  }
});

btnCancelExtraction.onclick = () => {
  extractionReviewSection.classList.add('hidden');
  detectedItems = [];
};

// ==============================================================
// 7. SCHEDULE RENDERING & LIVE COUNTDOWNS
// ==============================================================
function renderSchedule() {
  if (navScheduleCount) {
    navScheduleCount.textContent = deadlines.length;
  }

  const filtered = deadlines.filter(d => {
    if (activeFilter === 'ALL') return true;
    const mode = d.mode || (d.notes && d.notes.includes('REDIRECT') ? 'REDIRECT' : 'ALARM');
    return mode.includes(activeFilter);
  });

  if (filtered.length === 0) {
    scheduleGrid.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');

  scheduleGrid.innerHTML = filtered.map(item => {
    const targetDate = new Date(item.targetTime);
    const diffMs = targetDate.getTime() - Date.now();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    const isWithin5Days = diffMs > 0 && diffDays <= 5;

    const mode = item.mode || 'ALARM_REDIRECT';
    let badgeClass = 'badge-redirect';
    let badgeLabel = '↗ Redirection';

    if (mode === 'REMINDER') {
      badgeClass = 'badge-reminder';
      badgeLabel = '🔔 Reminder Only';
    } else if (mode === 'ALARM') {
      badgeClass = 'badge-alarm';
      badgeLabel = '⏰ Alarm';
    } else if (mode === 'ALARM_REDIRECT') {
      badgeClass = 'badge-alarm';
      badgeLabel = '⚡ Alarm + Redirect';
    }

    return `
      <div class="cadence-card" data-id="${item.id}">
        <div>
          <div class="card-header-row">
            <h3 class="card-title">${escapeHtml(item.title)}</h3>
            <span class="mode-badge ${badgeClass}">${badgeLabel}</span>
          </div>

          <div class="card-due-box">
            <span class="due-label">Due: ${formatDate(targetDate)}</span>
            <span class="due-countdown" data-target="${item.targetTime}">
              ${formatCountdown(diffMs)}
            </span>
          </div>

          <!-- 5-Day Preparation Window Indicator -->
          ${isWithin5Days ? `
            <div class="five-day-alert-banner">
              <span>🔔 <strong>5-Day Window:</strong> Reminder active to prepare work</span>
            </div>
          ` : ''}

          <!-- Destination Website -->
          <a href="${escapeHtml(item.targetUrl)}" target="_blank" rel="noopener noreferrer" class="card-destination-link" title="Open platform directly">
            <span>🌐</span>
            <span class="link-url-text">${escapeHtml(item.targetUrl)}</span>
          </a>

          ${item.notes ? `
            <div class="card-notes-preview">
              ${escapeHtml(item.notes)}
            </div>
          ` : ''}
        </div>

        <div class="card-actions-row">
          <button class="btn-card-edit" onclick="openEditModal('${item.id}')">
            ✏️ Edit
          </button>
          <button class="btn-card-test" onclick="simulateAlarm('${item.id}')">
            ⚡ Test (5s)
          </button>
          <button class="btn-card-delete" onclick="removeDeadline('${item.id}', '${escapeHtml(item.title)}')" title="Delete">
            🗑
          </button>
        </div>
      </div>
    `;
  }).join('');

  checkMissedAlarms();
}

function startTicker() {
  if (tickerInterval) clearInterval(tickerInterval);

  tickerInterval = setInterval(() => {
    const now = Date.now();
    document.querySelectorAll('.due-countdown').forEach(el => {
      const targetIso = el.getAttribute('data-target');
      if (!targetIso) return;
      const targetMs = new Date(targetIso).getTime();
      const diffMs = targetMs - now;
      el.textContent = formatCountdown(diffMs);

      // Trigger if deadline arrives
      if (diffMs <= 0 && diffMs >= -2000 && !activeRingingItem) {
        const card = el.closest('.cadence-card');
        if (card) {
          const id = card.getAttribute('data-id');
          const found = deadlines.find(d => d.id === id);
          if (found) triggerAlertAction(found);
        }
      }
    });
  }, 1000);
}

// ==============================================================
// 8. ALERT DISPATCHER (REMINDER, REDIRECT, OR ALARM)
// ==============================================================
function triggerAlertAction(item) {
  const mode = item.mode || 'ALARM_REDIRECT';

  if (mode === 'REMINDER') {
    showToast({
      title: 'Gentle Reminder',
      message: `"${item.title}" is due now!`,
      type: 'info',
      duration: 6000
    });
  } else if (mode === 'REDIRECT') {
    let url = item.targetUrl;
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    showToast({
      title: 'Auto-Redirecting',
      message: `Opening ${url} to begin work.`,
      type: 'success'
    });
    window.open(url, '_blank');
  } else {
    // Persistent Ringing Screen
    showAlarmOverlay(item);
  }
}

function showAlarmOverlay(item) {
  activeRingingItem = item;

  alarmTitle.textContent = item.title;
  alarmUrl.textContent = item.targetUrl;
  alarmClockTime.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (item.notes) {
    alarmNotes.textContent = item.notes;
    alarmNotesBox.classList.remove('hidden');
  } else {
    alarmNotesBox.classList.add('hidden');
  }

  alarmModal.classList.remove('hidden');
  alarmAudio.startAlarm();

  // Trigger system desktop notification & title flashing for background tabs/windows
  desktopAlerts.triggerBackgroundAlert(item);
}

// Stop Alarm & Open Website Button
btnAlarmRedirect.addEventListener('click', async () => {
  if (!activeRingingItem) return;

  alarmAudio.stopAlarm();
  desktopAlerts.stopBackgroundAlert();

  // Copy notes to clipboard
  if (activeRingingItem.notes && navigator.clipboard) {
    try { await navigator.clipboard.writeText(activeRingingItem.notes); } catch (e) {}
  }

  let url = activeRingingItem.targetUrl.trim();
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

  alarmModal.classList.add('hidden');
  activeRingingItem = null;

  showToast({
    title: 'Redirecting to Site',
    message: 'Alarm stopped and destination opened.',
    type: 'success'
  });

  window.open(url, '_blank');
});

btnAlarmSnooze.addEventListener('click', () => {
  alarmAudio.stopAlarm();
  desktopAlerts.stopBackgroundAlert();
  alarmModal.classList.add('hidden');
  const temp = { ...activeRingingItem };
  activeRingingItem = null;

  showToast({
    title: 'Alarm Snoozed',
    message: `"${temp.title}" snoozed for 2 minutes.`,
    type: 'info'
  });

  setTimeout(() => {
    showAlarmOverlay(temp);
  }, 2 * 60 * 1000);
});

btnAlarmDismiss.addEventListener('click', () => {
  alarmAudio.stopAlarm();
  desktopAlerts.stopBackgroundAlert();
  alarmModal.classList.add('hidden');
  activeRingingItem = null;
  showToast({
    title: 'Alarm Dismissed',
    message: 'Alarm silenced.',
    type: 'info'
  });
});

// Live 5s simulation
window.simulateAlarm = function(id) {
  const found = deadlines.find(d => d.id === id);
  if (!found) return;

  showToast({
    title: 'Testing Alert Mode',
    message: `Triggering in 5 seconds for "${found.title}"...`,
    type: 'info',
    duration: 5000
  });

  setTimeout(() => {
    triggerAlertAction(found);
  }, 5000);
};

// ==============================================================
// 9. MANUAL ADD MODAL & UPLOAD LISTENERS
// ==============================================================
btnOpenManualAdd.onclick = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);
  document.getElementById('manualDateTime').value = formatDateTimeLocal(tomorrow);
  manualAddModal.classList.remove('hidden');
};

function closeManualModal() {
  manualAddModal.classList.add('hidden');
  manualAddForm.reset();
}

btnCloseManualModal.onclick = closeManualModal;
btnCancelManual.onclick = closeManualModal;

// Quick Presets
document.querySelectorAll('.preset-tag').forEach(tag => {
  tag.addEventListener('click', () => {
    const offset = parseInt(tag.getAttribute('data-offset'), 10);
    const date = new Date(Date.now() + offset * 1000);
    document.getElementById('manualDateTime').value = formatDateTimeLocal(date);
  });
});

manualAddForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const title = document.getElementById('manualTitle').value;
  const category = document.getElementById('manualCategory').value;
  const targetUrl = document.getElementById('manualUrl').value;
  const targetTime = document.getElementById('manualDateTime').value;
  const notes = document.getElementById('manualNotes').value;
  const mode = document.querySelector('input[name="alertMode"]:checked').value;

  const success = await saveDeadline({
    title,
    category,
    targetUrl,
    targetTime: new Date(targetTime).toISOString(),
    notes,
    mode,
    remind5Days: true,
    remind1Day: true,
    remindExact: true
  });

  if (success) {
    closeManualModal();
  }
});

// Dropzone File Handlers
dropzone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropzone.classList.add('dragover');
});

dropzone.addEventListener('dragleave', () => {
  dropzone.classList.remove('dragover');
});

dropzone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropzone.classList.remove('dragover');
  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
    handlePdfUpload(e.dataTransfer.files[0]);
  }
});

pdfFileInput.addEventListener('change', (e) => {
  if (e.target.files && e.target.files[0]) {
    handlePdfUpload(e.target.files[0]);
  }
});

// Toggle Paste Area
togglePasteBox.onclick = () => {
  pasteScheduleBox.classList.toggle('hidden');
};

btnParseText.onclick = () => {
  const text = scheduleTextInput.value.trim();
  if (!text) {
    showToast({ title: 'Input Required', message: 'Please paste some schedule text first.', type: 'warning' });
    return;
  }
  parseSyllabusText(text);
};

// Filter Pills
document.querySelectorAll('.filter-pills .pill').forEach(pill => {
  pill.addEventListener('click', () => {
    document.querySelectorAll('.filter-pills .pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    activeFilter = pill.getAttribute('data-filter');
    renderSchedule();
  });
});

// ==============================================================
// 10. EDIT MODAL & MISSED ALARMS / OFFLINE RECOVERY
// ==============================================================
function checkMissedAlarms() {
  const missedContainer = document.getElementById('missedAlarmsContainer');
  const missedList = document.getElementById('missedCardsList');
  if (!missedContainer || !missedList) return;

  const now = Date.now();
  // Filter items where targetTime was in the past (> 2 minutes ago) and status is ACTIVE
  const missed = deadlines.filter(d => {
    const t = new Date(d.targetTime).getTime();
    return (now - t) > 120000 && d.status === 'ACTIVE';
  });

  if (missed.length === 0) {
    missedContainer.classList.add('hidden');
    return;
  }

  missedContainer.classList.remove('hidden');
  missedList.innerHTML = missed.map(item => {
    const diffMs = now - new Date(item.targetTime).getTime();
    const timeAgoStr = formatTimeAgo(diffMs);

    return `
      <div class="missed-card-item">
        <div class="missed-card-info">
          <h4>${escapeHtml(item.title)}</h4>
          <span class="missed-card-time">Missed ${timeAgoStr} ago (Target: ${formatDate(new Date(item.targetTime))})</span>
        </div>
        <div class="missed-card-actions">
          <button class="btn btn-sm btn-primary" onclick="openMissedLink('${escapeHtml(item.targetUrl)}', '${item.id}')">
            ↗ Open Website to Work Now
          </button>
          <button class="btn btn-sm btn-outline" onclick="rescheduleDeadline('${item.id}', 60)">
            ⏰ +1 Hour
          </button>
          <button class="btn btn-sm btn-ghost" onclick="acknowledgeDeadline('${item.id}')" title="Mark Done">
            ✓ Done
          </button>
        </div>
      </div>
    `;
  }).join('');
}

window.openMissedLink = async function(url, id) {
  let target = url;
  if (!/^https?:\/\//i.test(target)) target = 'https://' + target;
  window.open(target, '_blank');
  await acknowledgeDeadline(id);
};

window.acknowledgeDeadline = async function(id) {
  try {
    await fetch(`/api/deadlines/${id}/acknowledge`, { method: 'POST' });
    await loadDeadlines();
    showToast({ title: 'Completed', message: 'Missed deadline marked as done.', type: 'info' });
  } catch(e) {}
};

window.rescheduleDeadline = async function(id, mins) {
  try {
    await fetch(`/api/deadlines/${id}/snooze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ minutes: mins })
    });
    await loadDeadlines();
    showToast({ title: 'Rescheduled', message: `Deadline postponed by ${mins} minutes.`, type: 'success' });
  } catch(e) {}
};

const btnDismissAllMissed = document.getElementById('btnDismissAllMissed');
if (btnDismissAllMissed) {
  btnDismissAllMissed.onclick = async () => {
    const missed = deadlines.filter(d => {
      return (Date.now() - new Date(d.targetTime).getTime()) > 120000 && d.status === 'ACTIVE';
    });
    for (const m of missed) {
      await fetch(`/api/deadlines/${m.id}/acknowledge`, { method: 'POST' });
    }
    await loadDeadlines();
    showToast({ title: 'Cleared', message: 'All missed alarms acknowledged.', type: 'info' });
  };
}

// Edit Modal Handlers
const editModal = document.getElementById('editModal');
const editDeadlineForm = document.getElementById('editDeadlineForm');
const btnCloseEditModal = document.getElementById('btnCloseEditModal');
const btnCancelEdit = document.getElementById('btnCancelEdit');

window.openEditModal = function(id) {
  const found = deadlines.find(d => d.id === id);
  if (!found) return;

  document.getElementById('editId').value = found.id;
  document.getElementById('editTitle').value = found.title;
  document.getElementById('editCategory').value = found.category || 'Assignment';
  document.getElementById('editDateTime').value = formatDateTimeLocal(new Date(found.targetTime));
  document.getElementById('editUrl').value = found.targetUrl;
  document.getElementById('editNotes').value = found.notes || '';

  const mode = found.mode || 'ALARM_REDIRECT';
  const radio = document.querySelector(`input[name="editAlertMode"][value="${mode}"]`);
  if (radio) radio.checked = true;

  editModal.classList.remove('hidden');
};

function closeEditModal() {
  editModal.classList.add('hidden');
  editDeadlineForm.reset();
}

if (btnCloseEditModal) btnCloseEditModal.onclick = closeEditModal;
if (btnCancelEdit) btnCancelEdit.onclick = closeEditModal;

if (editDeadlineForm) {
  editDeadlineForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('editId').value;
    const title = document.getElementById('editTitle').value;
    const category = document.getElementById('editCategory').value;
    const targetDateTime = document.getElementById('editDateTime').value;
    const targetUrl = document.getElementById('editUrl').value;
    const notes = document.getElementById('editNotes').value;
    const mode = document.querySelector('input[name="editAlertMode"]:checked').value;

    try {
      const res = await fetch(`/api/deadlines/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          category,
          targetTime: new Date(targetDateTime).toISOString(),
          targetUrl,
          notes,
          mode,
          status: 'ACTIVE'
        })
      });
      const json = await res.json();
      if (json.success) {
        closeEditModal();
        await loadDeadlines();
        showToast({
          title: 'Deadline Updated',
          message: `Changes to "${title}" saved successfully.`,
          type: 'success'
        });
      }
    } catch(e) {
      showToast({ title: 'Error', message: 'Could not update deadline.', type: 'error' });
    }
  });
}

function formatTimeAgo(diffMs) {
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ${mins % 60}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

// ==============================================================
// 11. HELPERS
// ==============================================================
function formatCountdown(diffMs) {
  if (diffMs <= 0) return 'Due Now';
  const totalSec = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;

  if (days > 0) return `${days}d ${hours}h ${mins}m`;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function formatDate(date) {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatDateTimeLocal(date) {
  const pad = n => n.toString().padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Initial Run
loadDeadlines();
startTicker();
desktopAlerts.init();
