# 📅 Auto Sync Moodle Course to your Calendar

Tự động đồng bộ lịch bắt đầu và hạn nộp bài từ **Moodle UIT** ([courses.uit.edu.vn](https://courses.uit.edu.vn/)) hoặc **BẤT KỲ HỆ THỐNG MOODLE NÀO KHÁC** sang **Google Calendar**. Kèm theo bảng điều khiển (Dashboard) trên Google Sheets và tính năng tự động nhắc nhở qua Email.

[![Views](https://hits.sh/github.com/nguyenhungphongg/Auto-Sync-UIT-Course-to-your-calendar.svg?extra_count=150&label=Views&color=7928ca)](https://github.com/nguyenhungphongg/Auto-Sync-UIT-Course-to-your-calendar)

![Apps Script](https://img.shields.io/badge/Google%20Apps%20Script-4285F4?style=for-the-badge&logo=google&logoColor=white)
![Google Calendar](https://img.shields.io/badge/Google%20Calendar-4285F4?style=for-the-badge&logo=google-calendar&logoColor=white)
![Google Sheets](https://img.shields.io/badge/Google%20Sheets-34A853?style=for-the-badge&logo=google-sheets&logoColor=white)

Bạn đã từng:
- Quên deadline trên Moodle, nộp trễ không được và bị 0 điểm?
- Lười đăng nhập vào web của trường mỗi ngày chỉ để xem có deadline nào mới?

Dự án nhỏ này sẽ giúp bạn đồng bộ toàn bộ sự kiện từ Moodle về Google Calendar hoàn toàn tự động.

<!-- Hai ảnh minh họa được đặt cạnh nhau để README gọn hơn trên GitHub. -->
<table>
  <tr>
    <td align="center" width="50%">
      <img src="https://github.com/user-attachments/assets/2c7b59e6-9b3b-4002-b13e-469d7d43586f" alt="Tự động đồng bộ deadline vào Google Calendar" width="100%" />
      <sub>Tự động cập nhật deadline qua Google Calendar</sub>
    </td>
    <td align="center" width="50%">
      <img src="https://github.com/user-attachments/assets/669d7de4-97f9-4457-85a3-ae259fa06e7b" alt="Thông báo khi lịch Moodle thay đổi" width="100%" />
      <sub>Thông báo khi giảng viên thêm, sửa hoặc xóa lịch deadline</sub>
    </td>
  </tr>
</table>

---

## ✨ Tính năng nổi bật

- 🔄 **Đồng bộ ngầm tự động:** Cập nhật lịch mỗi 15 phút trên máy chủ Google (không cần treo máy).
- 🎯 **Phát hiện thông minh:** Tự động thêm lịch mới, đổi lịch khi giảng viên dời ngày và xóa lịch khi bị hủy.
- 🔔 **Nhắc nhở tự động:** Mặc định báo trước 4 mốc (ngay lúc bắt đầu, 30 phút, 3 tiếng, 1 ngày).
- 📊 **Dashboard quản lý trực quan:** Tự động tạo trang tính trên Google Sheets để theo dõi số lượng sự kiện và lịch sử đồng bộ.
- 🚀 **Chống dính spam:** Tích hợp cơ chế thông minh chống vượt hạn mức (Rate Limit) của Google khi có quá nhiều lịch.
- 💡 **Thông báo cập nhật (Mới):** Khi có tính năng mới hoặc vá lỗi, Dashboard sẽ tự động báo cho bạn biết để vào lấy code mới!

---

## 🚀 Hướng dẫn cài đặt (Chỉ mất 2 phút)

### Bước 1: Lấy URL lịch iCal từ Moodle

**Dành cho sinh viên UIT:**
1. Mở trang [Calendar Export UIT](https://courses.uit.edu.vn/calendar/export.php?).
2. Chọn **Tất cả sự kiện** và khoảng thời gian **Khoảng tùy chọn** (ví dụ 10/10/2026 - 15/10/2027).
3. Nhấn **Lấy địa chỉ mạng của lịch** và copy đường link đó.

<p align="center">
  <img src="https://github.com/user-attachments/assets/5630cfa2-e118-4683-8d12-a40fa1583572" alt="Hướng dẫn xuất lịch iCalendar từ Moodle UIT" width="650" />
</p>

**Dành cho sinh viên trường khác:**
1. Đăng nhập vào hệ thống Moodle / LMS của trường bạn.
   > **Mẹo:** Thông thường, các trường sử dụng Moodle sẽ có đường dẫn xuất lịch tương tự `https://[moodle-cua-ban]/calendar/export.php`.
   > Ví dụ: `https://lms.hcmut.edu.vn/calendar/export.php`.
2. Tìm đến mục **Lịch (Calendar)** → **Xuất lịch (Export calendar)**. Nếu hệ thống không cho xuất hoặc lấy link lịch, có thể trường bạn không hỗ trợ tính năng này và dự án sẽ không sử dụng được.
3. Thiết lập thông số tương tự như trên và lấy link.

<p align="center">
  <img src="https://github.com/user-attachments/assets/3950222d-1966-4157-9e47-db5f63745f6f" alt="Hướng dẫn xuất lịch từ hệ thống Moodle khác" width="700" />
</p>

> ⚠️ **Lưu ý an toàn:** Link này chứa mã xác thực cá nhân (`authtoken`). **Không chia sẻ link này công khai cho người khác.**

### Bước 2: Tạo dự án Apps Script

1. Mở [Google Sheets](https://sheets.new/) để tạo một bảng tính mới (nên tạo trong một thư mục dễ tìm).
2. Trên thanh công cụ, chọn **Tiện ích mở rộng (Extensions)** → **Apps Script**.
3. Xóa đoạn code mặc định có sẵn.
4. Tùy thuộc vào trường của bạn, copy toàn bộ code và dán vào:
   - 🔵 **Sinh viên UIT:** Copy code tại file [`UIT-Sync.gs`](https://github.com/nguyenhungphongg/Auto-Sync-UIT-Course-to-your-calendar/blob/main/UIT-Sync.gs).
   - 🟢 **Sinh viên trường khác:** Copy code tại file [`Global-Sync.gs`](https://github.com/nguyenhungphongg/Auto-Sync-UIT-Course-to-your-calendar/blob/main/Global-Sync.gs).

### Bước 3: Cấu hình mã nguồn

Tìm đoạn `CONFIG` ở ngay đầu code và điền thông tin của bạn vào:

```javascript
const CONFIG = {
  CURRENT_VERSION: 1.2, // Thêm dòng này để đánh dấu phiên bản hiện tại
  CALENDAR_NAME: 'UIT - Lịch course', // Tên lịch mà bạn muốn tạo
  LOG_SHEET_NAME: 'UIT Calendar Sync Log', // Tên Google Sheet log. Nếu script đã gắn sẵn trong một Sheet thì dùng luôn Sheet đó; chỉ tạo Sheet mới khi dùng Apps Script độc lập.
  NOTIFY_EMAIL: 'email_cua_ban@gm.uit.edu.vn', // Email nhận thông báo. Để trống '' thì dùng email của tài khoản Google đang chạy script.
  ERROR_REMINDER_COUNT: 10, // Tần suất nhắc lại email thông báo lỗi khi hệ thống gặp sự cố liên tục, nhằm chống spam hộp thư.
  MOODLE_URL: 'DÁN_LINK_MOODLE_ICAL_CỦA_BẠN_VÀO_ĐÂY', // Link xuất lịch Moodle (có chứa authtoken, KHÔNG đăng công khai).
  SYNC_INTERVAL: 15, // Chu kỳ đồng bộ (phút), chỉ nhận 1, 5, 10, 15 hoặc 30.
  // Chu kỳ đồng bộ càng ngắn thì mức sử dụng hạn mức trong ngày càng cao; có thể chạm hạn mức của Google.
  REMINDERS: [0, 30, 180, 1440], // Các mốc nhắc trước (phút): đúng thời điểm, 30 phút, 3 giờ và 1 ngày.
  // Nếu không muốn nhận thông báo, đặt REMINDERS: []
};
```
> ⚠️ Lưu ý: Sau khi chỉnh CONFIG xong, hãy bấm vào nút Save 💾 hoặc Ctrl + S để code được lưu lại thì mới hiện các hàm để chạy được

### Bước 4: Chạy cài đặt

1. Ở thanh công cụ phía trên cùng, chọn hàm **`setupAndSync`** (thay vì `myFunction`).
2. Bấm **▶️ Chạy (Run)**.
3. Cấp quyền truy cập cho script (chỉ hỏi ở lần đầu):
   - Chọn **Xem lại quyền** → **Tài khoản của bạn** → **Nâng cao (Advanced)** → **Đi tới...** → **Cho phép**.

<p align="center">
  <img src="https://github.com/user-attachments/assets/81bc50ca-92ca-4cf2-bf35-9f4f19e39c69" alt="Cấp quyền cho Google Apps Script" width="550" />
</p>

4. Đợi một lát, thông báo thành công sẽ hiện ở góc dưới màn hình Google Sheets của bạn.

**Vậy là xong! Hệ thống đã tự động lên lịch chạy ngầm mỗi 15 phút.**

> **Nếu khi chạy, hệ thống báo lỗi “Bạn đang tạo hoặc xóa quá nhiều lịch”, hãy chạy tiếp hàm `syncUITCalendar`. Nếu vẫn báo lỗi, Google có thể đang tạm chặn thao tác tạo lịch. Bạn có thể để script tự đồng bộ trong nền ở chu kỳ tiếp theo.**

---

## 🛠 Cập nhật phiên bản mới

Dự án thỉnh thoảng sẽ được nâng cấp để thêm tính năng hoặc sửa lỗi (ví dụ: sửa lỗi tràn dữ liệu...).

**Khi có bản cập nhật, dòng trạng thái trên tab `🏠 Dashboard` trong Google Sheets sẽ tự động chuyển sang nền vàng, chữ đỏ để báo hiệu. Nếu là bản cập nhật quan trọng (Urgent), hệ thống cũng sẽ gửi email thông báo.**

**Cách cập nhật:**
1. Vào repository GitHub này và copy toàn bộ mã mới nhất.
2. Mở Apps Script hiện tại, xóa mã cũ và dán mã mới vào.
3. Chỉnh lại biến `MOODLE_URL` thành link lịch của bạn.
4. Chạy hàm `testSync()`. Dòng cảnh báo đỏ sẽ tự biến mất!

---

## ⚖️ So sánh: Dùng Script vs Thêm URL trực tiếp vào Google Calendar

| Tiêu chí | 🔗 Thêm bằng URL trực tiếp (Google Calendar) | 🚀 Moodle Calendar Sync (Dự án này) |
| :--- | :--- | :--- |
| **Tần suất đồng bộ** | ⏱️ Chậm & Thất thường (**12 - 24 tiếng/lần**) | ⚡ **Tự động mỗi 15 phút** (gần như tức thời) |
| **Thông báo khi đổi lịch/hủy buổi** | ❌ **Không có** (Lẳng lặng cập nhật trên lịch) | 🔔 **Gửi Email ngay lập tức** (Báo rõ chi tiết môn, phòng, ngày bị hủy/đổi) |
| **Tự động đặt Lời nhắc (Reminders)** | ❌ Dùng mặc định, không tùy chỉnh được nhiều mốc | ⏰ **Tự động gắn chuỗi báo thức** (Lúc bắt đầu, trước 30p, 3h, 1 ngày) |
| **Quản lý & Nhật ký (Log)** | ❌ Không có | 📊 **Có Dashboard & Log chi tiết** trên Google Sheet |
| **Tránh đi nhầm phòng / bỏ buổi** | ⚠️ Hạn chế (Do cập nhật lịch quá chậm) | ✅ **Tối ưu tuyệt đối** (Luôn nắm bắt lịch học mới nhất) |
| **Cách cài đặt** | Copy & dán URL | 1-Click Setup (`setupAndSync`) chạy 1 lần duy nhất |

---

## 🆘 Khắc phục sự cố thường gặp

Nếu gặp lỗi, hãy chuyển sang tab Apps Script và tự chạy các hàm hỗ trợ sau:

| Hàm trong Script | Tác dụng |
| :--- | :--- |
| `fixDuplicates()` | Nếu lịch có sự kiện bị tạo trùng, chạy hàm này để quét và tự dọn dẹp các sự kiện thừa. |
| `testSync()` | Chạy đồng bộ thủ công ngay lập tức để kiểm tra xem lỗi đã hết chưa. |
| `updateDashboard()` | Vẽ lại giao diện Bảng điều khiển nếu lỡ tay làm hỏng định dạng. |

**Lỗi: “Bạn đang tạo hoặc xóa quá nhiều lịch...”**

Đây là cơ chế bảo vệ chống spam của Google. Nếu có quá nhiều deadline (hàng trăm sự kiện), Google có thể tạm chặn việc tạo lịch. Hệ thống được thiết kế để tự động chia nhỏ công việc, ghi nhớ tiến trình và chạy bù phần còn lại ở chu kỳ tiếp theo.

## 📝 Bản quyền và Đóng góp

Dự án được viết và tinh chỉnh dựa trên chuẩn xuất iCal nhằm tối ưu trải nghiệm cho sinh viên Trường Đại học Công nghệ Thông tin (UIT) và cộng đồng sinh viên nói chung. Mọi đóng góp (Pull Request / Issues) đều được chào đón!
