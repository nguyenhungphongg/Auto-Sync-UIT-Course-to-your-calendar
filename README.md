# Auto-Sync-UIT-Course-to-your-calendar
- Bạn đã từng bị miss lịch nộp bài trên course rồi bị nộp trễ, không nộp được do quá hạn nên bị 0đ? 
- Bạn không nhớ lịch hay lười lên check lịch trên web của trường mỗi ngày? 
Đây là một dự án nhỏ dùng để tự động sync và set thông báo cho UIT Course của bạn. (tại lúc nộp bài bắt đầu, 30 phút, 3 tiếng, 1 ngày trước)
Khi có một lịch mới được giảng viên up lên hệ thống, bạn sẽ được thông báo qua Gmail và sẽ tự động đồng bộ vào lịch của bạn.
<img width="1628" height="930" alt="Tự động đồng bộ deadline trên MOODLE (COURSEcourses uit edu vn) vào lịch Google của bạn" src="https://github.com/user-attachments/assets/96de3420-fd6f-408f-abe2-495363f4d883" />

# 📅 UIT Moodle → Google Calendar Sync

Tự động đồng bộ thời gian bắt đầu, hạn nộp bài từ **Moodle UIT (Trường Đại học Công nghệ Thông tin - ĐHQG-HCM)** sang **Google Calendar**. Hệ thống đi kèm bảng điều khiển trực quan trên **Google Sheets** và dịch vụ tự động gửi email thông báo khi có sự thay đổi lịch nộp bài trên COURSE.

![Apps Script](https://img.shields.io/badge/Google%20Apps%20Script-4285F4?style=for-the-badge&logo=google&logoColor=white)
![Google Calendar](https://img.shields.io/badge/Google%20Calendar-4285F4?style=for-the-badge&logo=google-calendar&logoColor=white)
![Google Sheets](https://img.shields.io/badge/Google%20Sheets-34A853?style=for-the-badge&logo=google-sheets&logoColor=white)

---

## ✨ Tính năng nổi bật

- 🔄 **Đồng bộ tự động ngầm:** Tự động kiểm tra và cập nhật lịch nộp bài mỗi 15 phút mà không cần bật máy tính.
- 🎯 **Phát hiện thay đổi thông minh:** Tự động nhận biết khi có buổi nộp bài mới được **Thêm**, **Đổi lịch** hoặc bị **Hủy/Xoá**.
- 🔔 **Hệ thống nhắc nhở đa mốc:** Tự động cài đặt 4 mốc thông báo cho từng lịch nộp bài (bạn có thể tự setting lại phần này nếu không thích):
  - Ngay tại thời điểm bắt đầu
  - Trước 30 phút
  - Trước 3 tiếng
  - Trước 1 ngày
  <img width="498" height="302" alt="Screenshot 2026-10-15 231245" src="https://github.com/user-attachments/assets/87605f4e-e975-4bb5-8658-6183517ea289" />

- 📧 **Thông báo qua Email:** Gửi mail ngay lập tức khi phát hiện lịch nộp bài bị thay đổi hoặc hệ thống gặp sự cố kết nối.
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
<img width="966" height="802" alt="paint_blurred_gaussian (1)" src="https://github.com/user-attachments/assets/7fb16ba0-4ff9-48a3-9e1d-64fb67b96312" />


---

### Bước 2: Tạo dự án Google Apps Script (cần thực hiện bằng máy tính)

1. Truy cập [Google Sheets](https://sheets.google.com/) và tạo một trang tính mới.
2. Trên thanh công cụ, chọn **Tiện ích mở rộng (Extensions)** → **Apps Script**.
3. Xóa toàn bộ mã mặc định trong tệp `Mã.gs` (hoặc `Code.gs`).
4. Sao chép toàn bộ nội dung [mã nguồn dự án](https://github.com/nguyenhungphongg/Auto-Sync-UIT-Course-to-your-calendar/blob/main/Auto-Sync-UIT-Course-to-your-calendar.gs) này và dán vào. (Truy cập link và nhấn vào biểu tượng Copy)
<img width="1617" height="492" alt="Screenshot 2026-10-15 230634" src="https://github.com/user-attachments/assets/122555a5-f4b1-4c6d-a710-2f9f80649259" />



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
  SYNC_INTERVAL: 15, // Chu kỳ đồng bộ (phút), khoảng tối ưu để tự động chạy code và kéo lịch về. Chu kỳ đồng bộ càng ít thì quota (hạn mức) trong ngày của bạn càng cao và có thể hết hạn mức (code dừng hoạt động tạm thời) do chính sách của Google.
  REMINDERS: [0, 30, 180, 1440] // Các mốc thông báo trước đó (phút). Mặc định tương đương ngay tại thời điểm bắt đầu, 30 phút trước, 3 giờ trước, 1 ngày trước.
  //Nếu không muốn thông báo, vui lòng xoá nội dung trong REMINDERS, ví dụ: REMINDERS: []
};
```

---

### Bước 4: Khởi tạo và cấp quyền

1. Chọn hàm **`setup`** từ danh sách hàm trên thanh công cụ và bấm **Chạy (Run)**.
<img width="482" height="75" alt="Screenshot 2026-10-15 230837" src="https://github.com/user-attachments/assets/9c12f697-57bd-4648-b9db-efbec352598d" />

2. Cấp quyền truy cập cho Script (chỉ thực hiện lần đầu):
   - Chọn **Xem lại quyền (Review Permissions)**.
   - Chọn tài khoản Google của bạn.
   - Nhấn **Nâng cao (Advanced)** → Chọn **Đi tới... (Go to...)**.
   - Nhấn **Cho phép (Allow)**.
3. Đổi sang hàm **`testSync`** và bấm **Chạy** để tiến hành đồng bộ lần đầu tiên.
<img width="465" height="65" alt="Screenshot 2026-10-15 231414" src="https://github.com/user-attachments/assets/f643f3a2-5cfb-4c63-8a98-51a9dbca58d2" />

---

### Bước 5: Kích hoạt đồng bộ tự động

1. Chọn hàm **`createTrigger`** và bấm **Chạy**. Kịch bản sẽ bắt đầu tự động chạy ngầm mỗi 15 phút.
<img width="500" height="67" alt="Screenshot 2026-10-15 231806" src="https://github.com/user-attachments/assets/7a5cb178-dd4c-4e1e-aa63-e91d7564b86a" />

2. *(Tùy chọn)* Chọn hàm **`createSpreadsheetOpenTrigger`** và bấm **Chạy** để tạo Menu điều khiển nhanh ngay trên giao diện Google Sheets.
<img width="711" height="292" alt="Screenshot 2026-10-15 231556" src="https://github.com/user-attachments/assets/72428c5c-2aa3-44ca-9d8d-b3852bb113e6" />
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
