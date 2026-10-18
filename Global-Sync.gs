/*************************************************
 * MOODLE → GOOGLE CALENDAR SYNC
 *
 * Chức năng:
 *  - Đồng bộ Moodle ICS → Google Calendar
 *  - Phát hiện thêm / sửa / xóa
 *  - Gửi email khi lịch thay đổi
 *  - Ghi lịch sử vào Google Sheets
 *  - Trigger tự động
 *  - Tự động đặt lời nhắc thông báo lịch học (MỚI)
 *************************************************/
// =================================================
// CẤU HÌNH
// =================================================
const CONFIG = {
  CURRENT_VERSION: 1.2, // Thêm dòng này để đánh dấu phiên bản hiện tại
  CALENDAR_NAME: 'Moodle - Lịch học', //Tên lịch mà bạn muốn tạo
  LOG_SHEET_NAME: 'Moodle Calendar Sync Log', //Tên file Google Sheet log. Nếu script đã gắn sẵn trong một Sheet thì dùng luôn Sheet đó (không tạo mới, không đổi tên). Chỉ khi tạo script độc lập bằng Apps Script mới tạo Sheet mới với tên này.
  NOTIFY_EMAIL: '', // Email nhận thông báo. Để trống '' thì dùng email của chính tài khoản Google đang chạy script.
  ERROR_REMINDER_COUNT: 10, //Tần suất nhắc lại email thông báo lỗi khi hệ thống gặp sự cố liên tục, nhằm mục đích chống spam hộp thư.
  MOODLE_URL: 'DÁN_LINK_MOODLE_ICAL_CỦA_BẠN_VÀO_ĐÂY', // Link xuất lịch Moodle (có chứa authtoken, KHÔNG đăng công khai).
  SYNC_INTERVAL: 15, // Chu kỳ đồng bộ (phút), chỉ nhận 1, 5, 10, 15 hoặc 30. Khoảng tối ưu để tự động chạy code và kéo lịch về.
  //Chu kỳ đồng bộ càng ít thì quota (hạn mức) trong ngày của bạn càng cao và có thể hết hạn mức (code dừng hoạt động tạm thời) do chính sách của Google.
  REMINDERS: [0, 30, 180, 1440], // Các mốc thông báo trước đó (phút). Mặc định tương đương ngay tại thời điểm bắt đầu, 30 phút trước, 3 giờ trước, 1 ngày trước.
  //Nếu không muốn thông báo, vui lòng xoá nội dung trong REMINDERS, ví dụ: REMINDERS: []

  // --- Chống lỗi "Bạn đang tạo hoặc xóa quá nhiều lịch hoặc sự kiện..." ---
  MAX_OPS_PER_RUN: 40, // Số sự kiện tối đa được tạo/sửa/xóa trong MỘT lần chạy. Phần còn lại tự làm ở lần chạy sau (lần đầu có nhiều lịch sẽ mất vài lần chạy). Bị lỗi quá nhiều thì giảm xuống 20-30.
  OP_DELAY_MS: 700, // Nghỉ bao nhiêu mili giây sau mỗi sự kiện để không bị Google coi là spam.
  RETRY_ATTEMPTS: 3, // Số lần thử lại khi bị Google giới hạn tốc độ.
  RETRY_WAIT_MS: 5000 // Lần chờ đầu tiên trước khi thử lại (mili giây), các lần sau nhân đôi.
};

const HISTORY_SHEET_NAME = '📜 History';
const DB_SHEET_NAME = '⚙️ Internal DB';
const HISTORY_HEADER = ['Thời gian', 'Loại', 'Môn học', 'Ngày', 'Chi tiết', 'UID'];
const DB_CHUNK_SIZE = 40000; // Một ô Google Sheet chứa tối đa 50.000 ký tự nên chia nhỏ dữ liệu ra nhiều dòng
const MAX_RUNTIME_MS = 4.5 * 60 * 1000; // Apps Script giới hạn 6 phút/lần chạy, dừng sớm ở 4,5 phút cho an toàn

// =================================================
// SETUP LẦN ĐẦU, KHÔNG CẦN CHỈNH TỪ PHẦN NÀY TRỞ ĐI CHỈ CẦN SỬA CONFIG
// =================================================
// MỘT hàm duy nhất cho người dùng mới: setup() + đồng bộ lần đầu + bật tự động đồng bộ
function setupAndSync() {
  // 1. Cài đặt ban đầu (tạo lịch, dùng Sheet đang gắn với script, lưu link Moodle)
  setup();
  
  // 2. Đồng bộ lần đầu
  const result = testSync();
  if (!result || !result.ok) {
    showMessage('⚠️ Cài đặt xong nhưng đồng bộ lần đầu bị lỗi:\n' + (result ? result.error : 'Không rõ nguyên nhân')
      + '\n\nHãy kiểm tra lại MOODLE_URL trong CONFIG rồi chạy lại setupAndSync.');
    return;
  }
  
  // 3. Bật tự động đồng bộ (cần để hệ thống tự tạo nốt phần lịch chưa kịp tạo ở lần đầu)
  createTrigger();
  
  let message = '✅ Cài đặt & đồng bộ lần đầu thành công!\n\n' + result.summary;
  if (result.pending > 0) {
    message += '\n\nCòn ' + result.pending + ' sự kiện chưa tạo kịp do Google giới hạn tốc độ. Bạn không cần làm gì thêm, '
      + 'hệ thống sẽ tự tạo nốt ở các lần chạy tự động tiếp theo (mỗi ' + CONFIG.SYNC_INTERVAL + ' phút).';
  } else {
    message += '\n\nHệ thống sẽ tự làm mới lịch mỗi ' + CONFIG.SYNC_INTERVAL + ' phút.';
  }
  showMessage(message);
}

