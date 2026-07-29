/**
 * Attendance Tracker — Google Apps Script backend
 * Deploy as Web App (Execute as: Me, Access: Anyone with the link)
 *
 * SETUP:
 * 1. Replace SHEET_ID below with your spreadsheet's ID (from its URL).
 * 2. Replace SECRET_TOKEN with a long random string. Use the SAME value
 *    as GAS_TOKEN in your Vercel environment variables.
 * 3. Deploy > New deployment > Web app.
 * 4. Copy the deployment URL into GAS_URL in Vercel.
 *
 * SHEET SCHEMA (tab names and headers must match exactly):
 * Subjects:      SubjectID | SubjectName | Type
 * Timetable:     Day | SlotId | SubjectID | SubjectName | Type
 * AttendanceLog: Date | Day | SlotId | SubjectID | SubjectName | Type | Status | Timestamp
 * Settings:      Key | Value
 *
 * SlotId exists so the SAME subject can appear more than once on the same
 * day (e.g. two DSTL lectures on Tuesday) and each occurrence is tracked
 * and marked independently.
 */

const SHEET_ID = 'PASTE_YOUR_SHEET_ID_HERE';
const SECRET_TOKEN = 'PASTE_A_LONG_RANDOM_SECRET_HERE';

const TAB_SUBJECTS = 'Subjects';
const TAB_TIMETABLE = 'Timetable';
const TAB_LOG = 'AttendanceLog';
const TAB_SETTINGS = 'Settings';

// ---------- Entry points ----------

function doGet(e) {
  return route(e, null);
}

function doPost(e) {
  const body = e.postData && e.postData.contents ? JSON.parse(e.postData.contents) : {};
  return route(e, body);
}

function route(e, body) {
  const params = e.parameter || {};
  const token = params.token || (body && body.token);
  if (token !== SECRET_TOKEN) {
    return jsonOut({ error: 'Unauthorized' });
  }

  const action = params.action || (body && body.action);
  try {
    switch (action) {
      case 'getSubjects':
        return jsonOut({ subjects: getSubjects() });

      case 'getDayClasses':
        return jsonOut(getDayClasses(params.date));

      case 'markAttendance':
        return jsonOut(markAttendance(body.date, body.slotId, body.subjectId, body.status));

      case 'getTimetable':
        return jsonOut({ slots: getTimetableForDay(params.day) });

      case 'addSubjectToDay':
        return jsonOut(addSubjectToDay(body.day, body.subjectId));

      case 'removeSubjectFromDay':
        return jsonOut(removeSubjectFromDay(body.day, body.slotId));

      case 'getSummary':
        return jsonOut(getSummary());

      case 'getSettings':
        return jsonOut(getSettings());

      default:
        return jsonOut({ error: 'Unknown action: ' + action });
    }
  } catch (err) {
    return jsonOut({ error: String(err) });
  }
}

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ---------- Sheet helpers ----------

function getSheet(name) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName(name);
  if (!sheet) throw new Error('Sheet tab not found: ' + name);
  return sheet;
}

function sheetToObjects(sheetName) {
  const sheet = getSheet(sheetName);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0];
  const rows = [];
  for (let i = 1; i < values.length; i++) {
    if (values[i].join('') === '') continue; // skip fully blank rows
    const obj = {};
    headers.forEach((h, idx) => { obj[h] = values[i][idx]; });
    obj.__row = i + 1; // 1-based sheet row number, useful for updates
    rows.push(obj);
  }
  return rows;
}

// Parses 'YYYY-MM-DD' into a Date at local noon (avoids timezone day-shift bugs)
function parseDateStr(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

function dayNameFromDateStr(dateStr) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[parseDateStr(dateStr).getDay()];
}

