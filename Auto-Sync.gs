/*************************************************
 * MOODLE → GOOGLE CALENDAR SYNC (UNIVERSAL)
 * Version: 1.3.2 (fix lỗi đồng bộ hoá các sự kiện bị người dùng xoá mất)
 *************************************************/

// =================================================
// 1. ⚙️ CẤU HÌNH CÁ NHÂN
// =================================================
const USER_CONFIG = {
  UNIVERSITY_NAME: 'UIT',
  MOODLE_URL: 'ĐIỀN_LINK_MOODLE_CỦA_BẠN_VÀO_ĐÂY',
  NOTIFY_EMAIL: '',
  REMINDERS: [0, 30, 180, 1440]
};

// =================================================
// 2. 🚀 CÁC HÀM THAO TÁC CHÍNH
// =================================================

function setupAndSync() {
  const triggers = ScriptApp.getProjectTriggers();
  if (triggers.some(t => t.getHandlerFunction() === 'syncMoodleCalendar')) {
    showMessage('⚠️ HỆ THỐNG ĐÃ CÀI ĐẶT RỒI!\n\nTool đang tự chạy ngầm mỗi ' + SYSTEM_CONFIG.SYNC_INTERVAL + ' phút. Bạn KHÔNG CẦN cài đặt lại.\n\n👉 Nếu muốn đồng bộ ngay, hãy chọn "🔄 Đồng bộ ngay".');
    return;
  }

  try {
    getLogSpreadsheet();
    createDashboard();
    const config = getActiveConfig();
    getOrCreateCalendar(config);
    getHistorySheet();
    getOrCreateInternalDBSheet();
  } catch (e) {
    showMessage('❌ LỖI CÀI ĐẶT:\n' + e.message + '\n\n👉 Điền Link Moodle vào tab "⚙️ Settings" (ô B5) rồi chọn lại "🚀 Cài đặt & đồng bộ lần đầu".');
    return;
  }

  PropertiesService.getScriptProperties().setProperty('INITIAL_SYNC_PENDING', '1');

  const result = testSync();
  if (!result || !result.ok) {
    showMessage('⚠️ Cài đặt xong nhưng đồng bộ bị lỗi:\n' + (result ? result.error : 'Không rõ') + '\n\nKiểm tra lại Link Moodle trong tab Settings.');
    return;
  }

  installTrigger();
  let msg = '✅ Cài đặt thành công!\n\n' + result.summary;
  if (result.pending > 0) msg += '\n\nCòn ' + result.pending + ' sự kiện chờ xử lý do API giới hạn. Sẽ tự làm nốt ở lần sau.';
  showMessage(msg);
}

function syncNow() {
  showToast('Đang đồng bộ với Moodle...', '🔄 Đồng bộ');
  const result = testSync();
  if (result && result.ok) {
    let msg = '✅ Đồng bộ xong!\n\n' + result.summary;
    if (result.pending > 0) msg += '\n\nCòn ' + result.pending + ' việc chờ xử lý do API giới hạn. Sẽ tự làm nốt ở lần sau.';
    showMessage(msg);
  } else {
    showMessage('❌ Đồng bộ lỗi:\n' + (result ? result.error : 'Không rõ'));
  }
}

function testSync() {
  return syncMoodleCalendar();
}

function updateDashboard() {
  createDashboard();
}

/**
 * Nút 4: Dọn dẹp thủ công các sự kiện bị nhân bản
 */
function fixDuplicates() {
  const config = getActiveConfig();
  const calendar = getOrCreateCalendar(config);
  const year = new Date().getFullYear();
  const startTime = new Date(year - 1, 0, 1);
  const endTime = new Date(year + 1, 11, 31);

  showToast('Đang quét các sự kiện trùng lặp...', '🧹 Dọn dẹp');

  const tracked = {};
  const stored = getEventDatabase();
  Object.keys(stored).forEach(uid => { if (stored[uid].eventId) tracked[stored[uid].eventId] = true; });

  const events = calendar.getEvents(startTime, endTime);
  const groups = {};
  events.forEach(evt => {
    const signature = evt.getTitle() + '_' + evt.getStartTime().getTime();
    (groups[signature] = groups[signature] || []).push(evt);
  });

  let deletedCount = 0, stop = false;
  const startedAt = Date.now();

  for (const signature of Object.keys(groups)) {
    if (stop) break;
    const group = groups[signature];
    if (group.length < 2) continue;

    // Ưu tiên giữ bản đang được tracked, nếu không có thì giữ bản đầu tiên
    let keepId = null;
    for (const e of group) {
      if (tracked[e.getId()]) { keepId = e.getId(); break; }
    }
    if (!keepId) keepId = group[0].getId();

    for (const evt of group) {
      if (evt.getId() === keepId) continue;
      if (Date.now() - startedAt > SYSTEM_CONFIG.MAX_RUNTIME_MS) { stop = true; break; }
      try {
        withRetry(() => evt.deleteEvent());
        deletedCount++;
        Utilities.sleep(400);
      } catch (e) {
        if (!isRateLimitError(e)) throw e;
        stop = true; break;
      }
    }
  }

  let msg = '🧹 Đã quét xong! Xóa thành công ' + deletedCount + ' sự kiện trùng lặp.';
  if (stop) msg += '\n\nQuá trình dừng sớm do giới hạn thời gian hoặc API. Hãy chạy lại sau ít phút để dọn tiếp.';
  showMessage(msg);
}

