/*************************************************
 * MOODLE → GOOGLE CALENDAR SYNC (UNIVERSAL)
 * Version: 1.3 (Optimized UI & Functions Layout)
 *************************************************/

// =================================================
// 1. ⚙️ CẤU HÌNH CÁ NHÂN (NGƯỜI DÙNG THƯỜNG XUYÊN SỬA Ở ĐÂY)
// =================================================
const USER_CONFIG = {
  UNIVERSITY_NAME: 'UIT', // Tên trường của bạn (VD: UIT, Bách Khoa, Kinh Tế...)
  MOODLE_URL: 'ĐIỀN_LINK_MOODLE_CỦA_BẠN_VÀO_ĐÂY', // Dán link xuất lịch Moodle vào đây
  NOTIFY_EMAIL: '', // Email nhận thông báo. Để trống sẽ dùng email tài khoản hiện tại
  REMINDERS: [0, 30, 180, 1440] // Các mốc thời gian thông báo trước khi học (phút)
};

// =================================================
// 2. 🚀 C CÁC HÀM THAO TÁC CHÍNH (ĐƯỢC ĐƯA LÊN ĐẦU ĐỂ DỄ TÌM)
// =================================================

/**
 * Nút 1: Cài đặt và đồng bộ lần đầu (Chỉ chạy 1 lần duy nhất khi mới bắt đầu)
 */
function setupAndSync() {
  const triggers = ScriptApp.getProjectTriggers();
  if (triggers.some(t => t.getHandlerFunction() === 'syncMoodleCalendar')) {
    showMessage('⚠️ HỆ THỐNG ĐÃ CÀI ĐẶT RỒI!\n\nTool đang tự chạy ngầm mỗi 15 phút. Bạn KHÔNG CẦN cài đặt lại.\n\n👉 Nếu muốn đồng bộ ngay, hãy chọn "🔄 Đồng bộ ngay".');
    return;
  }

  try {
    PropertiesService.getScriptProperties().setProperty('TIMEZONE', 'Asia/Ho_Chi_Minh');
    const ss = getLogSpreadsheet();
    createDashboard(); 
    const config = getActiveConfig(); 
    getOrCreateCalendar(config);
    getHistorySheet();
    getOrCreateInternalDBSheet();
  } catch(e) {
    showMessage('❌ LỖI CÀI ĐẶT:\n' + e.message);
    return;
  }
  
  const result = testSync();
  if (!result || !result.ok) {
    showMessage('⚠️ Cài đặt xong nhưng đồng bộ bị lỗi:\n' + (result ? result.error : 'Không rõ') + '\n\nKiểm tra lại Link Moodle trong tab Settings.');
    return;
  }
  
  createTrigger();
  let msg = '✅ Cài đặt thành công!\n\n' + result.summary;
  if (result.pending > 0) msg += '\n\nCòn ' + result.pending + ' sự kiện chờ xử lý do API giới hạn. Sẽ tự làm nốt ở lần sau.';
  showMessage(msg);
}

/**
 * Nút 2: Đồng bộ ngay lập tức (Dùng khi muốn kéo lịch về ngay lập tức)
 */
function testSync() { 
  return syncMoodleCalendar(); 
}

/**
 * Nút 3: Cập nhật lại giao diện Dashboard và tab Settings trên Google Sheet
 */
function updateDashboard() {
  createDashboard();
}

/**
 * Nút 4: Dọn dẹp thủ công các sự kiện bị nhân bản (trùng lịch)
 */
function fixDuplicates() {
  const config = getActiveConfig();
  const calendar = getOrCreateCalendar(config);
  const startTime = new Date(new Date().getFullYear(), 0, 1);
  const endTime = new Date(new Date().getFullYear() + 1, 11, 31);
  
  showMessage('Bắt đầu quét và xóa các sự kiện trùng lặp...');
  const events = calendar.getEvents(startTime, endTime);
  const eventMap = {}; let deletedCount = 0;
  
  for (let i = 0; i < events.length; i++) {
    const evt = events[i];
    const signature = evt.getTitle() + "_" + evt.getStartTime().getTime();
    if (eventMap[signature]) { evt.deleteEvent(); deletedCount++; Utilities.sleep(500); } 
    else { eventMap[signature] = true; }
  }
  showMessage(`Đã quét xong! Xóa thành công ${deletedCount} sự kiện trùng lặp.`);
}

