# Kiểm chứng quản lý nội dung CV

Windows Docker Compose, PostgreSQL 17, Chromium. Đạt 11 unit/API test, ESLint, type check, build hai image và Compose. Đạt 8 bài Playwright hồi quy và 1 bài quản lý nội dung trên stack riêng. Đã xem ảnh màn quản trị ở 390, 768 và 1440 px.

Luồng quản trị kiểm chứng lỗi thiếu chức danh, lưu nháp, xem trước nháp đã lưu, thêm dự án, xuất bản English, giữ bản Việt chưa đổi, tải lại và xuất bản riêng bản Việt. Cả hai bản đổi thông tin chung khi được xuất bản riêng. Mục dự án thiếu bản dịch Việt được ẩn. API admin trả 401 khi thiếu phiên. Compose chính healthy và cả ba URL `/`, `/?lang=en`, `/admin` trả 200. Dữ liệu kiểm thử dùng stack riêng.

## Bổ sung trường CV và chỉnh dự án tại chỗ

Đạt 12 unit/API test, lint, type check, build hai image và 9 bài Playwright trên Docker Windows. Kiểm thử mới nhập tiêu đề mục, mô tả, vai trò, công nghệ và GitHub trong thẻ dự án, xem trước, xuất bản và xác nhận tiêu đề điều hướng giữ `#projects` trên cả mẫu gốc và Start Bootstrap ZIP. Đã xem ảnh trình chỉnh sửa dự án tại 390, 768 và 1440 px. Kiểm thử backend xác nhận đọc được bản nháp cũ và loại mục bổ sung ẩn hoặc thiếu bản dịch.

Đợt này bổ sung trường JSONB tương thích với dữ liệu đang lưu. Hai image thực tế trước rollout được gắn tag `before-detailed-content` cho frontend và backend. Giữ volume khi quay lại cặp image đó. Trang admin và CV chạy cục bộ.

Trước migration đã tạo dump PostgreSQL cục bộ `logs/cv-backups/before-cv-content-e8c1fa5c.dump` với SHA-256 `C4E473668BC149F1CAD1138A022CDE69FD9F573E1C106EA93C78BCD5B60FFB5F`. `pg_restore --list` đọc được archive trong container kiểm thử. Chưa thực hiện restore đầy đủ. Tag trước triển khai `cv-project-frontend:before-cv-content` và `cv-project-backend:before-cv-content` được dựng lại từ filesystem của hai container cũ với cấu hình khởi động cần thiết. Chưa chạy thử hai image dựng lại. Khi hoàn tác, giữ volume `cv-project_cv-data` để bảo toàn nội dung mới. Migration chỉ thêm bảng. [Schema và ERD](../03-detailed-design/database/README.md).