function updateDashboard() {
  createDashboard();
}
function fixDuplicates() {
  const calendar = getOrCreateCalendar();
  const startTime = new Date(new Date().getFullYear(), 0, 1); // Tìm từ đầu năm nay
  const endTime = new Date(new Date().getFullYear() + 1, 11, 31); // Đến cuối năm sau
  
  showMessage('Bắt đầu quét và xóa các sự kiện trùng lặp...');
  
  const events = calendar.getEvents(startTime, endTime);
  const eventMap = {};
  let deletedCount = 0;
  
  // Duyệt qua tất cả sự kiện trên Google Calendar
  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    const title = event.getTitle();
    const start = event.getStartTime().getTime();
    
    // Tạo một "chữ ký" đơn giản để nhận dạng sự kiện: Tên môn + Thời gian bắt đầu
    const signature = title + "_" + start;
    
    if (eventMap[signature]) {
      // Nếu "chữ ký" này đã tồn tại, tức là sự kiện này là bản trùng lặp -> Xóa
      event.deleteEvent();
      deletedCount++;
      Utilities.sleep(500); // Ngủ 0.5s để tránh Google báo Spam khi xóa nhanh
    } else {
      // Nếu chưa tồn tại, lưu vào map để so sánh cho các sự kiện tiếp theo
      eventMap[signature] = true;
    }
  }
  
  // Sau khi xóa lịch trùng trên Google Calendar, ta cũng nên xóa sạch Internal DB
  // để lần đồng bộ tiếp theo hệ thống tự động nhận diện lại từ đầu cho chính xác.
  clearEventDatabase();
  
  showMessage(`Đã quét xong! Xóa thành công ${deletedCount} sự kiện bị trùng lặp.\n\nHãy chạy lại hàm testSync() để hệ thống đồng bộ lại những sự kiện còn thiếu.`);
}
function setup() {
  const props = PropertiesService.getScriptProperties();
  
  if (!CONFIG.MOODLE_URL || CONFIG.MOODLE_URL === 'ĐIỀN_LINK_MOODLE_CỦA_BẠN_VÀO_ĐÂY') {
    throw new Error('Vui lòng điền link Moodle vào biến MOODLE_URL trong cấu hình (CONFIG) trước khi chạy.');
  }
  
  props.setProperty('MOODLE_URL', CONFIG.MOODLE_URL);
  props.setProperty('TIMEZONE', 'Asia/Ho_Chi_Minh');
  
  // Lấy hoặc tạo Calendar & Sheet
  const calendar = getOrCreateCalendar();
  const ss = getLogSpreadsheet(); // Dùng Sheet đang gắn với script, chỉ tạo mới khi chạy độc lập
  getHistorySheet();
  
  // Khởi tạo Internal DB để lách luật 9KB của Property Service
  getOrCreateInternalDBSheet();
  
  Logger.log('Calendar ID: ' + calendar.getId());
  Logger.log('Google Sheet log: ' + ss.getUrl());
  Logger.log('Email thông báo: ' + getNotifyEmail());
  Logger.log('Setup hoàn tất.');
}

// =================================================
// LẤY EMAIL THÔNG BÁO
// =================================================
function getNotifyEmail() {
  if (CONFIG.NOTIFY_EMAIL) {
    return CONFIG.NOTIFY_EMAIL;
  }
  const email = Session.getEffectiveUser().getEmail();
  if (!email) {
    throw new Error('Không xác định được email nhận thông báo. Hãy điền CONFIG.NOTIFY_EMAIL.');
  }
  return email;
}

// =================================================
// LẤY / TẠO GOOGLE CALENDAR
// =================================================
function getOrCreateCalendar() {
  const calendars = CalendarApp.getCalendarsByName(CONFIG.CALENDAR_NAME);
  if (calendars.length > 0) {
    return calendars[0];
  }
  return CalendarApp.createCalendar(CONFIG.CALENDAR_NAME, {
    description: 'Lịch học được đồng bộ tự động từ Moodle'
  });
}

// =================================================
// DATABASE LƯU TRỮ VƯỢT GIỚI HẠN 9KB (MỚI)
// =================================================
function getOrCreateInternalDBSheet() {
  const ss = getLogSpreadsheet();
  let sheet = ss.getSheetByName(DB_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(DB_SHEET_NAME);
    sheet.hideSheet(); // Ẩn đi để tránh bị người dùng vô tình chỉnh sửa
  }
  return sheet;
}

function getEventDatabase() {
  const sheet = getOrCreateInternalDBSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 1) return {};
  // Dữ liệu được chia thành nhiều dòng (mỗi ô tối đa 50.000 ký tự) nên nối lại trước khi đọc
  const json = sheet.getRange(1, 1, lastRow, 1).getValues().map(row => row[0]).join('');
  return json ? JSON.parse(json) : {};
}

function saveEventDatabase(data) {
  const sheet = getOrCreateInternalDBSheet();
  const json = JSON.stringify(data);
  const rows = [];
  for (let i = 0; i < json.length; i += DB_CHUNK_SIZE) {
    rows.push([json.substring(i, i + DB_CHUNK_SIZE)]);
  }
  if (!rows.length) rows.push(['']);
  
  sheet.clearContents();
  // Định dạng văn bản thuần để Sheets không tự hiểu nhầm một đoạn bắt đầu bằng "=" là công thức
  sheet.getRange(1, 1, rows.length, 1).setNumberFormat('@').setValues(rows);
}

function clearEventDatabase() {
  getOrCreateInternalDBSheet().clearContents();
}

