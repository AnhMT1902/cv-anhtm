# Thiết kế backend NestJS

NestJS/TypeScript và trách nhiệm backend **đã duyệt**. Bản Windows có API chỉ đọc `GET /api/public/cv` với dữ liệu mẫu trong mã. Mặc định `vi`, chấp nhận `en`, trả `400` cho giá trị sai hoặc tham số lặp. Xác thực, lưu trữ và xuất bản chờ thiết kế riêng.

## Trách nhiệm bắt buộc

- API public chỉ đọc dữ liệu đã publish cho locale hợp lệ, không lộ draft/private fields.
- API admin có xác thực và phân quyền ở backend; không dựa vào việc ẩn nút hoặc ẩn route frontend.
- Kiểm tra dữ liệu CV, locale, contact URL, theme/template allowlist và giới hạn upload nếu upload được duyệt.
- Lưu draft/publish riêng từng locale; chặn publish khi thiếu nội dung dịch bắt buộc; bỏ optional section thiếu dịch.
- Truy cập PostgreSQL qua Prisma trong backend; không chia sẻ DB credential cho Next.js/browser.

## Phân chia logic đề xuất, chưa scaffold

Nhóm xác thực; nhóm CV/draft/publication; nhóm public read model; nhóm theme/template settings. Module thực tế, URL API/versioning, OpenAPI, mã lỗi, cache invalidation, transaction và optimistic concurrency phải nằm trong đề xuất code riêng.

## Các trường hợp phải test khi triển khai

1. `vi` mặc định, `en`, locale sai, locale chưa publish; contract lỗi được duyệt trước.
2. Unauthorized/forbidden; tránh mass-assignment và truy cập draft bằng đổi locale/query.
3. Draft mới không ghi đè snapshot public; publish Anh không tự publish Việt.
4. Thiếu dịch bắt buộc, optional thiếu dịch, trường dùng chung đổi; không fallback trộn ngôn ngữ.
5. Save/publish đồng thời, validation ngày/link, lỗi DB và rollback transaction.

Không coi dữ liệu public projection hiện được mô tả là schema vật lý hoặc cam kết endpoint đã tồn tại.
