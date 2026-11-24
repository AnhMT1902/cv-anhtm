# Hồ sơ yêu cầu và thiết kế CV

Cập nhật 22/11/2026. Tài liệu dùng tiếng Việt và giữ nguyên thuật ngữ kỹ thuật khi cần.

## Trạng thái phải phân biệt

- **Đã duyệt (approved):** người dùng đồng ý yêu cầu hoặc quyết định; không có nghĩa code đã tồn tại.
- **Đề xuất (proposed):** cần duyệt phạm vi trước khi thực hiện.
- **Đã thực hiện (implemented):** có file hoặc hành vi thực tế, dẫn chứng đường dẫn cụ thể.
- **Đã kiểm chứng (verified):** có kết quả kiểm thử, môi trường và giới hạn; không suy diễn từ implemented.

Bản CV mẫu VI/EN và API chỉ đọc đã được kiểm chứng cục bộ trên Windows. Xem [cách chạy](06-operations/windows-local.md) và [kết quả kiểm chứng](05-verification/2026-11-22-public-cv-windows.md). Quy trình ghi nhật ký theo hạng mục áp dụng từ 22/11/2026.

## Bản đồ thư mục

| Thư mục | Nội dung chính |
| --- | --- |
| `01-requirements/` | Phạm vi, yêu cầu có ID, truy vết chấp thuận và nghiệm thu |
| `02-architecture/` | Thành phần, trách nhiệm, ranh giới dữ liệu, luồng xử lý |
| `03-detailed-design/frontend/` | Trang CV/admin, ngôn ngữ, responsive |
| `03-detailed-design/backend/` | Trách nhiệm NestJS, hợp đồng API cần duyệt |
| `03-detailed-design/database/` | Quy tắc dữ liệu, điều kiện lập ERD draw.io |
| `03-detailed-design/security/` | Ranh giới truy cập, bí mật và những quyết định còn mở |
| `04-decisions/` | ADR và nguồn quyết định; không sửa ngầm lịch sử quyết định |
| `05-verification/` | Kế hoạch test, báo cáo và bằng chứng đã làm sạch |
| `06-operations/` | Quy trình agent, nhật ký cục bộ và triển khai tương lai |
| `07-postmortems/` | Mẫu RCA; chỉ tạo sự cố thật từ bằng chứng |

Nhật ký theo hạng mục nằm tại `logs/ai/project-journal.md`. Các bản ghi audit trước chuyển đổi vẫn ở `logs/ai/`.

## Quy tắc cập nhật

1. Đối chiếu yêu cầu với ID, ADR và AGENTS.md trước khi đề xuất thay đổi.
2. Trình bày trước/sau, phạm vi file, ảnh hưởng, test và rollback; chỉ sửa sau khi được duyệt.
3. Sau triển khai, cập nhật trạng thái đúng với bằng chứng thực tế và ghi phần chưa kiểm chứng.
4. Ghi tóm tắt đã lọc và tham chiếu an toàn vào nhật ký cục bộ. Lưu quyết định lâu dài trong hồ sơ thiết kế.
5. Thay đổi schema phải cập nhật ERD theo chính sách; hiện chưa có schema để vẽ ERD vật lý.

Xem [yêu cầu](01-requirements/requirements.md), [sổ quyết định](04-decisions/decision-register.md), [quy trình agent](06-operations/agent-workflow.md) và [hướng dẫn ghi nhật ký](06-operations/project-journal.md).