// =================================================
// LẤY / TẠO GOOGLE SHEET LOG
// =================================================
// Thêm hàm này vào code của bạn
function getLogSpreadsheet() {
  const props = PropertiesService.getScriptProperties();
  
  // 1. Script được tạo từ trong một Google Sheet (Tiện ích mở rộng → Apps Script): dùng luôn Sheet đó.
  //    Không tạo Sheet mới và không đổi tên file của người dùng.
  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) {
    if (props.getProperty('LOG_SPREADSHEET_ID') !== active.getId()) {
      props.setProperty('LOG_SPREADSHEET_ID', active.getId());
    }
    return active;
  }
  
  // 2. Script độc lập: mở lại Sheet đã tạo ở lần setup trước (ID được lưu lại)
  const savedId = props.getProperty('LOG_SPREADSHEET_ID');
  if (savedId) {
    try {
      return SpreadsheetApp.openById(savedId);
    } catch (e) {
      Logger.log('Không mở được Sheet đã lưu (có thể đã bị xóa), sẽ tìm hoặc tạo lại: ' + e);
    }
  }
  
  // 3. Tìm file Sheet cùng tên trong Drive
  const files = DriveApp.getFilesByName(CONFIG.LOG_SHEET_NAME);
  while (files.hasNext()) {
    const file = files.next();
    if (file.getMimeType() === MimeType.GOOGLE_SHEETS && !file.isTrashed()) {
      const found = SpreadsheetApp.open(file);
      props.setProperty('LOG_SPREADSHEET_ID', found.getId());
      return found;
    }
  }
  
  // 4. Chưa có gì cả (tạo thẳng bằng Apps Script) thì mới tạo Sheet mới
  const created = SpreadsheetApp.create(CONFIG.LOG_SHEET_NAME);
  props.setProperty('LOG_SPREADSHEET_ID', created.getId());
  return created;
}

