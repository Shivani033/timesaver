const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'deadlines.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initial sample seed data (Academic, Travel/Tatkal, Office Meeting)
const DEFAULT_DEADLINES = [
  {
    id: 'evt-1',
    title: 'Semester Course Enrollment',
    category: 'Academic',
    targetUrl: 'https://portal.university.edu/enrollment',
    targetTime: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(), // 6 days from now
    remind5Days: true,
    remind1Day: true,
    remind15Min: true,
    remindExact: true,
    notes: 'Roll No: 2024CS089 | Priority Subjects: CS301, CS302',
    status: 'ACTIVE',
    createdAt: new Date().toISOString()
  },
  {
    id: 'evt-2',
    title: 'IRCTC Tatkal Train Ticket (AC Tier)',
    category: 'Booking',
    targetUrl: 'https://www.irctc.co.in/nget/train-search',
    targetTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days from now
    remind5Days: false,
    remind1Day: true,
    remind15Min: true,
    remindExact: true,
    notes: 'Train: 12952 Rajdhani | Keep IRCTC wallet logged in',
    status: 'ACTIVE',
    createdAt: new Date().toISOString()
  },
  {
    id: 'evt-3',
    title: 'Weekly Sprint & Project Sync',
    category: 'Meeting',
    targetUrl: 'https://meet.google.com/abc-defg-hij',
    targetTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
    remind5Days: false,
    remind1Day: false,
    remind15Min: true,
    remindExact: true,
    notes: 'Present demo slides for C++ & MERN Architecture',
    status: 'ACTIVE',
    createdAt: new Date().toISOString()
  }
];

function readDeadlines() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify(DEFAULT_DEADLINES, null, 2));
      return DEFAULT_DEADLINES;
    }
    const content = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    console.error('Error reading deadlines:', err);
    return [];
  }
}

function writeDeadlines(deadlines) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(deadlines, null, 2));
  } catch (err) {
    console.error('Error writing deadlines:', err);
  }
}

// In-memory queue of actively ringing/triggered alarms
let activeTriggeredAlarm = null;

// GET /api/deadlines - List all deadlines
app.get('/api/deadlines', (req, res) => {
  const deadlines = readDeadlines();
  // Sort by targetTime ascending (earliest first)
  deadlines.sort((a, b) => new Date(a.targetTime) - new Date(b.targetTime));
  res.json({ success: true, count: deadlines.length, data: deadlines });
});

// POST /api/deadlines - Create a new deadline
app.post('/api/deadlines', (req, res) => {
  const {
    title,
    category = 'General',
    targetUrl,
    targetTime,
    remind5Days = true,
    remind1Day = true,
    remind15Min = true,
    remindExact = true,
    notes = '',
    mode = 'ALARM_REDIRECT'
  } = req.body;

  if (!title || !targetUrl || !targetTime) {
    return res.status(400).json({
      success: false,
      error: 'Title, targetUrl, and targetTime are required.'
    });
  }

  // Ensure targetUrl has protocol
  let normalizedUrl = targetUrl.trim();
  if (!/^https?:\/\//i.test(normalizedUrl)) {
    normalizedUrl = 'https://' + normalizedUrl;
  }

  const newDeadline = {
    id: 'evt-' + Date.now(),
    title: title.trim(),
    category: category.trim(),
    targetUrl: normalizedUrl,
    targetTime: new Date(targetTime).toISOString(),
    remind5Days: Boolean(remind5Days),
    remind1Day: Boolean(remind1Day),
    remind15Min: Boolean(remind15Min),
    remindExact: Boolean(remindExact),
    notes: notes.trim(),
    mode: mode,
    status: 'ACTIVE',
    createdAt: new Date().toISOString()
  };

  const deadlines = readDeadlines();
  deadlines.push(newDeadline);
  writeDeadlines(deadlines);

  res.status(201).json({ success: true, data: newDeadline });
});