function createTrigger() {
  installTrigger();
  showMessage('✅ Đã tạo thành công lịch tự động đồng bộ mỗi ' + SYSTEM_CONFIG.SYNC_INTERVAL + ' phút.');
}

function installTrigger() {
  ScriptApp.getProjectTriggers().forEach(t => { if (t.getHandlerFunction() === 'syncMoodleCalendar') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('syncMoodleCalendar').timeBased().everyMinutes(SYSTEM_CONFIG.SYNC_INTERVAL).create();
}

function onOpen() {
  SpreadsheetApp.getUi().createMenu('📅 Moodle Calendar Sync')
    .addItem('🚀 Cài đặt & đồng bộ lần đầu', 'setupAndSync')
    .addItem('🔄 Đồng bộ ngay', 'syncNow')
    .addItem('📊 Cập nhật Dashboard', 'updateDashboard')
    .addItem('🧹 Dọn dẹp lịch trùng (Thủ công)', 'fixDuplicates')
    .addSeparator()
    .addItem('⚙️ Tạo trigger đồng bộ', 'createTrigger')
    .addToUi();
}

// =================================================
// 3. ⚙️ CẤU HÌNH HỆ THỐNG
// =================================================
const SYSTEM_CONFIG = {
  CURRENT_VERSION: '1.3.2',
  LOG_SHEET_NAME: 'Moodle Calendar Sync Log',
  HISTORY_SHEET_NAME: '📜 History',
  DB_SHEET_NAME: '⚙️ Internal DB',
  DASHBOARD_SHEET_NAME: '🏠 Dashboard',
  SETTINGS_SHEET_NAME: '⚙️ Settings',
  EVENTS_SHEET_NAME: '📅 Events',
  DB_CHUNK_SIZE: 40000,
  MAX_RUNTIME_MS: 4.5 * 60 * 1000,
  MAX_OPS_PER_RUN: 40,
  OP_DELAY_MS: 700,
  RETRY_ATTEMPTS: 3,
  RETRY_WAIT_MS: 5000,
  ERROR_REMINDER_COUNT: 10,
  SYNC_INTERVAL: 15,
  UPDATE_CACHE_SECONDS: 6 * 60 * 60
};

// =================================================
// 4. 🛠️ CÁC HÀM XỬ LÝ NGẦM
// =================================================

function getSafeConfig() {
  const props = PropertiesService.getScriptProperties();
  let config = {
    UNIVERSITY_NAME: props.getProperty('UNIVERSITY_NAME') || USER_CONFIG.UNIVERSITY_NAME,
    CALENDAR_NAME: props.getProperty('CALENDAR_NAME') || ('Lịch học ' + (props.getProperty('UNIVERSITY_NAME') || USER_CONFIG.UNIVERSITY_NAME)),
    MOODLE_URL: props.getProperty('MOODLE_URL') || USER_CONFIG.MOODLE_URL,
    NOTIFY_EMAIL: props.getProperty('NOTIFY_EMAIL') || USER_CONFIG.NOTIFY_EMAIL || Session.getEffectiveUser().getEmail(),
    REMINDERS: USER_CONFIG.REMINDERS
  };

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (ss) {
      const settingsSheet = ss.getSheetByName(SYSTEM_CONFIG.SETTINGS_SHEET_NAME);
      if (settingsSheet) {
        const data = settingsSheet.getRange('B3:B6').getValues();
        const sUni = String(data[0][0]).trim();
        const sCal = String(data[1][0]).trim();
        const sUrl = String(data[2][0]).trim();
        const sEmail = String(data[3][0]).trim();

        if (sUni) { config.UNIVERSITY_NAME = sUni; props.setProperty('UNIVERSITY_NAME', sUni); }
        if (sCal) { config.CALENDAR_NAME = sCal; props.setProperty('CALENDAR_NAME', sCal); }
        if (sUrl && sUrl.includes('http')) { config.MOODLE_URL = sUrl; props.setProperty('MOODLE_URL', sUrl); }
        if (sEmail) { config.NOTIFY_EMAIL = sEmail; props.setProperty('NOTIFY_EMAIL', sEmail); }
      }
    }
  } catch (e) { }
  return config;
}

function getActiveConfig() {
  const config = getSafeConfig();
  if (!config.MOODLE_URL || !config.MOODLE_URL.includes('http')) {
    throw new Error('Vui lòng điền Link Moodle vào file Google Sheet (tab ⚙️ Settings) hoặc biến USER_CONFIG trong mã nguồn.');
  }
  const props = PropertiesService.getScriptProperties();
  props.setProperty('MOODLE_URL', config.MOODLE_URL);
  props.setProperty('UNIVERSITY_NAME', config.UNIVERSITY_NAME);
  props.setProperty('CALENDAR_NAME', config.CALENDAR_NAME);
  props.setProperty('NOTIFY_EMAIL', config.NOTIFY_EMAIL);
  return config;
}

/** FIXED: luôn tạo calendar với timezone Việt Nam */
function getOrCreateCalendar(config) {
  const calendars = CalendarApp.getCalendarsByName(config.CALENDAR_NAME);
  if (calendars.length > 0) return calendars[0];

  // Tạo mới với timezone Asia/Ho_Chi_Minh
  return CalendarApp.createCalendar(config.CALENDAR_NAME, {
    description: 'Đồng bộ tự động từ Moodle ' + config.UNIVERSITY_NAME,
    timeZone: 'Asia/Ho_Chi_Minh'
  });
}

function getOrCreateInternalDBSheet() {
  const ss = getLogSpreadsheet();
  let sheet = ss.getSheetByName(SYSTEM_CONFIG.DB_SHEET_NAME);
  if (!sheet) { sheet = ss.insertSheet(SYSTEM_CONFIG.DB_SHEET_NAME); sheet.hideSheet(); }
  return sheet;
}

function getEventDatabase() {
  const sheet = getOrCreateInternalDBSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 1) return {};
  const json = sheet.getRange(1, 1, lastRow, 1).getValues().map(row => row[0]).join('');
  try {
    return json ? JSON.parse(json) : {};
  } catch (e) {
    Logger.log('Internal DB corrupt, reset: ' + e);
    return {};
  }
}