// Trang tính lưu lịch sử thay đổi (có dòng tiêu đề ở hàng 1)
function getHistorySheet() {
  const ss = getLogSpreadsheet();
  let sheet = ss.getSheetByName(HISTORY_SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(HISTORY_SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, HISTORY_HEADER.length).setValues([HISTORY_HEADER]).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

// =================================================
// GHI LOG
// =================================================
function writeLogs(changes) {
  if (!changes.length) return;
  const sheet = getHistorySheet();
  const now = new Date();
  const rows = changes.map(c => [
    now,
    c.type,
    c.event.title,
    c.event.start ? formatDate(c.event.start) : '',
    c.details,
    c.event.uid || ''
  ]);
  // Ghi một lần cho cả loạt thay đổi thay vì appendRow từng dòng (nhanh hơn nhiều)
  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
}

// =================================================
// FORMAT DATE
// =================================================
function formatDate(date) {
  if (!date) return '';
  return Utilities.formatDate(date, 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy HH:mm');
}

// =================================================
// HÀM ĐỒNG BỘ CHÍNH
// =================================================
function syncUITCalendar() {
  const props = PropertiesService.getScriptProperties();
  const url = props.getProperty('MOODLE_URL');
  if (!url) {
    handleSyncError(new Error('Chưa cấu hình MOODLE_URL.'));
    return { ok: false, error: 'Chưa cấu hình MOODLE_URL. Hãy chạy setup() trước.' };
  }
  
  // Khóa để hai lần chạy (trigger + bấm tay) không chạy chồng lên nhau, tránh tạo trùng lịch
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    Logger.log('Có một lần đồng bộ khác đang chạy, bỏ qua lần này.');
    return { ok: false, error: 'Có một lần đồng bộ khác đang chạy, hãy thử lại sau ít phút.' };
  }
  
  try {
    return runSync(url, props);
  } catch (error) {
    handleSyncError(error);
    return { ok: false, error: String(error) };
  } finally {
    lock.releaseLock();
  }
}

function runSync(url, props) {
  const response = UrlFetchApp.fetch(url, {
    method: 'get',
    muteHttpExceptions: true,
    followRedirects: true,
    headers: { 'User-Agent': 'Moodle-Calendar-Sync/1.1' }
  });
  
  const status = response.getResponseCode();
  if (status !== 200) {
    throw new Error('Moodle trả về HTTP ' + status);
  }
  
  const ics = response.getContentText('UTF-8');
  if (!ics.includes('BEGIN:VCALENDAR')) {
    throw new Error('Dữ liệu Moodle trả về không phải iCalendar hợp lệ.');
  }
  
  const events = parseICS(ics);
  if (!events.length) {
    throw new Error('Moodle trả về 0 sự kiện. Không thực hiện thay đổi Calendar để tránh xóa nhầm toàn bộ lịch.');
  }
  
  // Buổi sắp tới làm trước, buổi đã qua làm sau: nếu bị giới hạn giữa chừng thì lịch gần nhất vẫn có trước
  const nowMs = Date.now();
  events.sort((a, b) => {
    const aUpcoming = a.end.getTime() >= nowMs;
    const bUpcoming = b.end.getTime() >= nowMs;
    if (aUpcoming !== bUpcoming) return aUpcoming ? -1 : 1;
    return aUpcoming ? a.start - b.start : b.start - a.start;
  });
  
  const calendar = getOrCreateCalendar();
  const stored = getEventDatabase();
  
  // Lập danh sách UID hiện có TRƯỚC khi xử lý: nếu dừng giữa chừng thì không xóa nhầm sự kiện chưa kịp duyệt tới
  const currentUIDs = {};
  events.forEach(e => { if (e.uid) currentUIDs[e.uid] = true; });
  
  let added = 0, updated = 0, deleted = 0;
  let opsDone = 0, pending = 0, rateLimited = false;
  const changes = [];
  const startedAt = Date.now();
  const hasBudget = () => !rateLimited
    && opsDone < CONFIG.MAX_OPS_PER_RUN
    && (Date.now() - startedAt) < MAX_RUNTIME_MS;
  const pause = () => Utilities.sleep(CONFIG.OP_DELAY_MS);
  
  try {
    // ---- Thêm / sửa ----
    for (const data of events) {
      if (!data.uid) continue;
      
      const signature = createSignature(data);
      const old = stored[data.uid];
      const needsWork = !old || old.signature !== signature;
      
      if (!hasBudget()) {
        if (needsWork) pending++;
        continue;
      }
      
      try {
        if (!old) {
          const googleEvent = createGoogleEvent(calendar, data);
          stored[data.uid] = makeRecord(googleEvent, signature, data); // ghi nhận ngay sau khi tạo để không bị tạo trùng
          added++; opsDone++;
          changes.push({ type: 'ADDED', event: data, details: 'Có buổi học mới.' });
          applyReminders(googleEvent);
          pause();
          continue;
        }
        
        const googleEvent = calendar.getEventById(old.eventId);
        if (!googleEvent) {
          const recreated = createGoogleEvent(calendar, data);
          stored[data.uid] = makeRecord(recreated, signature, data);
          added++; opsDone++;
          changes.push({
            type: 'ADDED',
            event: data,
            details: 'Sự kiện được tạo lại vì đã bị xóa khỏi Google Calendar.'
          });
          applyReminders(recreated);
          pause();
        } else if (needsWork) {
          const oldData = old.data ? deserializeEvent(old.data) : null;
          updateGoogleEvent(googleEvent, data, oldData);
          stored[data.uid] = makeRecord(googleEvent, signature, data);
          updated++; opsDone++;
          changes.push({
            type: 'UPDATED',
            event: data,
            oldData: oldData,
            details: describeChange(oldData, data)
          });
          pause();
        }
      } catch (e) {
        if (!isRateLimitError(e)) throw e;
        rateLimited = true;
        Logger.log('Google đang giới hạn tốc độ, dừng lần chạy này và làm tiếp ở lần sau: ' + e);
        const now = stored[data.uid];
        if (!now || now.signature !== signature) pending++;
      }
    }
    
    // ---- Xóa những buổi không còn trên Moodle ----
    for (const uid of Object.keys(stored)) {
      if (currentUIDs[uid]) continue;
      if (!hasBudget()) { pending++; continue; }
      
      const old = stored[uid];
      try {
        const googleEvent = calendar.getEventById(old.eventId);
        if (googleEvent) {
          withRetry(() => googleEvent.deleteEvent());
          deleted++; opsDone++;
          const oldData = old.data ? deserializeEvent(old.data) : null;
          changes.push({
            type: 'DELETED',
            event: oldData || { uid: uid, title: 'Không rõ tên môn' },
            details: 'Buổi học không còn xuất hiện trên Moodle.'
          });
          pause();
        }
        delete stored[uid];
      } catch (e) {
        if (!isRateLimitError(e)) throw e;
        rateLimited = true;
        Logger.log('Google đang giới hạn tốc độ khi xóa, làm tiếp ở lần sau: ' + e);
        pending++;
      }
    }
  } finally {
    // Luôn lưu DB dù giữa chừng có lỗi gì, để lần sau không tạo lại (trùng) những sự kiện đã tạo xong
    saveEventDatabase(stored);
  }
  
  if (rateLimited && opsDone === 0) {
    throw new Error('Google Calendar đang giới hạn tốc độ tạo/xóa sự kiện. Script sẽ tự thử lại ở lần chạy sau.');
  }
  
  if (changes.length > 0) {
    try {
      writeLogs(changes);
    } catch (logError) {
      Logger.log('Ghi log lỗi: ' + logError);
    }
    sendChangeNotification(changes);
  }
  
  const summary = formatDate(new Date()) + ' | Thêm: ' + added + ' | Sửa: ' + updated + ' | Xóa: ' + deleted
    + ' | Tổng: ' + events.length + (pending ? ' | Chờ xử lý: ' + pending : '');
  props.setProperty('LAST_SYNC', summary);
  
  try {
    updateDashboard();
  } catch (dashboardError) {
    Logger.log('Dashboard update error: ' + dashboardError);
  }
  
  const wasError = props.getProperty('SYNC_ERROR_STATE');
  const errorCount = Number(props.getProperty('SYNC_ERROR_COUNT') || 0);
  props.deleteProperty('SYNC_ERROR_STATE');
  props.deleteProperty('SYNC_ERROR_COUNT');
  
  if (wasError) sendRecoveryNotification(errorCount);
  
  // =========================================================
  // KIỂM TRA UPDATE & GỬI MAIL KHẨN CẤP
  // =========================================================
  const updateInfo = checkForUpdates();
  if (updateInfo.hasUpdate && updateInfo.isUrgent) {
    const lastNotifiedVersion = props.getProperty('LAST_NOTIFIED_VERSION');
    if (lastNotifiedVersion !== updateInfo.remoteVersion) {
      const email = getNotifyEmail();
      MailApp.sendEmail({
        to: email,
        subject: '🚨 BẢN CẬP NHẬT QUAN TRỌNG: Moodle Calendar Sync v' + updateInfo.remoteVersion,
        body: 'Chào bạn,\n\nHệ thống Moodle Calendar Sync vừa có một bản cập nhật quan trọng (v' + updateInfo.remoteVersion + ').\n\n' + 
              'Chi tiết: ' + updateInfo.message + '\n\n' +
              'Vui lòng truy cập GitHub để copy mã nguồn mới nhất và dán đè vào file Apps Script của bạn để hệ thống tiếp tục hoạt động ổn định.\n\n' +
              'Link: https://github.com/nguyenhungphongg/Auto-Sync-UIT-Course-to-your-calendar'
      });
      // Đánh dấu đã gửi để 15 phút sau code chạy lại không bị gửi spam email nữa
      props.setProperty('LAST_NOTIFIED_VERSION', updateInfo.remoteVersion);
    }
  }

  Logger.log(summary);
  if (pending) {
    Logger.log('Còn ' + pending + ' mục chưa xử lý, sẽ tiếp tục ở lần chạy tự động sau (mỗi ' + CONFIG.SYNC_INTERVAL + ' phút).');
  }
  return { ok: true, pending: pending, summary: summary };
}

// =================================================
// CHỐNG LỖI "QUÁ NHIỀU LỊCH TRONG THỜI GIAN NGẮN"
// =================================================
function isRateLimitError(error) {
  const message = String((error && error.message) || error);
  return /too many|quá nhiều|rate limit|limit exceeded|try again later|thử lại sau/i.test(message);
}

// Chạy fn(); nếu bị Google giới hạn tốc độ thì chờ rồi thử lại (chờ lâu dần). fn nên là thao tác có thể chạy lại an toàn.
function withRetry(fn) {
  let wait = CONFIG.RETRY_WAIT_MS;
  for (let attempt = 1; ; attempt++) {
    try {
      return fn();
    } catch (error) {
      if (!isRateLimitError(error) || attempt >= CONFIG.RETRY_ATTEMPTS) throw error;
      Logger.log('Bị giới hạn tốc độ (lần ' + attempt + '), chờ ' + (wait / 1000) + ' giây rồi thử lại...');
      Utilities.sleep(wait);
      wait *= 2;
    }
  }
}

function makeRecord(googleEvent, signature, data) {
  return {
    eventId: googleEvent.getId(),
    signature: signature,
    data: serializeEvent(data)
  };
}

// =================================================
// TẠO & SERIALIZE & DESERIALIZE
// =================================================
function createSignature(data) {
  return JSON.stringify({
    title: data.title,
    start: data.start ? data.start.getTime() : null,
    end: data.end ? data.end.getTime() : null,
    location: data.location || '',
    description: data.description || ''
  });
}

function serializeEvent(data) {
  return {
    uid: data.uid,
    title: data.title,
    start: data.start ? data.start.getTime() : null,
    end: data.end ? data.end.getTime() : null,
    location: data.location || '',
    description: data.description || ''
  };
}

function deserializeEvent(data) {
  if (!data) return null;
  return {
    uid: data.uid,
    title: data.title,
    start: data.start ? new Date(data.start) : null,
    end: data.end ? new Date(data.end) : null,
    location: data.location || '',
    description: data.description || ''
  };
}

// =================================================
// TẠO & UPDATE GOOGLE EVENT CÓ THÊM NHẮC NHỞ
// =================================================
function buildDescription(data) {
  return (data.description || '') + '\n\n[Đồng bộ tự động từ Moodle]';
}

// Chỉ tạo sự kiện. Lời nhắc đặt riêng ở applyReminders() để nếu thử lại thì không tạo trùng sự kiện
function createGoogleEvent(calendar, data) {
  return withRetry(() => calendar.createEvent(data.title, data.start, data.end, {
    location: data.location || '',
    description: buildDescription(data)
  }));
}

function applyReminders(event) {
  withRetry(() => {
    // Xóa mọi nhắc nhở mặc định rồi nạp danh sách từ CONFIG (chạy lại nhiều lần vẫn an toàn)
    event.removeAllReminders();
    CONFIG.REMINDERS.forEach(minutes => event.addPopupReminder(minutes));
  });
}

// Chỉ gọi Google cho phần thực sự thay đổi để tiết kiệm số lần gọi API
function updateGoogleEvent(event, data, oldData) {
  withRetry(() => {
    if (!oldData || oldData.title !== data.title) event.setTitle(data.title);
    if (!oldData || !sameDate(oldData.start, data.start) || !sameDate(oldData.end, data.end)) {
      event.setTime(data.start, data.end);
    }
    if (!oldData || (oldData.location || '') !== (data.location || '')) event.setLocation(data.location || '');
    if (!oldData || (oldData.description || '') !== (data.description || '')) event.setDescription(buildDescription(data));
  });
}

// =================================================
// MÔ TẢ THAY ĐỔI
// =================================================
function describeChange(oldData, newData) {
  if (!oldData) return 'Sự kiện được cập nhật.';
  const changes = [];
  if (oldData.title !== newData.title) changes.push('📚 Môn: "' + oldData.title + '" → "' + newData.title + '"');
  if (!sameDate(oldData.start, newData.start) || !sameDate(oldData.end, newData.end)) {
    changes.push('⏰ Thời gian: ' + formatTimeRange(oldData) + ' → ' + formatTimeRange(newData));
  }
  if ((oldData.location || '') !== (newData.location || '')) {
    changes.push('🏫 Phòng: ' + (oldData.location || 'Không có') + ' → ' + (newData.location || 'Không có'));
  }
  if ((oldData.description || '') !== (newData.description || '')) {
    changes.push('📝 Nội dung mô tả đã thay đổi.');
  }
  return changes.length ? changes.join('\n') : 'Thông tin sự kiện đã thay đổi.';
}

function sameDate(a, b) {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return a.getTime() === b.getTime();
}

function formatTimeRange(data) {
  if (!data || !data.start || !data.end) return 'Không xác định';
  return formatDate(data.start) + ' – ' + Utilities.formatDate(data.end, 'Asia/Ho_Chi_Minh', 'HH:mm');
}

// =================================================
// GỬI THÔNG BÁO EMAIL
// =================================================
function sendChangeNotification(changes) {
  const email = getNotifyEmail();
  let subject = '🔔 Thay đổi lịch học';
  
  if (changes.length === 1) {
    const change = changes[0];
    if (change.type === 'DELETED') subject = '🚨 Hủy buổi học: ' + change.event.title;
    else if (change.type === 'ADDED') subject = '🆕 Thêm buổi học: ' + change.event.title;
    else subject = '🔔 Đổi lịch học: ' + change.event.title;
  }
  
  let body = 'MOODLE CALENDAR SYNC\n\nPhát hiện ' + changes.length + ' thay đổi:\n\n';
  changes.forEach((change) => {
    body += '━━━━━━━━━━━━━━━━━━\n';
    if (change.type === 'DELETED') body += '🚨 HỦY BUỔI HỌC\n\n';
    else if (change.type === 'ADDED') body += '🆕 BUỔI HỌC MỚI\n\n';
    else body += '🔔 THAY ĐỔI LỊCH\n\n';
    
    body += 'Môn: ' + (change.event.title || 'Không rõ') + '\n';
    if (change.event.start) body += 'Ngày: ' + formatDate(change.event.start) + '\n';
    body += '\n' + change.details + '\n\n';
  });
  
  body += '━━━━━━━━━━━━━━━━━━\n\nThời gian kiểm tra: ' + formatDate(new Date()) + '\n\nLịch Google Calendar:\n' + CONFIG.CALENDAR_NAME;
  MailApp.sendEmail({ to: email, subject: subject, body: body });
}

// =================================================
// XỬ LÝ LỖI
// =================================================
function handleSyncError(error) {
  const props = PropertiesService.getScriptProperties();
  const oldCount = Number(props.getProperty('SYNC_ERROR_COUNT') || 0);
  const newCount = oldCount + 1;
  
  props.setProperty('SYNC_ERROR_COUNT', String(newCount));
  props.setProperty('SYNC_ERROR_STATE', 'ERROR');
  props.setProperty('LAST_ERROR', String(error));
  Logger.log('SYNC ERROR #' + newCount + ': ' + error);
  
  if (newCount === 1 || newCount % CONFIG.ERROR_REMINDER_COUNT === 0) {
    sendErrorNotification(error, newCount);
  }
}

function sendErrorNotification(error, count) {
  const email = getNotifyEmail();
  const lastSync = PropertiesService.getScriptProperties().getProperty('LAST_SYNC') || 'Chưa có lần đồng bộ thành công.';
  MailApp.sendEmail({
    to: email,
    subject: '❌ Moodle Calendar Sync gặp lỗi',
    body: 'Hệ thống đồng bộ lịch từ Moodle đang gặp lỗi.\n\nLỗi:\n' + String(error) + '\n\nSố lần lỗi liên tiếp: ' + count + '\n\nLần đồng bộ thành công cuối:\n' + lastSync + '\n\nHệ thống sẽ tiếp tục tự thử lại.'
  });
}

function sendRecoveryNotification(errorCount) {
  const email = getNotifyEmail();
  MailApp.sendEmail({
    to: email,
    subject: '✅ Moodle Calendar Sync đã hoạt động lại',
    body: 'Hệ thống đồng bộ lịch từ Moodle đã hoạt động trở lại.\n\nSố lần đồng bộ lỗi liên tiếp trước đó: ' + errorCount + '\n\nLần đồng bộ thành công:\n' + formatDate(new Date())
  });
}

// =================================================
// PARSE ICS
// =================================================
function parseICS(ics) {
  ics = ics.replace(/\r\n[ \t]/g, '');
  const lines = ics.split(/\r?\n/);
  const events = [];
  let current = null;
  
  lines.forEach(line => {
    if (line === 'BEGIN:VEVENT') { current = {}; return; }
    if (line === 'END:VEVENT') {
      if (current) {
        const event = {
          uid: current.UID || '',
          title: unescapeICS(current.SUMMARY || 'Không có tiêu đề'),
          start: parseICSTime(current.DTSTART_VALUE, current.DTSTART_TZ),
          end: parseICSTime(current.DTEND_VALUE, current.DTEND_TZ),
          location: unescapeICS(current.LOCATION || ''),
          description: unescapeICS(current.DESCRIPTION || '')
        };
        if (event.start && event.end) events.push(event);
      }
      current = null;
      return;
    }
    if (!current) return;
    
    const index = line.indexOf(':');
    if (index === -1) return;
    
    let key = line.substring(0, index);
    const value = line.substring(index + 1);
    const parts = key.split(';');
    const baseKey = parts[0];
    let timezone = '';
    
    parts.slice(1).forEach(part => {
      const pair = part.split('=');
      if (pair[0] === 'TZID') timezone = pair[1];
    });
    
    if (baseKey === 'DTSTART') {
      current.DTSTART_VALUE = value;
      current.DTSTART_TZ = timezone;
    } else if (baseKey === 'DTEND') {
      current.DTEND_VALUE = value;
      current.DTEND_TZ = timezone;
    } else {
      current[baseKey] = value;
    }
  });
  return events;
}

function parseICSTime(value, timezone) {
  if (!value) return null;
  if (value.endsWith('Z')) {
    const s = value.substring(0, value.length - 1);
    return new Date(Date.UTC(
      Number(s.substring(0, 4)),
      Number(s.substring(4, 6)) - 1,
      Number(s.substring(6, 8)),
      Number(s.substring(9, 11)),
      Number(s.substring(11, 13)),
      Number(s.substring(13, 15))
    ));
  }
  const match = value.match(/^(\d{4})(\d{2})(\d{2})T?(\d{2})(\d{2})(\d{2})?$/);
  if (!match) return null;
  
  const tz = timezone || 'Asia/Ho_Chi_Minh';
  return Utilities.parseDate(
    Utilities.formatString('%04d-%02d-%02d %02d:%02d:%02d', match[1], match[2], match[3], match[4], match[5], match[6] || 0),
    tz,
    'yyyy-MM-dd HH:mm:ss'
  );
}

function unescapeICS(value) {
  return value.replace(/\\n/g, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\\\/g, '\\');
}

// =================================================
// TRIGGER ĐỒNG BỘ
// =================================================
function testSync() {
  return syncUITCalendar();
}

function createTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'syncUITCalendar') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  
  ScriptApp.newTrigger('syncUITCalendar')
    .timeBased()
    .everyMinutes(CONFIG.SYNC_INTERVAL)
    .create();
  Logger.log('Đã tạo trigger đồng bộ mỗi ' + CONFIG.SYNC_INTERVAL + ' phút.');
}

