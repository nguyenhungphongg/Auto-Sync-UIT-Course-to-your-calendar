<h1 align="center">📅 Moodle → Google Calendar Sync</h1>

<p align="center">
  Tự động đồng bộ lịch học và deadline từ <b>Moodle</b> sang <b>Google Calendar</b>,<br/>
  báo email ngay khi giảng viên thêm, sửa hoặc xóa lịch.
</p>

<p align="center">
  <img alt="ViewCount" src="https://hits.sh/github.com/nguyenhungphongg/Auto-Sync-UIT-Course-to-your-calendar.svg?extra_count=150&label=Views&color=7928ca" />
  <img alt="Version" src="https://img.shields.io/badge/version-1.3-blue" />
  <img alt="Platform" src="https://img.shields.io/badge/platform-Google%20Apps%20Script-4285F4?logo=google&logoColor=white" />
  <img alt="Sync" src="https://img.shields.io/badge/Sync-m%E1%BB%97i%2015%20ph%C3%BAt-success" />
  <img alt="Cost" src="https://img.shields.io/badge/Chi%20ph%C3%AD-mi%E1%BB%85n%20ph%C3%AD-brightgreen" />
</p>

---

<a id="muc-luc"></a>

## 📖 Mục lục



<div align="center">

<table>
  <tr>
    <td valign="top" width="33%">
      <a href="#gioi-thieu">🎯 Giới thiệu</a><br/>
      <a href="#anh-minh-hoa">🖼️ Ảnh minh họa</a><br/>
      <a href="#tinh-nang">✨ Tính năng</a><br/>
      <a href="#cach-hoat-dong">⚙️ Cách hoạt động</a><br/>
      <a href="#cai-dat">🚀 Cài đặt</a><br/>
      <a href="#su-dung">🕹️ Sử dụng</a>
    </td>
    <td valign="top" width="33%">
      <a href="#cau-hinh">🔧 Cấu hình</a><br/>
      <a href="#cac-tab">🗂️ Các tab trong Google Sheet</a><br/>
      <a href="#thong-bao-email">📧 Thông báo email</a><br/>
      <a href="#cap-nhat">🆕 Cập nhật phiên bản</a><br/>
      <a href="#gioi-han">⚠️ Giới hạn và lưu ý</a><br/>
      <a href="#xu-ly-su-co">🩺 Xử lý sự cố</a>
    </td>
    <td valign="top" width="33%">
      <a href="#go-cai-dat">🗑️ Gỡ cài đặt</a><br/>
      <a href="#bao-mat">🔒 Quyền riêng tư và bảo mật</a><br/>
      <a href="#cau-truc-repo">📁 Cấu trúc repo</a><br/>
      <a href="#bao-tri">🛠️ Dành cho người bảo trì</a><br/>
      <a href="#dong-gop">🤝 Đóng góp</a><br/>
      <a href="#giay-phep">📄 Giấy phép</a>
    </td>
  </tr>
</table>

</div>



---

<a id="gioi-thieu"></a>

## 🎯 Giới thiệu

Bạn đã từng gặp mấy tình huống "dở khóc dở cười" này chưa?

❌ Quên deadline nộp bài trên Moodle, nộp trễ và bị 0 điểm.

❌ Lười đăng nhập Moodle (Courses, Elearning) mỗi ngày chỉ để xem tuần này có deadline gì.

Moodle cho phép xuất lịch ra file `.ics`, nhưng file đó chỉ là bản chụp tại thời điểm xuất. Khi giảng viên đổi giờ nộp bài hay thêm deadline mới, lịch trên điện thoại của bạn **không tự cập nhật**.

Nếu bạn dùng chức năng lấy lịch mặc định của Google, nó sẽ không được cập nhật thường xuyên hơn (thường thì từ 12-24h mới cập nhật 1 lần).

Công cụ này giải quyết việc đó bằng một script Google Apps Script chạy ngầm trong tài khoản Google của bạn:

- Cứ **15 phút** script lấy lịch Moodle một lần.
- So sánh với lần trước, chỉ **thêm, sửa, xóa** những sự kiện thực sự thay đổi.
- **Gửi email** cho bạn biết chính xác môn nào, ngày nào, thay đổi gì.

Script được viết cho **trường UIT** nhưng dùng được với **bất kỳ trường nào dùng Moodle**, vì chỉ cần link xuất lịch.