// POST /api/deadlines/batch - Save multiple deadlines at once
app.post('/api/deadlines/batch', (req, res) => {
  const { items } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, error: 'No items provided for batch creation.' });
  }

  const deadlines = readDeadlines();
  const addedList = [];

  for (const item of items) {
    let normalizedUrl = (item.targetUrl || '').trim();
    if (!normalizedUrl) continue;
    if (!/^https?:\/\//i.test(normalizedUrl)) {
      normalizedUrl = 'https://' + normalizedUrl;
    }

    const newObj = {
      id: 'evt-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      title: (item.title || 'Untitled Deadline').trim(),
      category: (item.category || 'Schedule').trim(),
      targetUrl: normalizedUrl,
      targetTime: new Date(item.targetTime).toISOString(),
      remind5Days: item.remind5Days !== undefined ? Boolean(item.remind5Days) : true,
      remind1Day: item.remind1Day !== undefined ? Boolean(item.remind1Day) : true,
      remind15Min: item.remind15Min !== undefined ? Boolean(item.remind15Min) : true,
      remindExact: item.remindExact !== undefined ? Boolean(item.remindExact) : true,
      notes: (item.notes || '').trim(),
      mode: item.mode || 'ALARM_REDIRECT',
      status: 'ACTIVE',
      createdAt: new Date().toISOString()
    };
    deadlines.push(newObj);
    addedList.push(newObj);
  }

  writeDeadlines(deadlines);
  res.status(201).json({ success: true, count: addedList.length, data: addedList });
});

// DELETE /api/deadlines/:id - Delete a deadline
app.delete('/api/deadlines/:id', (req, res) => {
  const { id } = req.params;
  let deadlines = readDeadlines();
  const initialLength = deadlines.length;
  deadlines = deadlines.filter(d => d.id !== id);

  if (deadlines.length === initialLength) {
    return res.status(404).json({ success: false, error: 'Deadline not found.' });
  }

  writeDeadlines(deadlines);
  res.json({ success: true, message: 'Deadline removed successfully.' });
});

// PUT /api/deadlines/:id - Update / Edit a deadline
app.put('/api/deadlines/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  let deadlines = readDeadlines();
  const idx = deadlines.findIndex(d => d.id === id);

  if (idx === -1) {
    return res.status(404).json({ success: false, error: 'Deadline not found.' });
  }

  if (updates.title) deadlines[idx].title = updates.title.trim();
  if (updates.category) deadlines[idx].category = updates.category.trim();
  if (updates.targetUrl) {
    let url = updates.targetUrl.trim();
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    deadlines[idx].targetUrl = url;
  }
  if (updates.targetTime) deadlines[idx].targetTime = new Date(updates.targetTime).toISOString();
  if (updates.notes !== undefined) deadlines[idx].notes = updates.notes.trim();
  if (updates.mode) deadlines[idx].mode = updates.mode;
  if (updates.status) deadlines[idx].status = updates.status;
  if (updates.remind5Days !== undefined) deadlines[idx].remind5Days = Boolean(updates.remind5Days);
  if (updates.remind1Day !== undefined) deadlines[idx].remind1Day = Boolean(updates.remind1Day);
  if (updates.remindExact !== undefined) deadlines[idx].remindExact = Boolean(updates.remindExact);

  writeDeadlines(deadlines);
  res.json({ success: true, data: deadlines[idx] });
});

// POST /api/deadlines/:id/snooze - Reschedule missed or ringing alarm
app.post('/api/deadlines/:id/snooze', (req, res) => {
  const { id } = req.params;
  const { minutes = 15 } = req.body;
  let deadlines = readDeadlines();
  const found = deadlines.find(d => d.id === id);
  if (!found) return res.status(404).json({ success: false, error: 'Deadline not found' });

  found.targetTime = new Date(Date.now() + minutes * 60 * 1000).toISOString();
  found.status = 'ACTIVE';
  writeDeadlines(deadlines);
  res.json({ success: true, data: found });
});

// POST /api/deadlines/:id/acknowledge - Mark missed or triggered deadline as completed
app.post('/api/deadlines/:id/acknowledge', (req, res) => {
  const { id } = req.params;
  let deadlines = readDeadlines();
  const found = deadlines.find(d => d.id === id);
  if (!found) return res.status(404).json({ success: false, error: 'Deadline not found' });

  found.status = 'COMPLETED';
  writeDeadlines(deadlines);
  res.json({ success: true, data: found });
});

