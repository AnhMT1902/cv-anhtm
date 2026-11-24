# Thiết kế frontend

Yêu cầu **đã duyệt**. Bản Windows có CV song ngữ với mẫu ban đầu và thư viện template qua `/admin`. Xem [định dạng ZIP](template-package.md) và [kết quả kiểm chứng](../../05-verification/2026-11-22-template-admin.md).

## Route và nội dung

| URL | Ý nghĩa |
| --- | --- |
| `/` | CV đầy đủ tiếng Việt |
| `/?lang=en` | Cùng trang CV, nội dung tiếng Anh đã publish |
| `/#experience`, `/?lang=en#experience` | Cuộn đến section cùng trang; không phải trang phụ |
| `/admin` | Quản trị riêng, yêu cầu xác thực |

Các section dự kiến: giới thiệu, kinh nghiệm, học vấn, kỹ năng, dự án, liên hệ. Section optional có thể không hiện. Không mặc định tạo trang riêng hoặc PDF.

## Hợp đồng trình bày

- Tách dữ liệu CV, dictionary UI, template component và theme tokens; không nhân đôi toàn bộ CV theo locale.
- Đề xuất template registry giới hạn ID cho phép; admin chỉ chọn ID/màu hợp lệ, không cung cấp HTML/JS/CSS thực thi. Cần duyệt số lượng và mẫu template.
- Chuyển VI/EN dùng được bằng keyboard/touch; giữ query và fragment khi reload/share. Không tự dùng ngôn ngữ trình duyệt để ghi đè `/`.
- Hiển thị ngày từ dữ liệu cấu trúc dùng chung theo locale; không dịch bằng cách thay thế chuỗi tùy tiện.
- Email/điện thoại dùng `mailto:`/`tel:`; external URL kiểm tra scheme, tên link rõ ràng, focus nhìn thấy được.
- Metadata title/description, ngôn ngữ và alternate chỉ khớp những bản đã publish. Canonical/indexing chính xác cần chốt trước implementation.

## Responsive và kiểm thử dự kiến

Đề xuất viewport 390px (điện thoại), 768px (tablet), 1440px (desktop), bổ sung 320px và zoom như case biên. Đây là kế hoạch, chưa chạy. Kiểm tra hai locale, overflow, xuống dòng email/URL dài, thứ tự đọc, ảnh, nav, selector, vùng chạm, độ tương phản và reduced motion nếu có animation. Không ép CV trên điện thoại thành trang A4 thu nhỏ.

Admin ban đầu dùng UI tiếng Việt; nội dung dịch có tab Việt/Anh. Chưa duyệt UI admin song ngữ, editor tự do, thiết kế in hoặc download.
