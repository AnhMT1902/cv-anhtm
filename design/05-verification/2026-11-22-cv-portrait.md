# Ảnh đại diện CV

Đã triển khai và kiểm chứng trên Windows với Docker Desktop và Chromium. Ảnh tùy chọn nằm trong dữ liệu chung của bản nháp. Khi xuất bản, ảnh được lưu cùng nội dung công khai của từng ngôn ngữ. Template chỉ quyết định vị trí hiển thị. Các bản CV và template cũ đọc được như trước. Xem [định dạng template](../03-detailed-design/frontend/template-package.md) và [hướng dẫn Windows](../06-operations/windows-local.md).

## Kiểm chứng

- Baseline trước khi sửa đạt 12 unit test. Sau thay đổi, 2 bài kiểm tra ảnh chạy riêng đều đạt và toàn bộ 14 unit test đều đạt.
- ESLint, typecheck hai workspace và build frontend/backend trong Docker đều đạt.
- Playwright đạt 12 bài trên các stack Compose thử nghiệm dùng volume riêng. Bài kiểm tra ảnh dùng dữ liệu giả, xác nhận từ chối tệp ảnh lỗi, lưu và tải lại bản nháp, xem trước, xuất bản và gỡ ảnh riêng từng ngôn ngữ, và đổi qua lại giữa template có ảnh và template chữ. Kiểm tra hiển thị ở 390, 768 và 1440 px.
- Các bài hồi quy đăng nhập, điều hướng song ngữ, nội dung CV và quản lý template đều đạt. Kiểm tra lại template trên stack sạch vì bài kiểm tra nội dung sửa bản công khai. Bài hồi quy template giữ lựa chọn sau khi tạo lại container. Bài kiểm tra nội dung dùng nhãn của ô tải ZIP để phân biệt với ô tải ảnh mới.

## Phạm vi vận hành

Không cần migration hoặc đổi cấu hình Docker chính. Hai stack kiểm tra dùng các cổng loopback 3317 và 3318. Chưa cập nhật stack CV chính hoặc triển khai công khai. Nếu quay về bản ứng dụng trước, giữ volume PostgreSQL và sao lưu dữ liệu trước khi dùng trình chỉnh sửa cũ để lưu bản nháp.
