# Ranh giới truy cập và dữ liệu

Trạng thái: các ranh giới xuất phát từ yêu cầu đã duyệt; biện pháp chi tiết **chờ thiết kế/duyệt**, không phải báo cáo security review hay chứng nhận an toàn.

| Tài sản/ranh giới | Quy tắc |
| --- | --- |
| CV công khai | Chỉ dữ liệu đã publish của locale đang chọn |
| Draft và trường riêng | Không xuất qua API/HTML/cache công khai |
| `/admin` và API ghi | Backend kiểm tra danh tính và quyền ở từng thao tác |
| DB và secret | Chỉ backend dùng; không đưa vào frontend bundle/log/image |
| Theme/template | Cấu hình bị giới hạn; không cho admin nhập executable code |
| Tunnel | Transport/ingress; không phải quyền quản trị |
| Log AI | Cục bộ, redacted, vẫn xem là dữ liệu nhạy cảm; không public/commit |

## Cần duyệt trước implementation

Cơ chế đăng nhập/session/khôi phục tài khoản, hash mật khẩu, cookie/CSRF, rate limiting, CORS/origin policy, validation/sanitization, chính sách upload và security headers. Không tự chọn JWT/localStorage hoặc hệ thống identity bên ngoài.

## Quyền riêng tư của nhật ký phát triển

Người ghi lọc bí mật, dữ liệu cá nhân và nội dung nội bộ trước khi lưu. Nhật ký và hồ sơ lịch sử vẫn là dữ liệu cục bộ cần bảo vệ bằng quyền truy cập tệp và quyền truy cập bản sao lưu. Xem [quy trình ghi nhật ký](../../06-operations/project-journal.md).