/**
 * Nút 5: Tạo lịch trình tự động chạy ngầm mỗi 15 phút
 */
function createTrigger() {
  ScriptApp.getProjectTriggers().forEach(t => { if (t.getHandlerFunction() === 'syncMoodleCalendar') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('syncMoodleCalendar').timeBased().everyMinutes(SYSTEM_CONFIG.SYNC_INTERVAL).create();
  showMessage('Đã tạo thành công lịch tự động đồng bộ mỗi ' + SYSTEM_CONFIG.SYNC_INTERVAL + ' phút.');
}

/**
 * Tạo Menu hiển thị trực tiếp trên giao diện Google Sheet
 */
function onOpen() {
  SpreadsheetApp.getUi().createMenu('📅 Moodle Calendar Sync')
    .addItem('🚀 Cài đặt & đồng bộ lần đầu', 'setupAndSync')
    .addItem('🔄 Đồng bộ ngay', 'testSync')
    .addItem('📊 Cập nhật Dashboard', 'updateDashboard')
    .addItem('🧹 Dọn dẹp lịch trùng (Thủ công)', 'fixDuplicates')
    .addSeparator()
    .addItem('⚙️ Tạo trigger đồng bộ', 'createTrigger')
    .addToUi();
}


// =================================================
// 3. ⚙️ CẤU HÌNH HỆ THỐNG (KHÔNG CHỈNH SỬA)
// =================================================
const SYSTEM_CONFIG = {
  CURRENT_VERSION: 1.3,
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
  SYNC_INTERVAL: 15
};


// =================================================
// 4. 🛠️ CÁC HÀM XỬ LÝ NGẦM VÀ HỆ THỐNG (ĐÃ ĐƯỢC ĐẪY XUỐNG DƯỚI)
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
  } catch (e) {}
  return config;
}

function getActiveConfig() {
  const config = getSafeConfig();
  if (!config.MOODLE_URL || !config.MOODLE_URL.includes('http')) {
    throw new Error('Vui lòng điền Link Moodle vào mặt Google Sheet (tab ⚙️ Settings) hoặc biến USER_CONFIG trong mã nguồn.');
  }
  const props = PropertiesService.getScriptProperties();
  props.setProperty('MOODLE_URL', config.MOODLE_URL);
  props.setProperty('UNIVERSITY_NAME', config.UNIVERSITY_NAME);
  props.setProperty('CALENDAR_NAME', config.CALENDAR_NAME);
  props.setProperty('NOTIFY_EMAIL', config.NOTIFY_EMAIL);
  return config;
}

function getOrCreateCalendar(config) {
  const calendars = CalendarApp.getCalendarsByName(config.CALENDAR_NAME);
  if (calendars.length > 0) return calendars[0];
  return CalendarApp.createCalendar(config.CALENDAR_NAME, { description: 'Đồng bộ tự động từ Moodle ' + config.UNIVERSITY_NAME });
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
  return json ? JSON.parse(json) : {};
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
  if (savedId) { try { return SpreadsheetApp.openById(savedId); } catch (e) {} }
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
  const config = getActiveConfig();
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return { ok: false, error: 'Hệ thống bận, bỏ qua.' };
  try { return runSync(config); } 
  catch (error) { handleSyncError(error, config); return { ok: false, error: String(error) }; } 
  finally { lock.releaseLock(); }
}

