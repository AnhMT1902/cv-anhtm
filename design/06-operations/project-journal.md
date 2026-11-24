# Nhật ký Markdown cục bộ

Áp dụng từ 22/11/2026 theo [ADR-002](../04-decisions/ADR-002-project-journal.md). Nhật ký nằm tại [logs/ai/project-journal.md](../../logs/ai/project-journal.md). Dùng trình soạn thảo hoặc thao tác tệp UTF-8 thông thường.

## Khi phạm vi được duyệt

1. Mở nhật ký tại thư mục dự án. Nếu checkout mới chưa có tệp, tạo thư mục `logs/ai/` và tệp `project-journal.md` khi cần ghi hạng mục đầu tiên.
2. Tạo một mục theo ngày và tên hạng mục. Tóm tắt yêu cầu, nguồn phê duyệt, phạm vi, tiêu chí nghiệm thu và kiểm tra đã duyệt trước khi sửa phần liên quan.
3. Nếu có phê duyệt bổ sung, ghi phần được duyệt thêm vào cùng mục trước khi thực hiện.

## Khi bàn giao

- Bổ sung danh sách tệp thực tế và hành vi đã thay đổi.
- Ghi cách kiểm tra, kết quả đạt/thất bại/chưa chạy/không áp dụng đã duyệt, cùng các giới hạn và việc còn mở.
- Ghi cách hoàn tác và tình trạng triển khai nếu liên quan. Lưu quyết định lâu dài trong `design/` và dẫn tới tệp tương ứng. Đọc lại mục vừa ghi để xác nhận đường dẫn và kết quả.

Chỉ ghi tóm tắt đã lọc và tham chiếu an toàn. Loại bỏ bí mật, dữ liệu cá nhân, transcript thô, đầu ra tool thô và ngữ cảnh nội bộ. Giữ các bản ghi đã có trong `logs/ai/` tại chỗ. Loại thư mục log khỏi Git, Docker build context, tài sản công khai và tải lên bên ngoài. Việc ghi và đọc nhật ký chỉ cần hệ thống tệp.