function saveEventDatabase(data) {
  const sheet = getOrCreateInternalDBSheet();
  const json = JSON.stringify(data);
  const rows = [];
  for (let i = 0; i < json.length; i += SYSTEM_CONFIG.DB_CHUNK_SIZE) rows.push([json.substring(i, i + SYSTEM_CONFIG.DB_CHUNK_SIZE)]);
  if (!rows.length) rows.push(['']);
  sheet.clearContents();
  sheet.getRange(1, 1, rows.length, 1).setNumberFormat('@').setValues(rows);
}

function getLogSpreadsheet() {
  const props = PropertiesService.getScriptProperties();
  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) {
    if (props.getProperty('LOG_SPREADSHEET_ID') !== active.getId()) props.setProperty('LOG_SPREADSHEET_ID', active.getId());
    if (active.getName() !== SYSTEM_CONFIG.LOG_SHEET_NAME) active.rename(SYSTEM_CONFIG.LOG_SHEET_NAME);
    return active;
  }
  const savedId = props.getProperty('LOG_SPREADSHEET_ID');
  if (savedId) { try { return SpreadsheetApp.openById(savedId); } catch (e) { } }
  const files = DriveApp.getFilesByName(SYSTEM_CONFIG.LOG_SHEET_NAME);
  while (files.hasNext()) {
    const f = files.next();
    if (f.getMimeType() === MimeType.GOOGLE_SHEETS && !f.isTrashed()) { props.setProperty('LOG_SPREADSHEET_ID', f.getId()); return SpreadsheetApp.open(f); }
  }
  const created = SpreadsheetApp.create(SYSTEM_CONFIG.LOG_SHEET_NAME);
  props.setProperty('LOG_SPREADSHEET_ID', created.getId());
  return created;
}

