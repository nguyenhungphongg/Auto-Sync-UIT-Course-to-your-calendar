/*************************************************
 * UIT MOODLE → GOOGLE CALENDAR SYNC
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
  CALENDAR_NAME: 'UIT - Lịch course', //Tên lịch mà bạn muốn tạo
  LOG_SHEET_NAME: 'UIT Calendar Sync Log', //Tên file sheet log của bạn
  NOTIFY_EMAIL: 'email_cua_ban@gm.uit.edu.vn', // Email nhận thông báo
  ERROR_REMINDER_COUNT: 10, //Tần suất nhắc lại email thông báo lỗi khi hệ thống gặp sự cố liên tục, nhằm mục đích chống spam hộp thư.
  MOODLE_URL: 'DÁN_LINK_MOODLE_ICAL_CỦA_BẠN_VÀO_ĐÂY', 
  SYNC_INTERVAL: 15, // Chu kỳ đồng bộ (phút), khoảng tối ưu để tự động chạy code và kéo lịch về. 
  //Chu kỳ đồng bộ càng ít thì quota (hạn mức) trong ngày của bạn càng cao và có thể hết hạn mức (code dừng hoạt động tạm thời) do chính sách của Google.
  REMINDERS: [0, 30, 180, 1440] // Các mốc thông báo trước đó (phút). Mặc định tương đương ngay tại thời điểm bắt đầu, 30 phút trước, 3 giờ trước, 1 ngày trước.
  //Nếu không muốn thông báo, vui lòng xoá nội dung trong REMINDERS, ví dụ: REMINDERS: []
};

// =================================================
// SETUP LẦN ĐẦU, KHÔNG CẦN CHỈNH TỪ PHẦN NÀY TRỞ ĐI CHỈ CẦN SỬA CONFIG
// =================================================
function setup() {
  const props = PropertiesService.getScriptProperties();
  
  if (!CONFIG.MOODLE_URL || CONFIG.MOODLE_URL === 'ĐIỀN_LINK_MOODLE_CỦA_BẠN_VÀO_ĐÂY') {
    throw new Error('Vui lòng điền link Moodle vào biến MOODLE_URL trong cấu hình (CONFIG) trước khi chạy.');
  }
  
  props.setProperty('MOODLE_URL', CONFIG.MOODLE_URL);
  
  // Lấy hoặc tạo Calendar & Sheet
  const calendar = getOrCreateCalendar();
  const sheet = getOrCreateLogSheet();
  
  // Khởi tạo Internal DB để lách luật 9KB của Property Service
  getOrCreateInternalDBSheet();
  
  props.setProperty('TIMEZONE', 'Asia/Ho_Chi_Minh');
  
  Logger.log('Calendar ID: ' + calendar.getId());
  Logger.log('Log Sheet ID: ' + sheet.getParent().getId());
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
    description: 'Lịch học được đồng bộ tự động từ Moodle UIT'
  });
}

// =================================================
// DATABASE LƯU TRỮ VƯỢT GIỚI HẠN 9KB (MỚI)
// =================================================
function getOrCreateInternalDBSheet() {
  const sheetLog = getOrCreateLogSheet();
  const ss = sheetLog.getParent();
  let sheet = ss.getSheetByName('⚙️ Internal DB');
  if (!sheet) {
    sheet = ss.insertSheet('⚙️ Internal DB');
    sheet.hideSheet(); // Ẩn đi để tránh bị người dùng vô tình chỉnh sửa
  }
  return sheet;
}

function getEventDatabase() {
  const sheet = getOrCreateInternalDBSheet();
  const data = sheet.getRange('A1').getValue();
  return data ? JSON.parse(data) : {};
}

function saveEventDatabase(data) {
  const sheet = getOrCreateInternalDBSheet();
  sheet.getRange('A1').setValue(JSON.stringify(data));
}

// =================================================
// LẤY / TẠO GOOGLE SHEET LOG
// =================================================
function getOrCreateLogSheet() {
  const props = PropertiesService.getScriptProperties();
  let spreadsheetId = props.getProperty('LOG_SPREADSHEET_ID');
  
  if (spreadsheetId) {
    try {
      const ss = SpreadsheetApp.openById(spreadsheetId);
      let sheet = ss.getSheetByName('📜 History');
      if (!sheet) {
        sheet = ss.getSheetByName('History');
        if (sheet) {
          sheet.setName('📜 History');
        } else {
          sheet = ss.insertSheet('📜 History');
          sheet.appendRow(['Thời gian', 'Loại', 'Môn học', 'Ngày', 'Chi tiết', 'UID']);
        }
      }
      return sheet;
    } catch (e) {
      props.deleteProperty('LOG_SPREADSHEET_ID');
    }
  }
  
  const ss = SpreadsheetApp.create(CONFIG.LOG_SHEET_NAME);
  const sheet = ss.getSheets()[0];
  sheet.setName('📜 History');
  sheet.appendRow(['Thời gian', 'Loại', 'Môn học', 'Ngày', 'Chi tiết', 'UID']);
  props.setProperty('LOG_SPREADSHEET_ID', ss.getId());
  return sheet;
}

// =================================================
// GHI LOG
// =================================================
function writeLog(type, title, eventDate, details, uid) {
  const sheet = getOrCreateLogSheet();
  sheet.appendRow([
    new Date(),
    type,
    title,
    eventDate ? formatDate(eventDate) : '',
    details,
    uid || ''
  ]);
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
    return;
  }
  
  try {
    const response = UrlFetchApp.fetch(url, {
      method: 'get',
      muteHttpExceptions: true,
      followRedirects: true,
      headers: { 'User-Agent': 'UIT-Calendar-Sync/1.1' }
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
    
    const calendar = getOrCreateCalendar();
    const stored = getEventDatabase(); 
    const currentUIDs = {};
    let added = 0, updated = 0, deleted = 0;
    const changes = [];
    
    events.forEach(data => {
      if (!data.uid) return;
      
      currentUIDs[data.uid] = true;
      const signature = createSignature(data);
      const old = stored[data.uid];
      
      if (old) {
        let googleEvent = calendar.getEventById(old.eventId);
        if (!googleEvent) {
          googleEvent = createGoogleEvent(calendar, data);
          stored[data.uid] = {
            eventId: googleEvent.getId(),
            signature: signature,
            data: serializeEvent(data)
          };
          added++;
          changes.push({
            type: 'ADDED',
            event: data,
            details: 'Sự kiện được tạo lại vì đã bị xóa khỏi Google Calendar.'
          });
          return;
        }
        
        if (old.signature === signature) return;
        
        const oldData = old.data ? deserializeEvent(old.data) : null;
        updateGoogleEvent(googleEvent, data);
        stored[data.uid] = {
          eventId: googleEvent.getId(),
          signature: signature,
          data: serializeEvent(data)
        };
        updated++;
        changes.push({
          type: 'UPDATED',
          event: data,
          oldData: oldData,
          details: describeChange(oldData, data)
        });
        return;
      }
      
      const googleEvent = createGoogleEvent(calendar, data);
      stored[data.uid] = {
        eventId: googleEvent.getId(),
        signature: signature,
        data: serializeEvent(data)
      };
      added++;
      changes.push({ type: 'ADDED', event: data, details: 'Có buổi học mới.' });
    });
    
    Object.keys(stored).forEach(uid => {
      if (currentUIDs[uid]) return;
      const old = stored[uid];
      const googleEvent = calendar.getEventById(old.eventId);
      
      if (googleEvent) {
        googleEvent.deleteEvent();
        deleted++;
        const oldData = old.data ? deserializeEvent(old.data) : null;
        changes.push({
          type: 'DELETED',
          event: oldData || { uid: uid, title: 'Không rõ tên môn' },
          details: 'Buổi học không còn xuất hiện trên Moodle.'
        });
      }
      delete stored[uid];
    });
    
    // Lưu DB mới vào Sheet thay vì PropertiesService
    saveEventDatabase(stored);
    
    if (changes.length > 0) {
      changes.forEach(change => {
        writeLog(change.type, change.event.title, change.event.start, change.details, change.event.uid);
      });
      sendChangeNotification(changes);
    }
    
    const now = new Date();
    const summary = formatDate(now) + ' | Thêm: ' + added + ' | Sửa: ' + updated + ' | Xóa: ' + deleted + ' | Tổng: ' + events.length;
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
    Logger.log(summary);
    
  } catch (error) {
    handleSyncError(error);
  }
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
function createGoogleEvent(calendar, data) {
  const event = calendar.createEvent(data.title, data.start, data.end, {
    location: data.location || '',
    description: (data.description || '') + '\n\n[Đồng bộ tự động từ Moodle UIT]'
  });
  
  // Xóa mọi nhắc nhở mặc định cũ (nếu có)
  event.removeAllReminders();
  
  // Cài đặt danh sách nhắc nhở từ CONFIG
  CONFIG.REMINDERS.forEach(function(minutes) {
    event.addPopupReminder(minutes);
  });
  
  return event;
}

function updateGoogleEvent(event, data) {
  event.setTitle(data.title);
  event.setTime(data.start, data.end);
  event.setLocation(data.location || '');
  event.setDescription((data.description || '') + '\n\n[Đồng bộ tự động từ Moodle UIT]');
  
  // Xóa nhắc nhở cũ và nạp lại nhắc nhở mới khi event được cập nhật
  event.removeAllReminders();
  CONFIG.REMINDERS.forEach(function(minutes) {
    event.addPopupReminder(minutes);
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
  let subject = '🔔 UIT thay đổi lịch học';
  
  if (changes.length === 1) {
    const change = changes[0];
    if (change.type === 'DELETED') subject = '🚨 UIT hủy buổi học: ' + change.event.title;
    else if (change.type === 'ADDED') subject = '🆕 UIT thêm buổi học: ' + change.event.title;
    else subject = '🔔 UIT đổi lịch: ' + change.event.title;
  }
  
  let body = 'UIT CALENDAR SYNC\n\nPhát hiện ' + changes.length + ' thay đổi:\n\n';
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
    subject: '❌ UIT Calendar Sync gặp lỗi',
    body: 'Hệ thống đồng bộ lịch UIT đang gặp lỗi.\n\nLỗi:\n' + String(error) + '\n\nSố lần lỗi liên tiếp: ' + count + '\n\nLần đồng bộ thành công cuối:\n' + lastSync + '\n\nHệ thống sẽ tiếp tục tự thử lại.'
  });
}

function sendRecoveryNotification(errorCount) {
  const email = getNotifyEmail();
  MailApp.sendEmail({
    to: email,
    subject: '✅ UIT Calendar Sync đã hoạt động lại',
    body: 'Hệ thống đồng bộ lịch UIT đã hoạt động trở lại.\n\nSố lần đồng bộ lỗi liên tiếp trước đó: ' + errorCount + '\n\nLần đồng bộ thành công:\n' + formatDate(new Date())
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
  syncUITCalendar();
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
  Logger.log('===== UIT CALENDAR SYNC =====');
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
  const sheet = getOrCreateLogSheet();
  const ss = sheet.getParent();
  
  const dashboard = getOrCreateSheet(ss, '🏠 Dashboard');
  const history = getOrCreateSheet(ss, '📜 History');
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
  dashboard.getRange('A1:C1').merge().setValue('📅 UIT CALENDAR SYNC').setFontSize(22).setFontWeight('bold').setHorizontalAlignment('center');
  dashboard.getRange('A3:B3').merge().setValue('TRẠNG THÁI HỆ THỐNG').setFontWeight('bold').setFontSize(14);
  
  const props = PropertiesService.getScriptProperties();
  const errorCount = Number(props.getProperty('SYNC_ERROR_COUNT') || 0);
  const calendar = getOrCreateCalendar();
  const eventsList = calendar.getEvents(new Date(), new Date(new Date().getTime() + 365 * 24 * 60 * 60 * 1000));
  
  dashboard.getRange('A5:B10').setValues([
    ['Trạng thái', errorCount === 0 ? '🟢 ĐANG HOẠT ĐỘNG' : '🔴 ĐANG CÓ LỖI'],
    ['Lần đồng bộ cuối', props.getProperty('LAST_SYNC') || 'Chưa có'],
    ['Chu kỳ đồng bộ', CONFIG.SYNC_INTERVAL + ' phút'],
    ['Số sự kiện', eventsList.length],
    ['Lỗi liên tiếp', errorCount],
    ['Lỗi cuối', props.getProperty('LAST_ERROR') || 'Không có']
  ]);
  dashboard.getRange('A5:A10').setFontWeight('bold');
  
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
  settings.getRange('A2:B6').setValues([
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

function updateDashboard() {
  createDashboard();
}

// =================================================
// MENU
// =================================================
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('📅 UIT Calendar Sync')
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
function fixDuplicates() {
  // 1. Xóa toàn bộ lịch Google Calendar đang bị trùng lặp
  const calendars = CalendarApp.getCalendarsByName(CONFIG.CALENDAR_NAME);
  calendars.forEach(c => c.deleteCalendar());
  
  // 2. Xóa trắng bộ nhớ tạm trong Sheet để đồng bộ lại từ đầu
  const sheet = getOrCreateInternalDBSheet();
  sheet.getRange('A1').clearContent();
  
  Logger.log('Đã dọn dẹp xong lịch bị trùng! Hãy chạy lại hàm testSync() để tạo mới.');
}