function runSync(config) {
  const props = PropertiesService.getScriptProperties();
  const response = UrlFetchApp.fetch(config.MOODLE_URL, { method: 'get', muteHttpExceptions: true, followRedirects: true, headers: { 'User-Agent': 'Moodle-Calendar-Sync/1.3' } });
  
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
  const currentUIDs = {}; events.forEach(e => { if (e.uid) currentUIDs[e.uid] = true; });
  
  let added = 0, updated = 0, deleted = 0, opsDone = 0, pending = 0, rateLimited = false;
  const changes = []; const startedAt = Date.now();
  const hasBudget = () => !rateLimited && opsDone < SYSTEM_CONFIG.MAX_OPS_PER_RUN && (Date.now() - startedAt) < SYSTEM_CONFIG.MAX_RUNTIME_MS;
  const pause = () => Utilities.sleep(SYSTEM_CONFIG.OP_DELAY_MS);
  
  try {
    for (const data of events) {
      if (!data.uid) continue;
      const signature = createSignature(data);
      const old = stored[data.uid];
      const needsWork = !old || old.signature !== signature;
      
      if (!hasBudget()) { if (needsWork) pending++; continue; }
      
      try {
        if (!old) {
          const googleEvent = createGoogleEvent(calendar, data, config);
          stored[data.uid] = makeRecord(googleEvent, signature, data);
          added++; opsDone++;
          changes.push({ type: 'ADDED', event: data, details: 'Buổi học mới.' });
          try { applyReminders(googleEvent, config); } catch (e) { throw e; }
          pause(); continue;
        }
        
        const googleEvent = calendar.getEventById(old.eventId);
        if (!googleEvent) {
          const recreated = createGoogleEvent(calendar, data, config);
          stored[data.uid] = makeRecord(recreated, signature, data);
          added++; opsDone++;
          changes.push({ type: 'ADDED', event: data, details: 'Tạo lại vì bị xóa.' });
          try { applyReminders(recreated, config); } catch (e) { throw e; }
          pause();
        } else if (needsWork) {
          const oldData = old.data ? deserializeEvent(old.data) : null;
          updateGoogleEvent(googleEvent, data, oldData, config);
          stored[data.uid] = makeRecord(googleEvent, signature, data);
          updated++; opsDone++;
          changes.push({ type: 'UPDATED', event: data, oldData: oldData, details: describeChange(oldData, data) });
          pause();
        }
      } catch (e) {
        if (!isRateLimitError(e)) throw e;
        rateLimited = true;
        const now = stored[data.uid]; if (!now || now.signature !== signature) pending++;
      }
    }
    
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
  if (changes.length > 0) { try { writeLogs(changes); } catch (e) {} sendChangeNotification(changes, config); }
  
  const summary = formatDate(new Date()) + ` | Thêm: ${added} | Sửa: ${updated} | Xóa: ${deleted}` + (pending ? ` | Chờ: ${pending}` : '');
  props.setProperty('LAST_SYNC', summary);
  try { updateDashboard(); } catch (e) {}
  
  const wasError = props.getProperty('SYNC_ERROR_STATE');
  if (wasError) sendRecoveryNotification(Number(props.getProperty('SYNC_ERROR_COUNT') || 0), config);
  props.deleteProperty('SYNC_ERROR_STATE'); props.deleteProperty('SYNC_ERROR_COUNT');
  
  const updateInfo = checkForUpdates();
  if (updateInfo.hasUpdate && updateInfo.isUrgent && config.NOTIFY_EMAIL) {
    if (props.getProperty('LAST_NOTIFIED_VERSION') !== updateInfo.remoteVersion) {
      MailApp.sendEmail({ to: config.NOTIFY_EMAIL, subject: `🚨 BẢN CẬP NHẬT QUAN TRỌNG: Sync Tool v${updateInfo.remoteVersion}`, body: `Chi tiết: ${updateInfo.message}\nCopy code mới trên GitHub dán vào Apps Script!` });
      props.setProperty('LAST_NOTIFIED_VERSION', updateInfo.remoteVersion);
    }
  }

  return { ok: true, pending: pending, summary: summary };
}

function isRateLimitError(e) { return /too many|quá nhiều|rate limit|limit exceeded/i.test(String(e)); }
function withRetry(fn) {
  let wait = SYSTEM_CONFIG.RETRY_WAIT_MS;
  for (let attempt = 1; ; attempt++) {
    try { return fn(); } catch (e) { if (!isRateLimitError(e) || attempt >= SYSTEM_CONFIG.RETRY_ATTEMPTS) throw e; Utilities.sleep(wait); wait *= 2; }
  }
}
function makeRecord(evt, sig, d) { return { eventId: evt.getId(), signature: sig, data: serializeEvent(d) }; }
function createSignature(d) { return JSON.stringify({ t: d.title, s: d.start?d.start.getTime():null, e: d.end?d.end.getTime():null, l: d.location||'', d: d.description||'' }); }
function serializeEvent(d) { return { uid: d.uid, title: d.title, start: d.start?d.start.getTime():null, end: d.end?d.end.getTime():null, location: d.location||'', description: d.description||'' }; }
function deserializeEvent(d) { return d ? { uid: d.uid, title: d.title, start: d.start?new Date(d.start):null, end: d.end?new Date(d.end):null, location: d.location||'', description: d.description||'' } : null; }

function buildDescription(data, config) { return (data.description || '') + `\n\n[Đồng bộ tự động từ Moodle ${config.UNIVERSITY_NAME}]`; }
function createGoogleEvent(cal, data, config) { return withRetry(() => cal.createEvent(data.title, data.start, data.end, { location: data.location || '', description: buildDescription(data, config) })); }
function applyReminders(evt, config) { withRetry(() => { evt.removeAllReminders(); config.REMINDERS.forEach(m => evt.addPopupReminder(m)); }); }
function updateGoogleEvent(evt, d, old, config) {
  withRetry(() => {
    if (!old || old.title !== d.title) evt.setTitle(d.title);
    if (!old || old.start.getTime() !== d.start.getTime() || old.end.getTime() !== d.end.getTime()) evt.setTime(d.start, d.end);
    if (!old || (old.location||'') !== (d.location||'')) evt.setLocation(d.location || '');
    if (!old || (old.description||'') !== (d.description||'')) evt.setDescription(buildDescription(d, config));
  });
}
function describeChange(old, n) {
  if (!old) return 'Cập nhật.'; const c = [];
  if (old.title !== n.title) c.push(`📚 Môn đổi`);
  if (old.start.getTime() !== n.start.getTime() || old.end.getTime() !== n.end.getTime()) c.push(`⏰ Giờ đổi`);
  if ((old.location||'') !== (n.location||'')) c.push(`🏫 Phòng đổi`);
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
  if (config.NOTIFY_EMAIL && (c === 1 || c % SYSTEM_CONFIG.ERROR_REMINDER_COUNT === 0)) MailApp.sendEmail({ to: config.NOTIFY_EMAIL, subject: `❌ Moodle Sync Error`, body: `Lỗi:\n${e}\nLiên tiếp: ${c}` });
}
function sendRecoveryNotification(c, config) { if (config.NOTIFY_EMAIL) MailApp.sendEmail({ to: config.NOTIFY_EMAIL, subject: `✅ Hệ thống đã phục hồi`, body: `Hoạt động trở lại sau ${c} lỗi.` }); }

function parseICS(ics) {
  const lines = ics.replace(/\r\n[ \t]/g, '').split(/\r?\n/);
  const events = []; let current = null;
  lines.forEach(l => {
    if (l === 'BEGIN:VEVENT') { current = {}; return; }
    if (l === 'END:VEVENT') {
      if (current) { const e = { uid: current.UID||'', title: unescapeICS(current.SUMMARY||''), start: parseICSTime(current.DTS_V, current.DTS_T), end: parseICSTime(current.DTE_V, current.DTE_T), location: unescapeICS(current.LOCATION||''), description: unescapeICS(current.DESCRIPTION||'') }; if (e.start && e.end) events.push(e); }
      current = null; return;
    }
    if (!current) return;
    const idx = l.indexOf(':'); if (idx === -1) return;
    const parts = l.substring(0, idx).split(';'); const val = l.substring(idx + 1);
    let tz = ''; parts.slice(1).forEach(p => { if (p.split('=')[0] === 'TZID') tz = p.split('=')[1]; });
    if (parts[0] === 'DTSTART') { current.DTS_V = val; current.DTS_T = tz; } else if (parts[0] === 'DTEND') { current.DTE_V = val; current.DTE_T = tz; } else current[parts[0]] = val;
  }); return events;
}
function parseICSTime(v, tz) {
  if (!v) return null; if (v.endsWith('Z')) return new Date(Date.UTC(v.substr(0,4), v.substr(4,2)-1, v.substr(6,2), v.substr(9,2), v.substr(11,2), v.substr(13,2)));
  const m = v.match(/^(\d{4})(\d{2})(\d{2})T?(\d{2})(\d{2})(\d{2})?$/); if (!m) return null;
  return Utilities.parseDate(Utilities.formatString('%04d-%02d-%02d %02d:%02d:%02d', m[1],m[2],m[3],m[4],m[5],m[6]||0), tz||'Asia/Ho_Chi_Minh', 'yyyy-MM-dd HH:mm:ss');
}
function unescapeICS(v) { return v.replace(/\\n/g, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\\\/g, '\\'); }

function createDashboard() {
  const ss = getLogSpreadsheet();
  let dashboard = ss.getSheetByName(SYSTEM_CONFIG.DASHBOARD_SHEET_NAME) || ss.insertSheet(SYSTEM_CONFIG.DASHBOARD_SHEET_NAME);
  let settingsSheet = ss.getSheetByName(SYSTEM_CONFIG.SETTINGS_SHEET_NAME) || ss.insertSheet(SYSTEM_CONFIG.SETTINGS_SHEET_NAME);
  let eventsSheet = ss.getSheetByName(SYSTEM_CONFIG.EVENTS_SHEET_NAME) || ss.insertSheet(SYSTEM_CONFIG.EVENTS_SHEET_NAME);
  
  try { ss.setActiveSheet(dashboard); ss.moveActiveSheet(1); ss.setActiveSheet(settingsSheet); ss.moveActiveSheet(2); } catch(e){}
  ['Trang tính 1', 'Trang tính1', 'Sheet1', 'Sheet 1'].forEach(n => { const s = ss.getSheetByName(n); if (s && ss.getSheets().length > 1) try{ss.deleteSheet(s);}catch(e){} });

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

  dashboard.getRange('A3:B9').setValues([ 
    ['Trạng thái', Number(props.getProperty('SYNC_ERROR_COUNT')||0) === 0 ? '🟢 ĐANG HOẠT ĐỘNG' : '🔴 CÓ LỖI'],
    ['Lần đồng bộ cuối', props.getProperty('LAST_SYNC') || 'Chưa có'],
    vRow,
    ['Chu kỳ đồng bộ', '15 phút'],
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

function createSpreadsheetOpenTrigger() {
  const id = PropertiesService.getScriptProperties().getProperty('LOG_SPREADSHEET_ID');
  ScriptApp.getProjectTriggers().forEach(t => { if (t.getHandlerFunction() === 'onOpen') ScriptApp.deleteTrigger(t); });
  if (id) ScriptApp.newTrigger('onOpen').forSpreadsheet(id).onOpen().create();
}

function showMessage(t) { 
  Logger.log(t); 
  try { 
    const ss = SpreadsheetApp.getActiveSpreadsheet(); 
    if (ss) ss.toast('Hoàn tất! Mở tab Apps Script để xem Log.', '✅ Xong', 10); 
  } catch (e) {} 
}

function checkForUpdates() {
  try {
    const res = UrlFetchApp.fetch('https://raw.githubusercontent.com/nguyenhungphongg/Auto-Sync-UIT-Course-to-your-calendar/main/version.json', { muteHttpExceptions: true });
    if (res.getResponseCode() === 200) {
      const data = JSON.parse(res.getContentText());
      if (parseFloat(data.latest) > parseFloat(SYSTEM_CONFIG.CURRENT_VERSION)) return { hasUpdate: true, remoteVersion: data.latest, message: data.message, isUrgent: data.isUrgent === true };
    }
  } catch (e) {} return { hasUpdate: false };
}