> Không cần server, không cần cài phần mềm, không tốn phí. Mọi thứ chạy trên hạ tầng của Google.

---

<a id="anh-minh-hoa"></a>

## 🖼 Ảnh minh họa

<table align="center">
  <tr>
    <td align="center" valign="top">
      <img src="https://github.com/user-attachments/assets/50787734-480f-4dfd-a891-dbb5d7500510" alt="Tự động đồng bộ deadline vào Google Calendar" width="400">
      <br>
      (Tự động đồng bộ deadline vào Google Calendar của bạn)
    </td>
    <td align="center" valign="top">
      <img src="https://github.com/user-attachments/assets/528a0113-64f3-4993-9226-44311b6a88d2" alt="Gửi thông báo ngay mỗi 15p khi có sự thay đổi của giảng viên hoặc lỗi hệ thống" width="200">
      <br>
      (Gửi thông báo ngay mỗi 15p khi có sự thay đổi của giảng viên hoặc lỗi hệ thống)
    </td>
  </tr>
</table>

---

<a id="tinh-nang"></a>

## ✨ Tính năng

| Tính năng | Mô tả |
|---|---|
| 🔄 **Đồng bộ tự động** | Chạy ngầm mỗi 15 phút, không cần mở máy hay mở trình duyệt. |
| ➕➖✏️ **Đồng bộ hai chiều thay đổi** | Tự thêm sự kiện mới, cập nhật khi đổi tên/giờ/phòng/mô tả, xóa khi Moodle không còn sự kiện đó. |
| 📧 **Email thông báo** | Báo ngay khi có thay đổi, kèm môn học, thời gian và nội dung đổi. |
| ⏰ **Nhắc nhở tùy chỉnh** | Mặc định nhắc lúc bắt đầu, trước 30 phút, 3 giờ và 1 ngày. |
| 📊 **Dashboard** | Xem trạng thái, lần đồng bộ cuối, lỗi và các thay đổi gần đây ngay trên Google Sheet. |
| 📜 **Lịch sử thay đổi** | Mọi thao tác thêm/sửa/xóa đều được ghi lại trong tab History. |
| 🛡 **Chống giới hạn API** | Tự chia nhỏ công việc, tự thử lại khi Google báo "quá nhiều yêu cầu". |
| 🚨 **Báo lỗi và báo phục hồi** | Email khi đồng bộ lỗi, và email khi hệ thống chạy lại bình thường. |
| 🧹 **Dọn lịch trùng** | Công cụ quét và xóa sự kiện bị nhân bản. |
| 🆕 **Báo bản cập nhật** | Dashboard hiện thông báo khi có phiên bản mới trên GitHub. |

---

<a id="cach-hoat-dong"></a>


## ⚙️ Cách hoạt động
<p align="center">
  <img src="https://github.com/user-attachments/assets/53ead531-150e-4d99-98fc-b8f700aa32ab" alt="Sơ đồ đồng bộ Moodle–Google Calendar" width="900">
</p>

Mỗi sự kiện được nhận diện bằng `UID` mà Moodle cấp. Script lưu "chữ ký" (tiêu đề, giờ bắt đầu, giờ kết thúc, địa điểm, mô tả) của từng sự kiện trong một tab ẩn của Google Sheet. Mỗi lần chạy, nếu chữ ký khác thì sự kiện đó được cập nhật.

---

<a id="cai-dat"></a>

## 🚀 Cài đặt (~5 phút)

### Bước 1: Lấy link xuất lịch từ Moodle

