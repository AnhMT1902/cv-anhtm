# Quy trình agent khi nhận yêu cầu

Trạng thái: **đã duyệt**, áp dụng với mọi yêu cầu sau này; AGENTS.md là chỉ dẫn thực thi.

## 1. Đọc và đối chiếu, chưa sửa

Đọc AGENTS, yêu cầu mới, design/ADR, baseline và các test hiện hữu. Chỉ khảo sát bằng thao tác đọc. Dùng nhật ký cục bộ để tra phạm vi đã duyệt và đối chiếu kết quả với bằng chứng kiểm thử.

## 2. Đề xuất và đợi duyệt

Đề xuất phải ghi: ID yêu cầu/mục tiêu; hiện trạng→sau thay đổi; phần giữ nguyên; file/module sẽ thêm/sửa/xóa; tác động UI/API/schema/data/auth/dependency/Docker/compatibility; ngoài phạm vi; test UT/Playwright và regression; rollback/recovery. Thiếu thông tin thì nêu bất định, không tuyên bố không ảnh hưởng nếu chưa kiểm tra. Chưa được duyệt thì không code hoặc cài package.

## 3. Thực hiện đúng scope

Sau khi được duyệt, ghi yêu cầu và phạm vi vào `logs/ai/project-journal.md` theo [quy trình nhật ký](project-journal.md), rồi chỉnh sửa. Scope/rủi ro mới → dừng phần liên quan, trình bổ sung và đợi duyệt. Không refactor/upgrade/fix unrelated. Không mở public tunnel, migration DB hoặc triển khai production bằng approval local.

## 4. Kiểm chứng

UT test normal/biên/invalid/regression trước; technical checks theo dự án; Playwright trực tiếp luồng ảnh hưởng và responsive nếu liên quan UI. Admin thay đổi phải kiểm tra public và reload/persistence/draft isolation. Test bị chặn phải báo blocker và hành vi chưa kiểm chứng, không đổi thành “đạt”. Ngoại lệ N/A cần duyệt, không tự miễn.

## 5. Bàn giao và lưu bằng chứng

Đối chiếu phạm vi thực tế với phê duyệt. Bổ sung vào mục nhật ký các tệp đã thay đổi, kết quả kiểm tra, việc còn mở và cách hoàn tác. Cập nhật truy vết, ADR và thiết kế theo trạng thái thực tế.

## Skill theo trách nhiệm

- `cv-solution-architecture`: phân tích yêu cầu, ranh giới và kế hoạch; stack chính thức theo AGENTS, không theo đề xuất Payload cũ trong skill.
- `cv-nextjs-frontend`, `cv-responsive-design`: public/admin frontend theo scope đã duyệt; chưa chạy trong đợt này.
- `cv-docker-homelab`, `cv-backup-recovery`: Docker/Windows→Ubuntu và restore có duyệt; không tự provision hoặc restore live.
- `cv-database-erd`: ERD draw.io khi có schema được kiểm chứng.
- `playwright`: browser test thật cho ứng dụng khi được triển khai.
- Skill Payload không áp dụng cho backend NestJS; chưa tạo hay sửa skill global trong đợt này. Nếu cần skill NestJS riêng, phải đề xuất scope cài/cập nhật riêng.

