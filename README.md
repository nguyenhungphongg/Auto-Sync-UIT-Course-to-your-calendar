# 📅 Auto Sync UIT Course to your Calendar

[![Views](https://hits.sh/github.com/nguyenhungphongg/Auto-Sync-UIT-Course-to-your-calendar.svg?extra_count=85&label=Views&color=7928ca)](https://github.com/nguyenhungphongg/Auto-Sync-UIT-Course-to-your-calendar)

Tự động đồng bộ lịch bắt đầu và hạn nộp bài từ **Moodle UIT** ([courses.uit.edu.vn](https://courses.uit.edu.vn/), Trường Đại học Công nghệ Thông tin - ĐHQG-HCM) sang **Google Calendar**, kèm bảng điều khiển trên **Google Sheets** và email thông báo khi lịch thay đổi.

![Apps Script](https://img.shields.io/badge/Google%20Apps%20Script-4285F4?style=for-the-badge&logo=google&logoColor=white)
![Google Calendar](https://img.shields.io/badge/Google%20Calendar-4285F4?style=for-the-badge&logo=google-calendar&logoColor=white)
![Google Sheets](https://img.shields.io/badge/Google%20Sheets-34A853?style=for-the-badge&logo=google-sheets&logoColor=white)

Bạn đã từng:

- Quên deadline trên Moodle, nộp trễ không được và bị 0 điểm?
- Lười đăng nhập vào web của trường mỗi ngày chỉ để xem có deadline nào mới?

Dự án nhỏ này sẽ tự động đồng bộ lịch Moodle về Google Calendar và đặt thông báo nhắc cho bạn. Khi giảng viên đăng lịch mới, bạn sẽ nhận email và lịch được cập nhật tự động.

<img width="1628" height="930" alt="Tự động đồng bộ deadline trên Moodle UIT vào Google Calendar" src="https://github.com/user-attachments/assets/96de3420-fd6f-408f-abe2-495363f4d883" />

---

## ✨ Tính năng nổi bật

- 🔄 **Đồng bộ tự động:** kiểm tra và cập nhật lịch mỗi 15 phút, chạy trên máy chủ của Google nên không cần bật máy tính.
- 🎯 **Phát hiện thay đổi:** nhận biết khi có lịch mới được **thêm**, **đổi lịch** hoặc bị **hủy/xóa**.
- 🔔 **Nhắc nhở nhiều mốc:** mặc định 4 mốc cho mỗi lịch (có thể tự chỉnh):
  - Ngay thời điểm bắt đầu
  - Trước 30 phút
  - Trước 3 tiếng
  - Trước 1 ngày

  <img width="498" height="302" alt="Các mốc nhắc nhở trên Google Calendar" src="https://github.com/user-attachments/assets/87605f4e-e975-4bb5-8658-6183517ea289" />

- 📧 **Thông báo qua email:** gửi mail khi lịch thay đổi hoặc hệ thống gặp sự cố kết nối.
- 📊 **Dashboard và nhật ký:** tự tạo trang quản lý trên Google Sheets để theo dõi trạng thái và xem lịch sử thay đổi.

---

## 🚀 Hướng dẫn cài đặt

### Bước 1: Lấy URL lịch iCal từ Moodle UIT

**Cách 1: Truy cập trực tiếp**

Mở trang [Calendar Export](https://courses.uit.edu.vn/calendar/export.php?), rồi:

1. Chọn các thiết lập:
   - **Sự kiện để xuất:** Tất cả sự kiện
   - **Khoảng thời gian:** chọn **Khoảng tùy chọn**, ví dụ 10/10/26 - 15/10/27 (nên chọn đủ dài để bao phủ cả học kỳ).
2. Nhấn **Lấy địa chỉ mạng của lịch** và sao chép đường link vừa tạo.

**Cách 2: Từ giao diện Moodle**

1. Đăng nhập vào [Moodle UIT](https://courses.uit.edu.vn/).
2. Ở phần lịch bên phải, chọn **Quản lí theo dõi** hiển thị ngay dưới lịch.
3. Nhấn nút **Xuất lịch biểu**.
4. Chọn các thiết lập như ở Cách 1.
5. Nhấn **Lấy địa chỉ mạng của lịch** và sao chép đường link.

<img width="966" height="802" alt="Lấy địa chỉ mạng của lịch trên Moodle UIT" src="https://github.com/user-attachments/assets/7fb16ba0-4ff9-48a3-9e1d-64fb67b96312" />

> ⚠️ Link này chứa mã xác thực cá nhân của bạn. Xem phần [Lưu ý an toàn](#️-lưu-ý-an-toàn) bên dưới.

---

### Bước 2: Tạo dự án Google Apps Script (làm trên máy tính)

1. Truy cập [Google Sheets](https://sheets.google.com/) và tạo một trang tính mới.
2. Trên thanh công cụ, chọn **Tiện ích mở rộng (Extensions)** → **Apps Script**.
3. Xóa toàn bộ mã mặc định trong tệp `Mã.gs` (hoặc `Code.gs`).
4. Mở [mã nguồn dự án](https://github.com/nguyenhungphongg/Auto-Sync-UIT-Course-to-your-calendar/blob/main/Auto-Sync-UIT-Course-to-your-calendar.gs), nhấn biểu tượng Copy rồi dán vào Apps Script.

<img width="1617" height="492" alt="Sao chép mã nguồn từ GitHub" src="https://github.com/user-attachments/assets/122555a5-f4b1-4c6d-a710-2f9f80649259" />

---

### Bước 3: Cấu hình

Tìm đoạn `CONFIG` ở đầu file và thay bằng thông số của bạn:

```javascript
const CONFIG = {
  CALENDAR_NAME: 'UIT - Lịch course',           // Tên lịch sẽ được tạo
  LOG_SHEET_NAME: 'UIT Calendar Sync Log',      // Tên file Sheet lưu log nếu bạn tạo trực tiếp bằng Appscript thay vì tạo Sheet rồi mới dùng Appscript
  NOTIFY_EMAIL: 'email_cua_ban@gm.uit.edu.vn',  // Email nhận thông báo
  ERROR_REMINDER_COUNT: 10,                     // Sau bao nhiêu lần lỗi liên tiếp thì gửi lại email báo lỗi (chống spam hộp thư)
  MOODLE_URL: 'DÁN_LINK_MOODLE_ICAL_CỦA_BẠN_VÀO_ĐÂY',
  SYNC_INTERVAL: 15,                            // Chu kỳ đồng bộ (phút)
  REMINDERS: [0, 30, 180, 1440]                 // Các mốc nhắc trước giờ bắt đầu (phút): ngay lúc bắt đầu, 30 phút, 3 giờ, 1 ngày
  // Muốn tắt nhắc nhở thì để trống: REMINDERS: []
};
```

> 💡 Chu kỳ đồng bộ càng ngắn thì càng tốn hạn mức (quota) trong ngày của Google. Nếu vượt hạn mức, script sẽ tạm dừng cho đến khi hạn mức được làm mới.

---

### Bước 4: Khởi tạo và cấp quyền

1. Chọn hàm **`setup`** trong danh sách hàm trên thanh công cụ và bấm **Chạy (Run)**.

   <img width="482" height="75" alt="Chạy hàm setup" src="https://github.com/user-attachments/assets/9c12f697-57bd-4648-b9db-efbec352598d" />

2. Cấp quyền cho script (chỉ lần đầu):
   - Chọn **Xem lại quyền (Review Permissions)**.
   - Chọn tài khoản Google của bạn.
   - Nhấn **Nâng cao (Advanced)** → **Đi tới... (Go to...)**.
   - Nhấn **Cho phép (Allow)**.

   > Google hiển thị cảnh báo này vì script chưa qua xác minh của Google. Mã nguồn hoàn toàn công khai, bạn có thể đọc trước khi chạy.

3. Chọn hàm **`testSync`** và bấm **Chạy** để đồng bộ lần đầu.

   <img width="465" height="65" alt="Chạy hàm testSync" src="https://github.com/user-attachments/assets/f643f3a2-5cfb-4c63-8a98-51a9dbca58d2" />

---

### Bước 5: Bật đồng bộ tự động

1. Chọn hàm **`createTrigger`** và bấm **Chạy**. Từ đây script sẽ tự chạy ngầm theo chu kỳ đã đặt (mặc định 15 phút).

   <img width="500" height="67" alt="Chạy hàm createTrigger" src="https://github.com/user-attachments/assets/7a5cb178-dd4c-4e1e-aa63-e91d7564b86a" />

2. *(Tùy chọn)* Chọn hàm **`createSpreadsheetOpenTrigger`** và bấm **Chạy** để thêm menu điều khiển nhanh ngay trên giao diện Google Sheets.

   <img width="711" height="292" alt="Menu điều khiển trên Google Sheets" src="https://github.com/user-attachments/assets/72428c5c-2aa3-44ca-9d8d-b3852bb113e6" />

---

## 🛠️ Công cụ hỗ trợ và xử lý lỗi

Nếu gặp sự cố, bạn có thể chạy các hàm sau trong Apps Script:

| Hàm | Tác dụng |
| :--- | :--- |
| `testSync()` | Chạy đồng bộ ngay lập tức. |
| `updateDashboard()` | Cập nhật lại Dashboard trên Google Sheets. |
| `fixDuplicates()` | Xóa các lịch bị trùng lặp và làm sạch dữ liệu để đồng bộ lại từ đầu. |
| `updateRemindersForExistingEvents()` | Áp dụng các mốc nhắc mới cho toàn bộ sự kiện đang có trên Google Calendar. |
| `systemStatus()` | In nhật ký kiểm tra trạng thái hoạt động của script. |

---

## 🗑️ Gỡ cài đặt

1. Trong Apps Script, mở mục **Trình kích hoạt (Triggers)** ở thanh bên trái và xóa các trigger của dự án.
2. Xóa lịch đã tạo trong Google Calendar (và Google Sheet log nếu không cần nữa).

---

## ⚠️ Lưu ý an toàn

- **Không chia sẻ công khai** đường link `MOODLE_URL`. Link chứa `authtoken` cá nhân, ai có link đều có thể xem lịch học của bạn.
- Khi đưa mã nguồn lên GitHub (ví dụ fork repo), hãy để `MOODLE_URL` và `NOTIFY_EMAIL` ở giá trị mặc định, không commit giá trị thật.
- Script cần quyền truy cập Google Calendar, Google Sheets và Gmail (để gửi thông báo). Bạn nên đọc qua mã nguồn trước khi chạy.

## 📌 Lưu ý khác

- Sheet **"⚙️ Settings"** chỉ để hiển thị. Muốn đổi thông số, hãy chỉnh trong biến `CONFIG` ở đầu code Apps Script.
- Google Apps Script có giới hạn số lần chạy và số email mỗi ngày. Nếu bạn gặp tình trạng script dừng, hãy thử tăng `SYNC_INTERVAL`.
- Đây là dự án cá nhân, không liên kết chính thức với nhà trường.

## 📝 Giấy phép

Dự án được chia sẻ cho mục đích học tập và sử dụng cá nhân tại UIT - Trường Đại học Công nghệ Thông tin.