function systemStatus() {
  const props = PropertiesService.getScriptProperties();
  Logger.log('===== MOODLE CALENDAR SYNC =====');
  Logger.log('Lần sync cuối: ' + (props.getProperty('LAST_SYNC') || 'Chưa có'));
  Logger.log('Lỗi cuối: ' + (props.getProperty('LAST_ERROR') || 'Không có'));
  Logger.log('Số lỗi liên tiếp: ' + (props.getProperty('SYNC_ERROR_COUNT') || '0'));
  Logger.log('Email: ' + getNotifyEmail());
}

// =================================================
// GOOGLE SHEET DASHBOARD
// =================================================
function getOrCreateSheet(spreadsheet, name) {
  let sheet = spreadsheet.getSheetByName(name);
  if (!sheet) sheet = spreadsheet.insertSheet(name);
  return sheet;
}

function createDashboard() {
  const ss = getLogSpreadsheet();
  
  const dashboard = getOrCreateSheet(ss, '🏠 Dashboard');
  const history = getHistorySheet();
  const events = getOrCreateSheet(ss, '📅 Events');
  const settings = getOrCreateSheet(ss, '⚙️ Settings');
  
  // Xóa nội dung nhưng giữ lại định dạng thay vì dùng hàm clear()
  dashboard.clearContents();
  events.clearContents();
  settings.clearContents();
  
  // Cài đặt Dashboard
  dashboard.setColumnWidth(1, 220);
  dashboard.setColumnWidth(2, 350);
  dashboard.setColumnWidth(3, 180);
  dashboard.getRange('A1:C1').merge().setValue('📅 MOODLE CALENDAR SYNC').setFontSize(22).setFontWeight('bold').setHorizontalAlignment('center');
  dashboard.getRange('A3:B3').merge().setValue('TRẠNG THÁI HỆ THỐNG').setFontWeight('bold').setFontSize(14);
  
  const props = PropertiesService.getScriptProperties();
  const errorCount = Number(props.getProperty('SYNC_ERROR_COUNT') || 0);
  const calendar = getOrCreateCalendar();
  const eventsList = calendar.getEvents(new Date(), new Date(new Date().getTime() + 365 * 24 * 60 * 60 * 1000));
  
  // --- THÊM PHẦN KIỂM TRA UPDATE VÀO ĐÂY ---
  let updateStatusRow = ['Phiên bản hiện tại', 'v' + CONFIG.CURRENT_VERSION + ' (Bản mới nhất)'];
  let isOutdated = false;
  let updateMessage = '';

  const updateInfo = checkForUpdates();
  if (updateInfo.hasUpdate) {
    updateStatusRow = ['CẬP NHẬT MỚI', `🔥 Đã có bản v${updateInfo.remoteVersion} - ${updateInfo.message}. Hãy lên GitHub lấy code mới!🔥`];
    isOutdated = true;
  }
  // --- KẾT THÚC PHẦN KIỂM TRA UPDATE ---

  // VÀ SỬA LẠI ĐOẠN SET VALUES BÊN DƯỚI (Thêm dòng updateStatusRow vào dòng thứ 3)
  dashboard.getRange('A5:B11').setValues([ // Đổi từ A5:B10 thành A5:B11 vì thêm 1 dòng
    ['Trạng thái', errorCount === 0 ? '🟢 ĐANG HOẠT ĐỘNG' : '🔴 ĐANG CÓ LỖI'],
    ['Lần đồng bộ cuối', props.getProperty('LAST_SYNC') || 'Chưa có'],
    updateStatusRow, // DÒNG VỪA THÊM VÀO
    ['Chu kỳ đồng bộ', CONFIG.SYNC_INTERVAL + ' phút'],
    ['Số sự kiện', eventsList.length],
    ['Lỗi liên tiếp', errorCount],
    ['Lỗi cuối', props.getProperty('LAST_ERROR') || 'Không có']
  ]);
  
  dashboard.getRange('A5:A11').setFontWeight('bold'); // Đổi từ A10 thành A11

  // NẾU CÓ BẢN MỚI -> BÔI ĐỎ DÒNG ĐÓ CHO NỔI BẬT
  if (isOutdated) {
    dashboard.getRange('A7:B7').setBackground('#FFFF00').setFontColor('red').setFontWeight('bold');
  } else {
    dashboard.getRange('A7:B7').setBackground(null).setFontColor('black');
  }
  
  // Ghi Lịch sử Gần đây
  dashboard.getRange('A12:C12').merge().setValue('🔔 THAY ĐỔI GẦN ĐÂY').setFontWeight('bold').setFontSize(14);
  dashboard.getRange('A13:C13').setValues([['Thời gian', 'Loại', 'Nội dung']]).setFontWeight('bold');
  
  const lastRow = history.getLastRow();
  if (lastRow > 1) {
    const count = Math.min(10, lastRow - 1);
    const data = history.getRange(lastRow - count + 1, 1, count, 6).getValues();
    const display = data.map(row => [row[0], row[1], row[2] + (row[4] ? ' — ' + row[4] : '')]);
    dashboard.getRange(14, 1, display.length, 3).setValues(display);
  }
  
  // Settings Tab
  settings.getRange('A1:B1').setValues([['Thiết lập', 'Giá trị']]).setFontWeight('bold');
  // --- THÊM DÒNG CẢNH BÁO NÀY VÀO ---
  settings.getRange('A2:B2').merge().setValue('⚠️ LƯU Ý: Trang này chỉ để xem. Việc sửa nội dung ở đây KHÔNG CÓ TÁC DỤNG. Muốn đổi thông số, hãy sửa biến CONFIG trong Apps Script.').setFontColor('red').setFontWeight('bold');
  
  settings.getRange('A3:B7').setValues([ // Đổi từ A2:B6 thành A3:B7
    ['Calendar', CONFIG.CALENDAR_NAME],
    ['Chu kỳ', CONFIG.SYNC_INTERVAL + ' phút'],
    ['Timezone', 'Asia/Ho_Chi_Minh'],
    ['Email thông báo', getNotifyEmail()],
    ['Số lỗi trước khi nhắc', CONFIG.ERROR_REMINDER_COUNT]
  ]);
  settings.setColumnWidth(1, 220); settings.setColumnWidth(2, 400);
  
  // Events Tab
  events.getRange('A1:F1').setValues([['UID', 'Môn học', 'Bắt đầu', 'Kết thúc', 'Phòng', 'Google Event ID']]).setFontWeight('bold');
  const stored = getEventDatabase();
  const eventRows = Object.keys(stored).map(uid => {
    const item = stored[uid];
    const data = item.data ? deserializeEvent(item.data) : null;
    return data ? [uid, data.title, data.start, data.end, data.location, item.eventId] : null;
  }).filter(row => row);
  
  if (eventRows.length) events.getRange(2, 1, eventRows.length, 6).setValues(eventRows);
  events.setFrozenRows(1);
  
  if (history.getLastRow() > 1) history.getRange(2, 1, history.getLastRow() - 1, 1).setNumberFormat('dd/MM/yyyy HH:mm:ss');
  if (events.getLastRow() > 1) events.getRange(2, 3, events.getLastRow() - 1, 2).setNumberFormat('dd/MM/yyyy HH:mm');
  
  Logger.log('Dashboard đã được tạo/cập nhật.');
}



