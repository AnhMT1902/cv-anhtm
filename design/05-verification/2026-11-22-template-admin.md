# Kiểm chứng quản trị template

Phạm vi đã duyệt gồm tài khoản cục bộ, bảo vệ API, nhập ZIP, gán mục, xem trước, xuất, áp dụng, PostgreSQL và Docker Compose trên Windows. Bản trước có một mẫu và chưa có admin. Gói Start Bootstrap – Resume được điều chỉnh từ v7.0.6, với bố cục điều hướng theo mục và phần dự án đứng trước kinh nghiệm.

| Kiểm tra | Kết quả |
| --- | --- |
| Unit và API | Đạt 7/7 cho locale, API công khai, gói mẫu, gán mục, nhập lại và lỗi định dạng. |
| Lint, type check, build | Đạt. Build frontend/backend trên Docker, migration Prisma trong PostgreSQL riêng. |
| Playwright Chromium | Đạt 4 bài trên Compose kiểm thử. Ba bài hồi quy CV và một luồng admin gồm chặn khi chưa đăng nhập, kiểm tra link nguồn, tải ZIP, từ chối ZIP hỏng, nhập hai bố cục, gán mục, xem trước VI/EN ở desktop/điện thoại, áp dụng và xuất ZIP. |
| Lưu qua vòng đời container | Đạt bài Playwright riêng sau `docker compose up --force-recreate` cho cả ba container kiểm thử. Mẫu còn áp dụng ở hai locale và chuyển về mẫu ban đầu được trong admin. |
| Bố cục và ERD | Đã xem ảnh mẫu Start Bootstrap ở 390, 768 và 1440 px, xác nhận không tràn ngang trong Playwright. ERD đối chiếu catalog và kiểm tra PNG/PDF. |

Bản dùng thử chạy tại loopback Windows. Admin trên bản dùng thử cần chủ máy đặt mật khẩu. Kiểm tra đăng nhập dùng mật khẩu ngẫu nhiên trong tiến trình của môi trường Compose riêng. Không có dữ liệu từ lượt kiểm thử trong thư viện chính. Giới hạn trình duyệt là Chromium trên Windows. Chưa triển khai công khai.

[Thiết lập mật khẩu và hoàn tác](../06-operations/windows-local.md) · [Định dạng ZIP](../03-detailed-design/frontend/template-package.md) · [ERD và manifest](../03-detailed-design/database/cv-templates-manifest.md)
