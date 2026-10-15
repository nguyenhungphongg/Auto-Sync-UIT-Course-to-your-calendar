# Auto-Sync-UIT-Course-to-your-calendar
Một dự án nhỏ dùng để tự động sync và set thông báo cho UIT Course của bạn

# 📅 UIT Moodle → Google Calendar Sync

Tự động đồng bộ lịch học, lịch thi và hạn nộp bài từ **Moodle UIT (Trường Đại học Công nghệ Thông tin - ĐHQG-HCM)** sang **Google Calendar**. Hệ thống đi kèm bảng điều khiển trực quan trên **Google Sheets** và dịch vụ tự động gửi email thông báo khi có sự thay đổi lịch học.

![Apps Script](https://img.shields.io/badge/Google%20Apps%20Script-4285F4?style=for-the-badge&logo=google&logoColor=white)
![Google Calendar](https://img.shields.io/badge/Google%20Calendar-4285F4?style=for-the-badge&logo=google-calendar&logoColor=white)
![Google Sheets](https://img.shields.io/badge/Google%20Sheets-34A853?style=for-the-badge&logo=google-sheets&logoColor=white)

---

## ✨ Tính năng nổi bật

- 🔄 **Đồng bộ tự động ngầm:** Tự động kiểm tra và cập nhật lịch học mỗi 15 phút mà không cần bật máy tính.
- 🎯 **Phát hiện thay đổi thông minh:** Tự động nhận biết khi có buổi học mới được **Thêm**, **Đổi lịch** hoặc bị **Hủy/Xoá**.
- 🔔 **Hệ thống nhắc nhở đa mốc:** Tự động cài đặt 4 mốc thông báo cho từng buổi học (bạn có thể tự setting lại phần này nếu không thích):
  - Ngay tại thời điểm bắt đầu
  - Trước 30 phút
  - Trước 3 tiếng
  - Trước 1 ngày
- 📧 **Thông báo qua Email:** Gửi mail ngay lập tức khi phát hiện lịch học bị thay đổi hoặc hệ thống gặp sự cố kết nối.
- 📊 **Dashboard & Lịch sử log:** Tự động tạo trang quản lý trên Google Sheets để theo dõi trạng thái hệ thống và xem nhật ký thay đổi.

---

## 🚀 Hướng dẫn cài đặt

### Bước 1: Lấy URL Lịch iCal từ Moodle UIT
#### Cách 1: Truy cập trực tiếp đường dẫn: 
Truy cập theo đường dẫn sau [Calendar Export](https://courses.uit.edu.vn/calendar/export.php?)
1. Chọn các thiết lập:
   - **Sự kiện để xuất:** Tất cả sự kiện
   - **Khoảng thời gian:** Chọn **Khoảng tùy chọn**, ví dụ: Khoảng tùy chọn (10/10/26 - 15/10/27)
2. Nhấn **Lấy địa chỉ mạng của lịch** và sao chép đường link vừa tạo.
#### Cách 2:
1. Đăng nhập vào trang [Moodle UIT](https://courses.uit.edu.vn/).
2. Trên phần lịch hiển thị bên phải, chọn **Quản lí theo dõi** xuất hiện ngay dưới lịch.
3. Nhấn vào nút **Xuất lịch (Export calendar)**.
4. Chọn các thiết lập:
   - **Sự kiện để xuất:** Tất cả sự kiện
   - **Khoảng thời gian:** Chọn **Khoảng tùy chọn**, ví dụ: Khoảng tùy chọn (10/10/26 - 15/10/27)
5. Nhấn **Lấy địa chỉ mạng của lịch** và sao chép đường link vừa tạo.

---

### Bước 2: Tạo dự án Google Apps Script

1. Truy cập [Google Sheets](https://sheets.google.com/) và tạo một trang tính mới.
2. Trên thanh công cụ, chọn **Tiện ích mở rộng (Extensions)** → **Apps Script**.
3. Xóa toàn bộ mã mặc định trong tệp `Mã.gs` (hoặc `Code.gs`).
4. Sao chép toàn bộ nội dung mã nguồn dự án này và dán vào.

---

### Bước 3: Cấu hình hệ thống

Tìm đoạn `CONFIG` ở đầu file mã nguồn và thiết lập thông số của bạn:

```javascript
const CONFIG = {
  CALENDAR_NAME: 'UIT - Lịch course', //Tên lịch mà bạn muốn tạo
  LOG_SHEET_NAME: 'UIT Calendar Sync Log', //Tên file sheet log của bạn
  NOTIFY_EMAIL: 'email_cua_ban@gm.uit.edu.vn', // Email nhận thông báo
  ERROR_REMINDER_COUNT: 10, //Tần suất nhắc lại email thông báo lỗi khi hệ thống gặp sự cố liên tục, nhằm mục đích chống spam hộp thư.
  MOODLE_URL: 'DÁN_LINK_MOODLE_ICAL_CỦA_BẠN_VÀO_ĐÂY', 
  SYNC_INTERVAL: 15, // Chu kỳ đồng bộ (phút)
  REMINDERS: [0, 30, 180, 1440] // Các mốc thông báo (phút)
};
```

---

### Bước 4: Khởi tạo và cấp quyền

1. Chọn hàm **`setup`** từ danh sách hàm trên thanh công cụ và bấm **Chạy (Run)**.
2. Cấp quyền truy cập cho Script (chỉ thực hiện lần đầu):
   - Chọn **Xem lại quyền (Review Permissions)**.
   - Chọn tài khoản Google của bạn.
   - Nhấn **Nâng cao (Advanced)** → Chọn **Đi tới... (Go to...)**.
   - Nhấn **Cho phép (Allow)**.
3. Đổi sang hàm **`testSync`** và bấm **Chạy** để tiến hành đồng bộ lần đầu tiên.

---

### Bước 5: Kích hoạt đồng bộ tự động

1. Chọn hàm **`createTrigger`** và bấm **Chạy**. Kịch bản sẽ bắt đầu tự động chạy ngầm mỗi 15 phút.
2. *(Tùy chọn)* Chọn hàm **`createSpreadsheetOpenTrigger`** và bấm **Chạy** để tạo Menu điều khiển nhanh ngay trên giao diện Google Sheets.

---

## 🛠️ Công cụ hỗ trợ & Xử lý lỗi

Nếu gặp sự cố trong quá trình vận hành, bạn có thể chạy các hàm sau trong Apps Script:

| Hàm thực thi | Tác dụng |
| :--- | :--- |
| `testSync()` | Chạy đồng bộ ngay lập tức. |
| `updateDashboard()` | Cập nhật lại giao diện Dashboard trên Google Sheets. |
| `fixDuplicates()` | Xóa toàn bộ lịch bị trùng lặp và làm sạch cơ sở dữ liệu để đồng bộ lại từ đầu. |
| `updateRemindersForExistingEvents()` | Bổ sung các mốc thông báo mới cho toàn bộ sự kiện hiện có trên Google Calendar. |
| `systemStatus()` | In nhật ký kiểm tra trạng thái hoạt động của kịch bản. |

---

## ⚠️ Lưu ý an toàn

- **Không chia sẻ công khai** đường link `MOODLE_URL` chứa `authtoken` cá nhân của bạn lên GitHub hoặc nơi công cộng để tránh lộ lịch học và thông tin cá nhân.
- Khi tải mã nguồn lên GitHub, hãy thay `MOODLE_URL` và `NOTIFY_EMAIL` bằng giá trị mặc định/hướng dẫn.

---
## ⚠️ Lưu ý khác
- Sheet "⚙️ Settings" chỉ có chức năng hiển thị, không thể điều chỉnh ở đây. Để điều chỉnh thông số bạn vui lòng chỉnh lại tại AppScript trong biến const CONFIG ở đầu đoạn code.
## 📝 Giấy phép (License)

Dự án được chia sẻ cho mục đích học tập và sử dụng cá nhân tại UIT - Trường đại học Công Nghệ Thông Tin.