// =================================================
// MENU
// =================================================
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('📅 Moodle Calendar Sync')
    .addItem('🚀 Cài đặt & đồng bộ lần đầu', 'setupAndSync')
    .addItem('🔄 Đồng bộ ngay', 'testSync')
    .addItem('📊 Cập nhật Dashboard', 'updateDashboard')
    .addItem('🔍 Kiểm tra hệ thống', 'systemStatus')
    .addSeparator()
    .addItem('⚙️ Tạo trigger đồng bộ', 'createTrigger')
    .addToUi();
}

function createSpreadsheetOpenTrigger() {
  const props = PropertiesService.getScriptProperties();
  const spreadsheetId = props.getProperty('LOG_SPREADSHEET_ID');
  if (!spreadsheetId) {
    throw new Error('Chưa tìm thấy LOG_SPREADSHEET_ID. Hãy chạy setup() trước.');
  }
  
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'onOpen') ScriptApp.deleteTrigger(trigger);
  });
  
  ScriptApp.newTrigger('onOpen').forSpreadsheet(spreadsheetId).onOpen().create();
  Logger.log('Đã tạo trigger mở Google Sheet.');
}

// =================================================
// DỌN DẸP LỊCH TRÙNG
// =================================================
// =================================================
// DỌN DẸP LỊCH TRÙNG (Đã được sửa lại)
// =================================================