function formatDate(value) {
  if (Object.prototype.toString.call(value) === '[object Date]') {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return String(value).slice(0, 10);
}

// ---------- Subjects ----------

function getSubjects() {
  return sheetToObjects(TAB_SUBJECTS).map(r => ({
    subjectId: r.SubjectID,
    subjectName: r.SubjectName,
    type: r.Type
  }));
}

// ---------- Timetable (day-wise subject setup) ----------
// Each row is one "slot" — one occurrence of a subject on a given day.
// The same subject can have multiple slots on the same day (e.g. 2 lectures).

function getTimetableForDay(day) {
  return sheetToObjects(TAB_TIMETABLE)
    .filter(r => r.Day === day)
    .map(r => ({
      slotId: r.SlotId,
      subjectId: r.SubjectID,
      subjectName: r.SubjectName,
      type: r.Type
    }));
}

function addSubjectToDay(day, subjectId) {
  const subject = getSubjects().find(s => s.subjectId === subjectId);
  if (!subject) throw new Error('Subject not found: ' + subjectId);

  const slotId = Utilities.getUuid();
  const sheet = getSheet(TAB_TIMETABLE);
  sheet.appendRow([day, slotId, subject.subjectId, subject.subjectName, subject.type]);
  return { success: true, slotId: slotId };
}

function removeSubjectFromDay(day, slotId) {
  const sheet = getSheet(TAB_TIMETABLE);
  const rows = sheetToObjects(TAB_TIMETABLE);
  const match = rows.find(r => r.Day === day && r.SlotId === slotId);
  if (match) sheet.deleteRow(match.__row);
  return { success: true };
}

// ---------- Daily attendance marking ----------

function getDayClasses(dateStr) {
  const day = dayNameFromDateStr(dateStr);
  const scheduled = sheetToObjects(TAB_TIMETABLE).filter(r => r.Day === day);
  const logRows = sheetToObjects(TAB_LOG).filter(r => formatDate(r.Date) === dateStr);

  const classes = scheduled.map(s => {
    const logMatch = logRows.find(l => l.SlotId === s.SlotId);
    return {
      slotId: s.SlotId,
      subjectId: s.SubjectID,
      subjectName: s.SubjectName,
      type: s.Type,
      status: logMatch ? logMatch.Status : null // null = not marked yet
    };
  });

  return { date: dateStr, day: day, classes: classes };
}

function markAttendance(dateStr, slotId, subjectId, status) {
  const subject = getSubjects().find(s => s.subjectId === subjectId);
  if (!subject) throw new Error('Subject not found: ' + subjectId);

  const day = dayNameFromDateStr(dateStr);
  const sheet = getSheet(TAB_LOG);
  const rows = sheetToObjects(TAB_LOG);
  const existing = rows.find(r => formatDate(r.Date) === dateStr && r.SlotId === slotId);
  const now = new Date();

  if (existing) {
    // upsert: update the Status + Timestamp cells in place (columns 7 and 8)
    sheet.getRange(existing.__row, 7).setValue(status);
    sheet.getRange(existing.__row, 8).setValue(now);
  } else {
    sheet.appendRow([dateStr, day, slotId, subject.subjectId, subject.subjectName, subject.type, status, now]);
  }
  return { success: true };
}

// ---------- Settings ----------

function getSettings() {
  const rows = sheetToObjects(TAB_SETTINGS);
  const settings = {};
  rows.forEach(r => { settings[r.Key] = r.Value; });
  return settings;
}

// ---------- Summary / dashboard ----------
// Aggregation groups by SubjectID, so multiple slots of the same subject
// on the same day correctly count as separate classes toward the total.

function getSummary() {
  const settings = getSettings();
  const minPercent = Number(settings.MinAttendancePercent) || 75;
  const logRows = sheetToObjects(TAB_LOG);

  const bySubject = {};
  logRows.forEach(r => {
    const id = r.SubjectID;
    if (!bySubject[id]) {
      bySubject[id] = { subjectId: id, name: r.SubjectName, type: r.Type, attended: 0, total: 0 };
    }
    bySubject[id].total += 1;
    if (r.Status === 'Attended') bySubject[id].attended += 1;
  });

  const perSubject = Object.values(bySubject).map(s => computeStats(s, minPercent));

  const lectureRows = logRows.filter(r => r.Type === 'Lecture');
  const allLecturesOnly = computeStats({
    attended: lectureRows.filter(r => r.Status === 'Attended').length,
    total: lectureRows.length
  }, minPercent);

  const overallWithLabs = computeStats({
    attended: logRows.filter(r => r.Status === 'Attended').length,
    total: logRows.length
  }, minPercent);

  return { perSubject, allLecturesOnly, overallWithLabs, minPercent };
}

function computeStats(base, minPercent) {
  const attended = base.attended || 0;
  const total = base.total || 0;
  const percent = total === 0 ? 0 : (attended / total) * 100;
  const threshold = minPercent / 100;

  let neededToReach = 0;
  let canSkip = 0;

  if (total === 0) {
    // no data yet
  } else if (percent < minPercent) {
    neededToReach = Math.ceil((threshold * total - attended) / (1 - threshold));
  } else {
    canSkip = Math.floor((attended - threshold * total) / threshold);
  }

  return Object.assign({}, base, {
    attended, total,
    percent: Math.round(percent * 10) / 10,
    neededToReach,
    canSkip
  });
}