function getHistorySheet() {
  const ss = getLogSpreadsheet();
  let sheet = ss.getSheetByName(SYSTEM_CONFIG.HISTORY_SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SYSTEM_CONFIG.HISTORY_SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    const header = ['Thời gian', 'Loại', 'Môn học', 'Ngày', 'Chi tiết', 'UID'];
    sheet.getRange(1, 1, 1, header.length).setValues([header]).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function writeLogs(changes) {
  if (!changes.length) return;
  const sheet = getHistorySheet();
  const rows = changes.map(c => [new Date(), c.type, c.event.title, c.event.start ? formatDate(c.event.start) : '', c.details, c.event.uid || '']);
  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
}

function formatDate(date) { return date ? Utilities.formatDate(date, 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy HH:mm') : ''; }

function syncMoodleCalendar() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return { ok: false, error: 'Hệ thống bận, bỏ qua.' };
  let config = null;
  try {
    config = getActiveConfig();
    return runSync(config);
  } catch (error) {
    handleSyncError(error, config || getSafeConfig());
    return { ok: false, error: String(error) };
  } finally {
    lock.releaseLock();
  }
}

function runSync(config) {
  const props = PropertiesService.getScriptProperties();
  const isInitial = props.getProperty('INITIAL_SYNC_PENDING') === '1';

  const response = UrlFetchApp.fetch(config.MOODLE_URL, {
    method: 'get',
    muteHttpExceptions: true,
    followRedirects: true,
    headers: { 'User-Agent': 'Moodle-Calendar-Sync/' + SYSTEM_CONFIG.CURRENT_VERSION }
  });

  if (response.getResponseCode() !== 200) throw new Error('Moodle trả về HTTP ' + response.getResponseCode());
  const ics = response.getContentText('UTF-8');
  if (!ics.includes('BEGIN:VCALENDAR')) throw new Error('Dữ liệu Moodle trả về không hợp lệ.');

  const events = parseICS(ics);
  if (!events.length) throw new Error('0 sự kiện trả về.');

  const nowMs = Date.now();
  events.sort((a, b) => {
    const aUp = a.end.getTime() >= nowMs, bUp = b.end.getTime() >= nowMs;
    if (aUp !== bUp) return aUp ? -1 : 1;
    return aUp ? a.start - b.start : b.start - a.start;
  });

  const calendar = getOrCreateCalendar(config);
  const stored = getEventDatabase();
  const currentUIDs = {};
  events.forEach(e => { if (e.uid) currentUIDs[e.uid] = true; });

  let added = 0, updated = 0, deleted = 0, opsDone = 0, pending = 0, rateLimited = false;
  const changes = [];
  const startedAt = Date.now();
  const hasBudget = () => !rateLimited && opsDone < SYSTEM_CONFIG.MAX_OPS_PER_RUN && (Date.now() - startedAt) < SYSTEM_CONFIG.MAX_RUNTIME_MS;
  const pause = () => Utilities.sleep(SYSTEM_CONFIG.OP_DELAY_MS);

  try {
    for (const data of events) {
      if (!data.uid) continue;
      const signature = createSignature(data);
      const old = stored[data.uid];
      const needsWork = !old || old.signature !== signature;
      const needsReminders = !!old && old.rem === false;

      if (!hasBudget()) { if (needsWork || needsReminders) pending++; continue; }

      try {
        if (!old) {
          // Chưa từng theo dõi → tìm hoặc tạo mới
          let googleEvent = findExistingEvent(calendar, data);
          if (googleEvent) {
            updateGoogleEvent(googleEvent, data, null, config);
            const record = makeRecord(googleEvent, signature, data, false);
            stored[data.uid] = record;
            updated++; opsDone++;
            changes.push({ type: 'UPDATED', event: data, details: 'Tái sử dụng event đã tồn tại.' });
            if (!ensureReminders(googleEvent, record, config)) { rateLimited = true; pending++; }
          } else {
            googleEvent = createGoogleEvent(calendar, data, config);
            const record = makeRecord(googleEvent, signature, data, false);
            stored[data.uid] = record;
            added++; opsDone++;
            changes.push({ type: 'ADDED', event: data, details: 'Buổi học mới.' });
            if (!ensureReminders(googleEvent, record, config)) { rateLimited = true; pending++; }
          }
          pause(); continue;
        }

        // === Đã có trong Internal DB ===
        let googleEvent = null;

        // 1. Thử lấy theo ID đã lưu
        try {
          googleEvent = calendar.getEventById(old.eventId);
        } catch (e) {
          googleEvent = null;
        }

        // 2. Quan trọng: Kiểm tra lại xem sự kiện có thực sự còn tồn tại không
        //    (vì getEventById vẫn trả về object dù đã bị xóa thủ công)
        if (googleEvent) {
          const startCheck = new Date(googleEvent.getStartTime().getTime() - 2 * 60 * 1000);
          const endCheck = new Date(googleEvent.getStartTime().getTime() + 2 * 60 * 1000);
          const list = calendar.getEvents(startCheck, endCheck);
          const stillExists = list.some(e => e.getId() === googleEvent.getId());
          if (!stillExists) {
            googleEvent = null; // Đã bị xóa thật
          }
        }

        // 3. Nếu vẫn không có → thử tìm theo title + giờ
        if (!googleEvent) {
          googleEvent = findExistingEvent(calendar, data);
        }

        // 4. Quyết định tạo mới hay cập nhật
        if (!googleEvent) {
          // Sự kiện đã bị xóa hoàn toàn → tạo lại
          const recreated = createGoogleEvent(calendar, data, config);
          const record = makeRecord(recreated, signature, data, false);
          stored[data.uid] = record;
          added++; opsDone++;
          changes.push({ type: 'ADDED', event: data, details: 'Tạo lại vì bị xóa thủ công.' });
          if (!ensureReminders(recreated, record, config)) { rateLimited = true; pending++; }
          pause();
        } else if (needsWork) {
          // Còn tồn tại nhưng nội dung thay đổi
          const oldData = old.data ? deserializeEvent(old.data) : null;
          updateGoogleEvent(googleEvent, data, oldData, config);
          const record = makeRecord(googleEvent, signature, data, old.rem);
          stored[data.uid] = record;
          updated++; opsDone++;
          changes.push({ type: 'UPDATED', event: data, oldData: oldData, details: describeChange(oldData, data) });
          if (record.rem === false && !ensureReminders(googleEvent, record, config)) { rateLimited = true; pending++; }
          pause();
        } else if (needsReminders) {
          if (ensureReminders(googleEvent, old, config)) { opsDone++; } else { rateLimited = true; pending++; }
          pause();
        }
        // else: không cần làm gì
      } catch (e) {
        if (!isRateLimitError(e)) throw e;
        rateLimited = true;
        const now = stored[data.uid];
        if (!now || now.signature !== signature) pending++;
      }
    }

    // Xóa những event không còn trên Moodle
    for (const uid of Object.keys(stored)) {
      if (currentUIDs[uid]) continue;
      if (!hasBudget()) { pending++; continue; }
      const old = stored[uid];
      try {
        const googleEvent = calendar.getEventById(old.eventId);
        if (googleEvent) {
          withRetry(() => googleEvent.deleteEvent());
          deleted++; opsDone++;
          changes.push({ type: 'DELETED', event: old.data ? deserializeEvent(old.data) : { title: 'Không rõ môn', uid: uid }, details: 'Xóa vì không còn trên Moodle.' });
          pause();
        }
        delete stored[uid];
      } catch (e) {
        if (!isRateLimitError(e)) throw e;
        rateLimited = true; pending++;
      }
    }
  } finally {
    saveEventDatabase(stored);
  }

  if (rateLimited && opsDone === 0) throw new Error('Google đang giới hạn API. Sẽ thử lại sau.');

  if (changes.length > 0) {
    try { writeLogs(changes); } catch (e) { }
    if (!isInitial) { try { sendChangeNotification(changes, config); } catch (e) { Logger.log('Không gửi được email thông báo: ' + e); } }
  }
  if (isInitial && pending === 0 && !rateLimited) props.deleteProperty('INITIAL_SYNC_PENDING');

  const summary = formatDate(new Date()) + ` | Thêm: ${added} | Sửa: ${updated} | Xóa: ${deleted}` + (pending ? ` | Chờ: ${pending}` : '');
  props.setProperty('LAST_SYNC', summary);
  try { updateDashboard(); } catch (e) { }

  const wasError = props.getProperty('SYNC_ERROR_STATE');
  if (wasError) { try { sendRecoveryNotification(Number(props.getProperty('SYNC_ERROR_COUNT') || 0), config); } catch (e) { } }
  props.deleteProperty('SYNC_ERROR_STATE'); props.deleteProperty('SYNC_ERROR_COUNT');

  try {
    const updateInfo = checkForUpdates();
    if (updateInfo.hasUpdate && updateInfo.isUrgent && config.NOTIFY_EMAIL) {
      if (props.getProperty('LAST_NOTIFIED_VERSION') !== String(updateInfo.remoteVersion)) {
        MailApp.sendEmail({ to: config.NOTIFY_EMAIL, subject: `🚨 BẢN CẬP NHẬT QUAN TRỌNG: Sync Tool v${updateInfo.remoteVersion}`, body: `Chi tiết: ${updateInfo.message}\nCopy code mới trên GitHub dán vào Apps Script!` });
        props.setProperty('LAST_NOTIFIED_VERSION', String(updateInfo.remoteVersion));
      }
    }
  } catch (e) { }

  return { ok: true, pending: pending, summary: summary };
}

/** NEW: Tìm event đã tồn tại trong calendar theo title + start time (chống nhân bản) */
function findExistingEvent(calendar, data) {
  if (!data.start) return null;
  // Tìm trong khoảng ±2 phút quanh thời điểm bắt đầu
  const from = new Date(data.start.getTime() - 2 * 60 * 1000);
  const to = new Date(data.start.getTime() + 2 * 60 * 1000);
  const candidates = calendar.getEvents(from, to);
  for (const evt of candidates) {
    if (evt.getTitle() === data.title && Math.abs(evt.getStartTime().getTime() - data.start.getTime()) < 60000) {
      return evt;
    }
  }
  return null;
}

function isRateLimitError(e) { return /too many|quá nhiều|rate limit|limit exceeded/i.test(String(e)); }
function withRetry(fn) {
  let wait = SYSTEM_CONFIG.RETRY_WAIT_MS;
  for (let attempt = 1; ; attempt++) {
    try { return fn(); } catch (e) { if (!isRateLimitError(e) || attempt >= SYSTEM_CONFIG.RETRY_ATTEMPTS) throw e; Utilities.sleep(wait); wait *= 2; }
  }
}

function makeRecord(evt, sig, d, rem) {
  const record = { eventId: evt.getId(), signature: sig, data: serializeEvent(d) };
  if (rem !== undefined) record.rem = rem;
  return record;
}

function ensureReminders(googleEvent, record, config) {
  try {
    applyReminders(googleEvent, config);
    record.rem = true;
    return true;
  } catch (e) {
    if (!isRateLimitError(e)) throw e;
    record.rem = false;
    return false;
  }
}

function createSignature(d) { return JSON.stringify({ t: d.title, s: d.start ? d.start.getTime() : null, e: d.end ? d.end.getTime() : null, l: d.location || '', d: d.description || '' }); }
function serializeEvent(d) { return { uid: d.uid, title: d.title, start: d.start ? d.start.getTime() : null, end: d.end ? d.end.getTime() : null, location: d.location || '', description: d.description || '' }; }
function deserializeEvent(d) { return d ? { uid: d.uid, title: d.title, start: d.start ? new Date(d.start) : null, end: d.end ? new Date(d.end) : null, location: d.location || '', description: d.description || '' } : null; }

function buildDescription(data, config) { return (data.description || '') + `\n\n[Đồng bộ tự động từ Moodle ${config.UNIVERSITY_NAME}]`; }
function createGoogleEvent(cal, data, config) { return withRetry(() => cal.createEvent(data.title, data.start, data.end, { location: data.location || '', description: buildDescription(data, config) })); }
function applyReminders(evt, config) { withRetry(() => { evt.removeAllReminders(); config.REMINDERS.forEach(m => evt.addPopupReminder(m)); }); }
function updateGoogleEvent(evt, d, old, config) {
  withRetry(() => {
    if (!old || old.title !== d.title) evt.setTitle(d.title);
    if (!old || !old.start || !old.end || old.start.getTime() !== d.start.getTime() || old.end.getTime() !== d.end.getTime()) evt.setTime(d.start, d.end);
    if (!old || (old.location || '') !== (d.location || '')) evt.setLocation(d.location || '');
    if (!old || (old.description || '') !== (d.description || '')) evt.setDescription(buildDescription(d, config));
  });
}
function describeChange(old, n) {
  if (!old) return 'Cập nhật.';
  const c = [];
  if (old.title !== n.title) c.push(`📚 Môn đổi`);
  if (!old.start || !old.end || old.start.getTime() !== n.start.getTime() || old.end.getTime() !== n.end.getTime()) c.push(`⏰ Giờ đổi`);
  if ((old.location || '') !== (n.location || '')) c.push(`🏫 Phòng đổi`);
  return c.length ? c.join('\n') : 'Thay đổi.';
}

function sendChangeNotification(changes, config) {
  if (!config.NOTIFY_EMAIL) return;
  let sub = `🔔 ${config.UNIVERSITY_NAME} đổi lịch`;
  if (changes.length === 1) sub = changes[0].type === 'DELETED' ? `🚨 Hủy: ${changes[0].event.title}` : (changes[0].type === 'ADDED' ? `🆕 Thêm: ${changes[0].event.title}` : `🔔 Đổi: ${changes[0].event.title}`);
  let body = `Phát hiện ${changes.length} thay đổi:\n\n`;
  changes.forEach(c => { body += `━ Môn: ${c.event.title}\nNgày: ${formatDate(c.event.start)}\n${c.details}\n\n`; });
  MailApp.sendEmail({ to: config.NOTIFY_EMAIL, subject: sub, body: body });
}
function handleSyncError(e, config) {
  const p = PropertiesService.getScriptProperties();
  const c = Number(p.getProperty('SYNC_ERROR_COUNT') || 0) + 1;
  p.setProperty('SYNC_ERROR_COUNT', String(c)); p.setProperty('SYNC_ERROR_STATE', 'ERROR'); p.setProperty('LAST_ERROR', String(e));
  if (config && config.NOTIFY_EMAIL && (c === 1 || c % SYSTEM_CONFIG.ERROR_REMINDER_COUNT === 0)) {
    try { MailApp.sendEmail({ to: config.NOTIFY_EMAIL, subject: `❌ Moodle Sync Error`, body: `Lỗi:\n${e}\nLiên tiếp: ${c}` }); } catch (mailErr) { }
  }
}
function sendRecoveryNotification(c, config) { if (config.NOTIFY_EMAIL) MailApp.sendEmail({ to: config.NOTIFY_EMAIL, subject: `✅ Hệ thống đã phục hồi`, body: `Hoạt động trở lại sau ${c} lỗi.` }); }

// -------------------------------------------------
// Đọc file ICS (giữ nguyên)
// -------------------------------------------------
function parseICS(ics) {
  const lines = ics.replace(/\r?\n[ \t]/g, '').split(/\r?\n/);
  const events = []; let current = null; let inAlarm = false;

  lines.forEach(l => {
    const marker = l.trim();
    if (marker === 'BEGIN:VEVENT') { current = {}; inAlarm = false; return; }
    if (marker === 'END:VEVENT') {
      if (current) {
        const start = parseICSTime(current.DTS_V, current.DTS_T);
        let end = parseICSTime(current.DTE_V, current.DTE_T);
        if (start && !end) end = isDateOnly(current.DTS_V) ? new Date(start.getTime() + 86400000) : start;
        const e = { uid: current.UID || '', title: unescapeICS(current.SUMMARY || ''), start: start, end: end, location: unescapeICS(current.LOCATION || ''), description: unescapeICS(current.DESCRIPTION || '') };
        if (e.start && e.end) events.push(e);
      }
      current = null; inAlarm = false; return;
    }
    if (!current) return;

    if (marker === 'BEGIN:VALARM') { inAlarm = true; return; }
    if (marker === 'END:VALARM') { inAlarm = false; return; }
    if (inAlarm) return;

    const idx = l.indexOf(':'); if (idx === -1) return;
    const parts = l.substring(0, idx).split(';'); const val = l.substring(idx + 1);
    let tz = ''; parts.slice(1).forEach(p => { if (p.split('=')[0] === 'TZID') tz = p.split('=')[1]; });
    if (parts[0] === 'DTSTART') { current.DTS_V = val; current.DTS_T = tz; }
    else if (parts[0] === 'DTEND') { current.DTE_V = val; current.DTE_T = tz; }
    else current[parts[0]] = val;
  });
  return events;
}
function isDateOnly(v) { return /^\d{8}$/.test(String(v || '').trim()); }
function parseICSTime(v, tz) {
  if (!v) return null;
  v = String(v).trim();

  let m = v.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?Z$/);
  if (m) return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0)));

  const zone = tz || 'Asia/Ho_Chi_Minh';

  m = v.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (m) return Utilities.parseDate(`${m[1]}-${m[2]}-${m[3]} 00:00:00`, zone, 'yyyy-MM-dd HH:mm:ss');

  m = v.match(/^(\d{4})(\d{2})(\d{2})T?(\d{2})(\d{2})(\d{2})?$/);
  if (!m) return null;
  return Utilities.parseDate(`${m[1]}-${m[2]}-${m[3]} ${m[4]}:${m[5]}:${m[6] || '00'}`, zone, 'yyyy-MM-dd HH:mm:ss');
}
function unescapeICS(v) { return String(v).replace(/\\([nN,;\\])/g, (m, c) => (c === 'n' || c === 'N') ? '\n' : c); }