// Hiện thông báo trên màn hình Sheet nếu có. Chạy từ editor/trigger thì không có giao diện, chỉ ghi log.
function showMessage(text) {
  Logger.log(text);
  try {
    // Xóa dòng alert cũ gây treo code
    // SpreadsheetApp.getUi().alert(text);
    
    // Thay bằng dòng toast này (chỉ hiện thông báo góc dưới màn hình trong 10 giây rồi tự tắt)
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (ss) ss.toast('Đồng bộ thành công! Mở tab Apps Script để xem Log chi tiết.', '✅ Hoàn tất', 10);
  } catch (e) {
    // Không có giao diện để hiện hộp thoại, bỏ qua
  }
}

// =================================================
// KIỂM TRA PHIÊN BẢN (VERSION CHECK)
// =================================================
function checkForUpdates() {
  try {
    const url = 'https://raw.githubusercontent.com/nguyenhungphongg/Auto-Sync-UIT-Course-to-your-calendar/refs/heads/main/version.json';
    
    const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    if (response.getResponseCode() === 200) {
      const data = JSON.parse(response.getContentText());
      const remoteVersion = parseFloat(data.latest);
      const localVersion = parseFloat(CONFIG.CURRENT_VERSION);
      
      if (remoteVersion > localVersion) {
        return {
          hasUpdate: true,
          remoteVersion: data.latest,
          message: data.message,
          isUrgent: data.isUrgent === true // Lấy thêm cờ báo khẩn từ GitHub
        };
      }
    }
  } catch (e) { }
  return { hasUpdate: false };
}