1. Đăng nhập Moodle của trường (với UIT là <a href="https://courses.uit.edu.vn">`courses.uit.edu.vn`</a>).
2. Vào **Lịch** (Calendar) → **Nhập hoặc xuất lịch** (Import or export calendars) → **Xuất lịch** (Export calendar).
3. Chọn **Sự kiện cần xuất** là *Tất cả sự kiện* (hoặc loại bạn muốn) và chọn **khoảng thời gian** đủ rộng, xem [lưu ý](#gioi-han).
4. Bấm **Lấy URL lịch** (Get calendar URL) rồi sao chép link.

Link có dạng:

```
https://courses.uit.edu.vn/calendar/export_execute.php?userid=...&authtoken=...&preset_what=all&preset_time=...
```

> ⚠️ **Link này chứa `authtoken` của riêng bạn, giống như mật khẩu xem lịch. Không đăng lên mạng, không commit lên GitHub, không gửi cho người khác.**

### Bước 2: Tạo Google Sheet mới

1. Vào [sheets.new](https://sheets.new) để tạo một Google Sheet **trống**.
2. Dùng một file mới hoàn toàn, vì script sẽ tự đổi tên file thành `Moodle Calendar Sync Log` và xóa tab trống mặc định (`Sheet1` / `Trang tính 1`).

### Bước 3: Dán code vào Apps Script

1. Trong Google Sheet, chọn **Tiện ích mở rộng** (Extensions) → **Apps Script**.
2. Xóa toàn bộ code mẫu trong file `Code.gs` (`'Mã.gs`)
3. Mở file [`Auto-Sync.gs`](./Auto-Sync.gs) trong repo này, sao chép toàn bộ và dán vào.
4. Sửa phần `USER_CONFIG` ở đầu file:

   ```javascript
   const USER_CONFIG = {
     UNIVERSITY_NAME: 'UIT',                      // Tên trường của bạn
     MOODLE_URL: 'DÁN_LINK_MOODLE_CỦA_BẠN_VÀO_ĐÂY', // Link ở Bước 1
     NOTIFY_EMAIL: '',                            // Để trống = dùng email tài khoản hiện tại
     REMINDERS: [0, 30, 180, 1440]                // Nhắc trước (phút)
   };
   ```

5. Bấm **Lưu dự án** (biểu tượng đĩa mềm hoặc `Ctrl + S`).

> 💡 Bạn cũng có thể để trống `MOODLE_URL`, chạy cài đặt một lần để script tạo tab **⚙️ Settings**, rồi dán link vào đó và chạy lại. Cách này giúp link không nằm trong code.

### Bước 4: Chạy cài đặt lần đầu

1. Quay lại Google Sheet và **tải lại trang** (F5). Menu **📅 Moodle Calendar Sync** sẽ xuất hiện trên thanh menu.
2. Chọn **📅 Moodle Calendar Sync → 🚀 Cài đặt & đồng bộ lần đầu**.
3. Google sẽ yêu cầu cấp quyền, xem bước tiếp theo.

### Bước 5: Cấp quyền cho script

Vì đây là script cá nhân chưa qua kiểm duyệt của Google, bạn sẽ thấy cảnh báo. Đây là bình thường:

1. Bấm **Xem lại quyền** (Review permissions) và chọn tài khoản Google của bạn.
2. Khi hiện *"Google hasn't verified this app"*, bấm **Nâng cao** (Advanced).
3. Bấm **Đi tới … (không an toàn)** (Go to … (unsafe)).
4. Bấm **Cho phép** (Allow).

Các quyền script cần và lý do:

| Quyền | Dùng để |
|---|---|
| Google Calendar | Tạo lịch riêng và thêm/sửa/xóa sự kiện trong đó |
| Google Sheets | Lưu Dashboard, Settings, History, dữ liệu so sánh |
| Google Drive | Tìm lại file Sheet nhật ký nếu cần |
| Kết nối dịch vụ bên ngoài | Tải lịch từ Moodle và kiểm tra `version.json` trên GitHub |
| Gửi email | Gửi thông báo thay đổi và báo lỗi cho chính bạn |
| Trigger | Tạo bộ hẹn giờ chạy mỗi 15 phút |

Sau khi cấp quyền, nếu script không tự chạy tiếp thì chọn lại **🚀 Cài đặt & đồng bộ lần đầu** một lần nữa.

### Bước 6: Kiểm tra kết quả

- Mở [Google Calendar](https://calendar.google.com). Bên trái, mục **Lịch của tôi** sẽ có lịch tên **Lịch học UIT** (hoặc tên trường bạn đặt).
- Mở tab **🏠 Dashboard** trong Sheet để xem trạng thái `🟢 ĐANG HOẠT ĐỘNG`.

Xong! Từ giờ script tự chạy mỗi 15 phút, bạn không cần làm gì thêm.

> 📱 Để xem lịch trên điện thoại, mở ứng dụng Google Calendar và đảm bảo lịch **Lịch học UIT** đang được bật hiển thị.

---

<a id="su-dung"></a>

## 🕹 Sử dụng

Tất cả thao tác nằm ở menu **📅 Moodle Calendar Sync** trong Google Sheet:

| Mục menu | Công dụng | Khi nào dùng |
|---|---|---|
| 🚀 **Cài đặt & đồng bộ lần đầu** | Tạo các tab, tạo lịch, đồng bộ lần đầu và bật trigger 15 phút | **Chỉ 1 lần** khi mới bắt đầu. Nếu đã cài, script sẽ báo và không làm lại. |
| 🔄 **Đồng bộ ngay** | Kéo lịch từ Moodle về ngay lập tức | Khi vừa thấy thầy cô báo đổi lịch và không muốn chờ 15 phút |
| 📊 **Cập nhật Dashboard** | Làm mới Dashboard, Settings và danh sách sự kiện | Sau khi sửa tab Settings hoặc muốn xem số liệu mới nhất |
| 🧹 **Dọn dẹp lịch trùng (Thủ công)** | Quét và xóa các bản sao (cùng tên, cùng giờ bắt đầu) mà hệ thống không theo dõi | Khi thấy một buổi học xuất hiện hai lần |
| ⚙️ **Tạo trigger đồng bộ** | Xóa trigger cũ và tạo lại bộ hẹn giờ 15 phút | Khi trigger bị mất hoặc ngừng chạy |

---

<a id="cau-hinh"></a>

## 🔧 Cấu hình

### Cấu hình trong code (`USER_CONFIG`)

| Tham số | Ý nghĩa | Ví dụ |
|---|---|---|
| `UNIVERSITY_NAME` | Tên trường, dùng đặt tên lịch và tiêu đề email | `'UIT'` |
| `MOODLE_URL` | Link xuất lịch Moodle (bắt buộc) | `'https://courses.uit.edu.vn/calendar/export_execute.php?...'` |
| `NOTIFY_EMAIL` | Email nhận thông báo. Để trống sẽ dùng email tài khoản đang chạy script | `'ban@gmail.com'` |
| `REMINDERS` | Các mốc nhắc trước giờ bắt đầu, tính bằng phút | `[0, 30, 180, 1440]` |

Ý nghĩa mặc định của `REMINDERS`: `0` = đúng giờ bắt đầu, `30` = trước 30 phút, `180` = trước 3 giờ, `1440` = trước 1 ngày. Google Calendar cho phép tối đa 5 nhắc nhở mỗi sự kiện.

### Cấu hình trong tab ⚙️ Settings

Sau khi chạy cài đặt, bạn có thể đổi cấu hình ngay trên Sheet, ở cột B:

| Ô | Nội dung |
|---|---|
| `B3` | Tên trường (ngắn gọn) |
| `B4` | Tên lịch trên Google |
| `B5` | Link Moodle |
| `B6` | Email nhận thông báo |

Giá trị mới được script đọc ở lần đồng bộ kế tiếp.

### Thứ tự ưu tiên cấu hình

1. Tab **⚙️ Settings** (cao nhất)
2. Giá trị script đã lưu từ lần chạy trước
3. `USER_CONFIG` trong code (thấp nhất)

> ⚠️ **Sau lần chạy đầu, hãy đổi cấu hình trong tab Settings, đừng sửa `USER_CONFIG` trong code**, vì sửa code sẽ không có tác dụng. Với `REMINDERS` thì ngược lại, giá trị này chỉ đọc từ code, và chỉ áp dụng cho sự kiện **tạo mới** sau đó.

### Thông số hệ thống (`SYSTEM_CONFIG`)

Phần này dành cho người muốn tinh chỉnh sâu, người dùng thường **không cần sửa**.

| Tham số | Mặc định | Ý nghĩa |
|---|---|---|
| `SYNC_INTERVAL` | `15` | Chu kỳ chạy (phút). Google chỉ chấp nhận 1, 5, 10, 15, 30 |
| `MAX_OPS_PER_RUN` | `40` | Số thao tác thêm/sửa/xóa tối đa mỗi lượt |
| `OP_DELAY_MS` | `700` | Nghỉ giữa hai thao tác để tránh bị giới hạn API |
| `MAX_RUNTIME_MS` | `270000` | Thời gian chạy tối đa mỗi lượt (4,5 phút) |
| `RETRY_ATTEMPTS` | `3` | Số lần thử lại khi gặp giới hạn API |
| `ERROR_REMINDER_COUNT` | `10` | Cứ sau bấy nhiêu lỗi liên tiếp thì nhắc lại bằng email |

---

<a id="cac-tab"></a>

## 🗂 Các tab trong Google Sheet

| Tab | Nội dung |
|---|---|
| 🏠 **Dashboard** | Trạng thái, lần đồng bộ cuối, phiên bản, số lỗi liên tiếp, lỗi gần nhất và 10 thay đổi gần đây |
| ⚙️ **Settings** | Tên trường, tên lịch, link Moodle và email thông báo |
| 📅 **Events** | Danh sách các sự kiện đang được theo dõi (UID, môn học, giờ bắt đầu và kết thúc) |
| 📜 **History** | Toàn bộ lịch sử thêm/sửa/xóa kèm thời gian |
| ⚙️ **Internal DB** *(ẩn)* | Dữ liệu nội bộ để so sánh thay đổi. **Không xóa tab này.** |

> ⚠️ Nếu lỡ xóa tab **Internal DB**, script sẽ coi mọi sự kiện là mới và tạo lại, dẫn đến lịch bị trùng. Khi đó hãy dùng **🧹 Dọn dẹp lịch trùng**.

---

<a id="thong-bao-email"></a>

## 📧 Thông báo email

Email được gửi tới địa chỉ trong Settings (hoặc email tài khoản của bạn nếu để trống):

| Tình huống | Tiêu đề email |
|---|---|
| Có 1 thay đổi: thêm | `🆕 Thêm: <tên môn>` |
| Có 1 thay đổi: sửa | `🔔 Đổi: <tên môn>` |
| Có 1 thay đổi: xóa/hủy | `🚨 Hủy: <tên môn>` |
| Nhiều thay đổi cùng lúc | `🔔 <Trường> đổi lịch` |
| Đồng bộ lỗi (lần đầu và mỗi 10 lỗi liên tiếp) | `❌ Moodle Sync Error` |
| Hệ thống chạy lại bình thường | `✅ Hệ thống đã phục hồi` |
| Có bản cập nhật quan trọng | `🚨 BẢN CẬP NHẬT QUAN TRỌNG: Sync Tool vX.X` |

Lần đồng bộ đầu tiên khi cài đặt **không gửi email** liệt kê sự kiện, kết quả hiện ngay trong hộp thoại.

Với thay đổi kiểu "sửa", email cho biết cụ thể đổi **môn** (📚), **giờ** (⏰) hay **phòng** (🏫).

---

<a id="cap-nhat"></a>

## 🆕 Cập nhật phiên bản

Script tự kiểm tra file [`version.json`](./version.json) trên nhánh `main` của repo này. Nếu có bản mới:

- Dashboard hiện dòng nổi bật màu vàng **"CẬP NHẬT MỚI"** kèm nội dung thay đổi.
- Nếu bản mới được đánh dấu khẩn cấp, bạn nhận thêm một email (chỉ gửi một lần cho mỗi phiên bản).

**Cách cập nhật:**

1. Mở file [`Auto-Sync.gs`](./Auto-Sync.gs) mới nhất trên GitHub và sao chép toàn bộ.
2. Vào **Tiện ích mở rộng → Apps Script**, xóa code cũ và dán code mới vào, rồi lưu.
3. Không cần chạy lại cài đặt. Cấu hình, lịch sử và trigger của bạn vẫn được giữ nguyên. Hãy **tải lại Google Sheet** để thấy menu mới.

---

<a id="gioi-han"></a>

## ⚠️ Giới hạn và lưu ý

- **Không phải thời gian thực.** Độ trễ tối đa khoảng 15 phút. Cần cập nhật ngay thì dùng **🔄 Đồng bộ ngay**.
- **Lần đồng bộ đầu có thể chia nhiều lượt.** Mỗi lượt xử lý tối đa 40 thao tác để tránh bị Google giới hạn. Nếu bạn có hàng trăm sự kiện, Dashboard sẽ hiện `Chờ: N` và script tự làm nốt ở các lượt 15 phút sau.
- **Sự kiện rơi khỏi link Moodle sẽ bị xóa khỏi Google Calendar.** Script coi Moodle là nguồn chuẩn. Nếu bạn chọn khoảng thời gian hẹp như "Recent and next 60 days", các sự kiện cũ sẽ dần biến mất khỏi lịch và bạn nhận email "Hủy". Hãy chọn khoảng thời gian đủ rộng nếu muốn giữ lịch sử học kỳ.
- **Không đổi "Tên lịch trên Google" sau khi đã cài đặt.** Script sẽ tạo một lịch mới theo tên mới, còn các sự kiện cũ nằm lại ở lịch cũ.
- **Đừng chỉnh sửa tay các sự kiện trong lịch được đồng bộ.** Lần đồng bộ sau chỉ ghi đè lại khi Moodle có thay đổi, nên các chỉnh sửa tay có thể bị mất hoặc gây sai lệch.
- **Nhắc nhở chỉ áp dụng cho sự kiện tạo mới.** Đổi `REMINDERS` không ảnh hưởng đến sự kiện đã có.
- **Sự kiện cả ngày** được tạo thành khối 24 giờ bắt đầu từ 00:00, không phải sự kiện "cả ngày" của Google Calendar.
- **Hạn mức của Google.** Tài khoản Google thường có hạn mức số email gửi mỗi ngày và tổng thời gian chạy trigger mỗi ngày. Mỗi lượt đồng bộ thường chỉ mất vài giây nên rất khó chạm hạn mức trong dùng thường ngày.
- **Múi giờ.** Thời gian hiển thị và gửi email dùng múi giờ `Asia/Ho_Chi_Minh`. Bạn nên đặt múi giờ dự án ở **Cài đặt dự án** trong Apps Script cho khớp.

---

<a id="xu-ly-su-co"></a>

## 🩺 Xử lý sự cố

| Triệu chứng | Nguyên nhân thường gặp | Cách xử lý |
|---|---|---|
| Không thấy menu **📅 Moodle Calendar Sync** | Chưa tải lại Sheet, hoặc script không tạo từ trong Sheet | Nhấn F5. Đảm bảo bạn mở Apps Script từ chính file Google Sheet (**Tiện ích mở rộng → Apps Script**) |
| Báo cần điền link Moodle | `MOODLE_URL` vẫn là chữ mẫu hoặc chưa có `http` | Dán link vào ô `B5` tab **⚙️ Settings** (hoặc `USER_CONFIG`) rồi chạy lại |
| `Moodle trả về HTTP xxx` | Link sai, đã bị đặt lại hoặc Moodle đang bảo trì | Lấy lại link mới ở Bước 1 và cập nhật Settings |
| `Dữ liệu Moodle trả về không hợp lệ` | Link trả về trang đăng nhập hoặc HTML chứ không phải file lịch | Lấy lại link xuất lịch (phải là link `export_execute.php` có `authtoken`) |
| `0 sự kiện trả về` | Khoảng thời gian hoặc loại sự kiện đã chọn không có sự kiện nào | Xuất lại với phạm vi rộng hơn |
| `Google đang giới hạn API` | Gọi Calendar quá nhiều | Đợi, script tự thử lại ở lượt sau |
| Dashboard hiện `Chờ: N` | Còn việc chưa làm hết do giới hạn 40 thao tác mỗi lượt | Bình thường. Script tự làm nốt ở các lượt sau |
| `Hệ thống bận, bỏ qua` | Một lượt đồng bộ khác đang chạy | Bình thường, lượt sau sẽ chạy lại |
| Một buổi học xuất hiện 2 lần | Xóa tab **Internal DB**, hoặc cài trên nhiều Sheet/nhiều bản script cùng trỏ vào một lịch | Dùng **🧹 Dọn dẹp lịch trùng**. Đảm bảo chỉ một bộ script đang chạy |
| Không nhận được email | Sai email ở `B6`, email vào thư rác, hoặc hết hạn mức gửi trong ngày | Kiểm tra `B6` và thư mục Spam |
| Dashboard hiện `🔴 CÓ LỖI` | Đồng bộ gần nhất bị lỗi | Xem dòng **Lỗi cuối** trong Dashboard, hoặc vào **Apps Script → Lượt thực thi** (Executions) để xem log chi tiết |
| Script ngừng tự chạy | Trigger bị xóa hoặc mất quyền | Chọn **⚙️ Tạo trigger đồng bộ**. Nếu vẫn lỗi, chạy lại và cấp quyền lần nữa |

Cách xem log chi tiết: trong Apps Script, mở mục **Lượt thực thi** (biểu tượng đồng hồ ở thanh bên trái).

---

<a id="go-cai-dat"></a>

## 🗑 Gỡ cài đặt

1. **Dừng tự động:** mở Apps Script → mục **Trình kích hoạt** (Triggers, biểu tượng đồng hồ báo thức) → xóa các trigger của dự án.
2. **Xóa lịch:** trong Google Calendar, mở cài đặt lịch **Lịch học UIT** → **Xóa lịch**.
3. **Xóa dữ liệu:** xóa file Google Sheet `Moodle Calendar Sync Log`.
4. **Thu hồi quyền:** vào [myaccount.google.com/permissions](https://myaccount.google.com/permissions) và gỡ quyền của script.
5. **Vô hiệu hóa link cũ (khuyến nghị):** trên Moodle, vào **Tùy chọn** (Preferences) → **Khóa bảo mật** (Security keys) và đặt lại khóa xuất lịch, nếu trường bật mục này. Link cũ sẽ không còn dùng được.

---

<a id="bao-mat"></a>

## 🔒 Quyền riêng tư và bảo mật

- Script chạy **hoàn toàn trong tài khoản Google của bạn**. Không có server trung gian và tác giả không thấy dữ liệu của bạn.
- Dữ liệu (lịch sử, cấu hình, danh sách sự kiện) được lưu **trong chính file Google Sheet của bạn**.
- Script chỉ kết nối tới hai nơi bên ngoài:
  1. **Link Moodle của bạn**, để tải lịch.
  2. **`raw.githubusercontent.com`**, để đọc `version.json` kiểm tra bản mới. Không gửi dữ liệu nào của bạn đi.
- Link Moodle chứa `authtoken` cá nhân. **Không chia sẻ file Sheet hay Apps Script cho người khác** khi link còn nằm trong đó, và không đẩy link lên GitHub.
- Mã nguồn là mã mở, bạn nên đọc qua trước khi chạy.

---

<a id="cau-truc-repo"></a>

## 📁 Cấu trúc repo

```
.
├── Auto-Sync.gs          # Toàn bộ mã nguồn Google Apps Script
├── version.json     # Thông tin phiên bản mới nhất (script đọc để báo cập nhật)
├── README.md        # Tài liệu này
└── LICENSE          # Giấy phép
```

---

<a id="bao-tri"></a>

## 🛠 Dành cho người bảo trì

Khi phát hành phiên bản mới:

1. Tăng `CURRENT_VERSION` trong `SYSTEM_CONFIG` (và chuỗi `User-Agent` nếu muốn khớp).
2. Cập nhật `version.json`:

   ```json
   {
     "latest": "1.4",
     "message": "Mô tả ngắn các thay đổi",
     "isUrgent": false
   }
   ```

   - `latest`: số phiên bản mới nhất.
   - `message`: nội dung hiển thị trên Dashboard và trong email.
   - `isUrgent`: đặt `true` nếu muốn gửi email báo cho người dùng (chỉ gửi một lần cho mỗi phiên bản).

3. Commit và đẩy lên nhánh `main`. Người dùng sẽ thấy thông báo ở lần đồng bộ kế tiếp.

> File `version.json` **bắt buộc phải có** ở nhánh `main` thì tính năng báo cập nhật mới hoạt động.

---

<a id="dong-gop"></a>

## 🤝 Đóng góp

Mọi đóng góp đều được chào đón:

- 🐛 Gặp lỗi: mở [Issue](https://github.com/nguyenhungphongg/Auto-Sync-UIT-Course-to-your-calendar/issues) kèm nội dung dòng **Lỗi cuối** trong Dashboard (nhớ **xóa link Moodle và authtoken** nếu có trong ảnh chụp hoặc log).
- 💡 Có ý tưởng: mở Issue để cùng thảo luận.
- 🔧 Muốn sửa code: Fork repo, tạo nhánh, rồi gửi Pull Request.

Nếu thấy hữu ích, hãy cho repo một ⭐ và chia sẻ cho các bạn cùng trường nhé!

---

<a id="giay-phep"></a>

## 📄 Giấy phép

Phát hành theo giấy phép **MIT**. Xem file [`LICENSE`](./LICENSE) để biết chi tiết.

---

<p align="center">
  Được tạo bởi <a href="https://github.com/nguyenhungphongg"><b>nguyenhungphongg</b></a> 💙<br/>
  <sub>Dự án không liên kết chính thức với Moodle hay Google.</sub>
</p>
  Được tạo bởi <a href="https://github.com/nguyenhungphongg"><b>nguyenhungphongg</b></a> 💙<br/>
  <sub>Dự án không liên kết chính thức với Moodle hay Google.</sub>
</p>