// -------------------------------------------------
// Dashboard (giữ nguyên phần còn lại)
// -------------------------------------------------
function createDashboard() {
  const ss = getLogSpreadsheet();
  let dashboard = ss.getSheetByName(SYSTEM_CONFIG.DASHBOARD_SHEET_NAME) || ss.insertSheet(SYSTEM_CONFIG.DASHBOARD_SHEET_NAME);
  let settingsSheet = ss.getSheetByName(SYSTEM_CONFIG.SETTINGS_SHEET_NAME) || ss.insertSheet(SYSTEM_CONFIG.SETTINGS_SHEET_NAME);
  let eventsSheet = ss.getSheetByName(SYSTEM_CONFIG.EVENTS_SHEET_NAME) || ss.insertSheet(SYSTEM_CONFIG.EVENTS_SHEET_NAME);

  try { ss.setActiveSheet(dashboard); ss.moveActiveSheet(1); ss.setActiveSheet(settingsSheet); ss.moveActiveSheet(2); } catch (e) { }
  ['Trang tính 1', 'Trang tính1', 'Sheet1', 'Sheet 1'].forEach(n => { const s = ss.getSheetByName(n); if (s && ss.getSheets().length > 1) try { ss.deleteSheet(s); } catch (e) { } });

  const safeConfig = getSafeConfig();

  settingsSheet.clearContents();
  settingsSheet.setColumnWidth(1, 220); settingsSheet.setColumnWidth(2, 500);
  settingsSheet.getRange('A1:B1').merge().setValue('⚙️ THIẾT LẬP HỆ THỐNG').setFontSize(16).setFontWeight('bold').setHorizontalAlignment('center');
  settingsSheet.getRange('A2:B2').merge().setValue('Bạn có thể đổi Link Moodle hoặc Email ở cột B. Code sẽ tự động cập nhật khi đồng bộ.').setFontColor('blue').setFontStyle('italic');
  settingsSheet.getRange('A3:B6').setValues([
    ['Tên Trường (Ngắn gọn):', safeConfig.UNIVERSITY_NAME],
    ['Tên Lịch trên Google:', safeConfig.CALENDAR_NAME],
    ['Link Moodle (Bắt buộc):', safeConfig.MOODLE_URL],
    ['Email nhận Thông báo:', safeConfig.NOTIFY_EMAIL]
  ]).setFontSize(12);
  settingsSheet.getRange('A3:A6').setFontWeight('bold');
  settingsSheet.getRange('B3:B6').setBackground('#f3f3f3').setBorder(true, true, true, true, null, null);

  dashboard.clearContents();
  dashboard.setColumnWidth(1, 220); dashboard.setColumnWidth(2, 350);
  dashboard.getRange('A1:C1').merge().setValue('📅 MOODLE CALENDAR SYNC').setFontSize(22).setFontWeight('bold').setHorizontalAlignment('center');

  const props = PropertiesService.getScriptProperties();
  const up = checkForUpdates();
  let vRow = ['Phiên bản hiện tại', `v${SYSTEM_CONFIG.CURRENT_VERSION} (Bản mới nhất)`];
  if (up.hasUpdate) vRow = ['CẬP NHẬT MỚI', `🔥 Có bản v${up.remoteVersion}: ${up.message}. Lên GitHub lấy code đè vào nhé!🔥`];

  dashboard.getRange('A3:B9').setBackground(null).setFontColor(null).setFontWeight('normal');

  dashboard.getRange('A3:B9').setValues([
    ['Trạng thái', Number(props.getProperty('SYNC_ERROR_COUNT') || 0) === 0 ? '🟢 ĐANG HOẠT ĐỘNG' : '🔴 CÓ LỖI'],
    ['Lần đồng bộ cuối', props.getProperty('LAST_SYNC') || 'Chưa có'],
    vRow,
    ['Chu kỳ đồng bộ', SYSTEM_CONFIG.SYNC_INTERVAL + ' phút'],
    ['Trường học', safeConfig.UNIVERSITY_NAME],
    ['Lỗi liên tiếp', props.getProperty('SYNC_ERROR_COUNT') || '0'],
    ['Lỗi cuối', props.getProperty('LAST_ERROR') || 'Không có']
  ]);
  dashboard.getRange('A3:A9').setFontWeight('bold');
  if (up.hasUpdate) dashboard.getRange('A5:B5').setBackground('#FFFF00').setFontColor('red').setFontWeight('bold');

  const history = getHistorySheet();
  dashboard.getRange('A11:C11').merge().setValue('🔔 THAY ĐỔI GẦN ĐÂY').setFontWeight('bold').setFontSize(14);
  dashboard.getRange('A12:C12').setValues([['Thời gian', 'Loại', 'Nội dung']]).setFontWeight('bold');
  const lastRow = history.getLastRow();
  if (lastRow > 1) {
    const data = history.getRange(Math.max(2, lastRow - 9), 1, Math.min(10, lastRow - 1), 6).getValues();
    const display = data.map(r => [r[0], r[1], r[2] + (r[4] ? ' — ' + r[4] : '')]);
    dashboard.getRange(13, 1, display.length, 3).setValues(display);
  }

  eventsSheet.clearContents();
  eventsSheet.getRange('A1:D1').setValues([['UID', 'Môn học', 'Bắt đầu', 'Kết thúc']]).setFontWeight('bold');
  const stored = getEventDatabase();
  const evRows = Object.keys(stored).map(uid => { const d = deserializeEvent(stored[uid].data); return d ? [uid, d.title, d.start, d.end] : null; }).filter(r => r);
  if (evRows.length) eventsSheet.getRange(2, 1, evRows.length, 4).setValues(evRows);
}