// GET /api/deadlines/export-ics - Download .ics for Apple Calendar / Phone sync
app.get('/api/deadlines/export-ics', (req, res) => {
  const deadlines = readDeadlines();
  let ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Cadence Sentinel//Academic Schedule//EN',
    'CALSCALE:GREGORIAN'
  ];

  for (const item of deadlines) {
    if (item.status === 'COMPLETED') continue;
    const d = new Date(item.targetTime);
    const dtStamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const dtStart = d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const dtEnd = new Date(d.getTime() + 30 * 60 * 1000).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    ics.push('BEGIN:VEVENT');
    ics.push(`UID:${item.id}@cadence-sentinel`);
    ics.push(`DTSTAMP:${dtStamp}`);
    ics.push(`DTSTART:${dtStart}`);
    ics.push(`DTEND:${dtEnd}`);
    ics.push(`SUMMARY:${item.title.replace(/[,;]/g, ' ')}`);
    ics.push(`DESCRIPTION:Target: ${item.targetUrl}\\nNotes: ${item.notes || 'None'}`);
    ics.push(`URL:${item.targetUrl}`);
    ics.push('BEGIN:VALARM');
    ics.push('ACTION:DISPLAY');
    ics.push('DESCRIPTION:Reminder: ' + item.title);
    ics.push('TRIGGER:-P5D');
    ics.push('END:VALARM');
    ics.push('BEGIN:VALARM');
    ics.push('ACTION:AUDIO');
    ics.push('TRIGGER:PT0M');
    ics.push('END:VALARM');
    ics.push('END:VEVENT');
  }

  ics.push('END:VCALENDAR');
  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="cadence-deadlines.ics"');
  res.send(ics.join('\r\n'));
});

// Function to trigger system notification on macOS (appears across ALL spaces and full-screen apps)
function triggerMacSystemAlert(item) {
  if (process.platform !== 'darwin') return;
  const { exec } = require('child_process');
  const title = (item.title || 'Deadline Alert').replace(/"/g, '\\"');
  const url = (item.targetUrl || '').replace(/"/g, '\\"');

  const notifCmd = `osascript -e 'display notification "Target: ${url}" with title "Cadence Sentinel Alert" subtitle "${title} Due Now!" sound name "Glass"'`;
  exec(notifCmd, (err) => {
    if (err) console.error('macOS notification error:', err.message);
  });

  // If redirect is requested, open target URL in browser on current active macOS space
  if (item.mode === 'REDIRECT' || item.mode === 'ALARM_REDIRECT') {
    exec(`open "${url}"`, (err) => {
      if (err) console.error('macOS open error:', err.message);
    });
  }
}

// POST /api/deadlines/:id/test-trigger - Trigger alarm immediately (for live testing)
app.post('/api/deadlines/:id/test-trigger', (req, res) => {
  const { id } = req.params;
  const deadlines = readDeadlines();
  const found = deadlines.find(d => d.id === id);

  if (!found) {
    return res.status(404).json({ success: false, error: 'Deadline not found.' });
  }

  activeTriggeredAlarm = {
    ...found,
    triggeredAt: new Date().toISOString(),
    triggerType: 'EXACT_TIME_REDIRECT'
  };

  triggerMacSystemAlert(found);

  res.json({
    success: true,
    message: 'Test alarm triggered! Incoming alarm ringing initiated.',
    alarm: activeTriggeredAlarm
  });
});

// GET /api/alarm/current - Check if any persistent alarm is currently ringing
app.get('/api/alarm/current', (req, res) => {
  res.json({
    success: true,
    isRinging: activeTriggeredAlarm !== null,
    alarm: activeTriggeredAlarm
  });
});

// POST /api/alarm/dismiss - Dismiss or stop the ringing alarm
app.post('/api/alarm/dismiss', (req, res) => {
  const prevAlarm = activeTriggeredAlarm;
  activeTriggeredAlarm = null;
  res.json({
    success: true,
    message: 'Alarm dismissed.',
    lastAlarm: prevAlarm
  });
});

// Periodic background check for scheduled deadlines
setInterval(() => {
  const now = Date.now();
  const deadlines = readDeadlines();

  for (const item of deadlines) {
    if (item.status !== 'ACTIVE') continue;
    const targetMs = new Date(item.targetTime).getTime();

    // If within 1 second of target time or overdue by < 30 seconds and not yet ringing
    if (Math.abs(now - targetMs) < 2000 && !activeTriggeredAlarm) {
      activeTriggeredAlarm = {
        ...item,
        triggeredAt: new Date().toISOString(),
        triggerType: 'EXACT_TIME_REDIRECT'
      };
      console.log(`[ALARM RINGING] Deadline '${item.title}' is due! Target URL: ${item.targetUrl}`);
      triggerMacSystemAlert(item);
      break;
    }
  }
}, 1000);

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`Smart Deadline Sentinel Backend running on port ${PORT}`);
  console.log(`Endpoints:`);
  console.log(`  GET    /api/deadlines`);
  console.log(`  POST   /api/deadlines`);
  console.log(`  DELETE /api/deadlines/:id`);
  console.log(`  POST   /api/deadlines/:id/test-trigger`);
  console.log(`  GET    /api/alarm/current`);
  console.log(`  POST   /api/alarm/dismiss`);
  console.log(`=======================================================`);
});