function showMessage(t) {
  Logger.log(t);
  try { SpreadsheetApp.getUi().alert(t); } catch (e) { }
}

function showToast(t, title) {
  Logger.log(t);
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (ss) ss.toast(t, title || '', 5);
  } catch (e) { }
}

function isNewerVersion(remote, local) {
  const a = String(remote).split('.').map(Number);
  const b = String(local).split('.').map(Number);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] || 0, y = b[i] || 0;
    if (x !== y) return x > y;
  }
  return false;
}

function checkForUpdates() {
  let cache = null;
  const cacheKey = 'UPDATE_INFO_' + SYSTEM_CONFIG.CURRENT_VERSION;   // ← thêm version vào key

  try {
    cache = CacheService.getScriptCache();
    const cached = cache.get(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch (e) { }

  let info = { hasUpdate: false };
  try {
    const res = UrlFetchApp.fetch(
      'https://raw.githubusercontent.com/nguyenhungphongg/Auto-Sync-UIT-Course-to-your-calendar/main/version.json',
      { muteHttpExceptions: true }
    );
    if (res.getResponseCode() === 200) {
      const data = JSON.parse(res.getContentText());
      if (isNewerVersion(data.latest, SYSTEM_CONFIG.CURRENT_VERSION)) {
        info = {
          hasUpdate: true,
          remoteVersion: String(data.latest),
          message: data.message || '',
          isUrgent: data.isUrgent === true
        };
      }
    }
  } catch (e) { }

  try {
    if (cache) cache.put(cacheKey, JSON.stringify(info), SYSTEM_CONFIG.UPDATE_CACHE_SECONDS);
  } catch (e) { }

  return info;
}
