# Ma trận truy vết

Cập nhật 22/11/2026. Bảng theo dõi trạng thái của các yêu cầu hiện hành, kèm tham chiếu phê duyệt lịch sử bên dưới.

| Yêu cầu | Quyết định | Thiết kế/file | Bằng chứng hoặc trạng thái |
| --- | --- | --- | --- |
| CV-001..003 | D-001 | `../03-detailed-design/frontend/README.md` | Mẫu CV trên Windows đã qua [kiểm tra UI](../05-verification/2026-11-22-public-cv-windows.md). |
| ADM-001..002 | D-001, D-003 | `../03-detailed-design/security/README.md` | Đã kiểm chứng bảo vệ admin, [quản lý template](../05-verification/2026-11-22-template-admin.md) và [quản lý nội dung](../05-verification/2026-11-22-cv-content.md). Chỉnh màu thuộc hạng mục riêng. |
| I18N-001..004 | D-004 | `../03-detailed-design/frontend/README.md`, `../03-detailed-design/backend/README.md` | URL, dữ liệu mẫu dùng chung và bản dịch, nhãn/ngày/metadata đã qua kiểm tra. Draft/publish còn mở. |
| ARC-001 | D-003 | `../02-architecture/system.md` | Next.js và NestJS tách riêng đã chạy trên Windows. Prisma/PostgreSQL thuộc hạng mục sau. |
| OPS-001..002 | D-002 | `../06-operations/deployment.md` | Chưa tạo VM/service/tunnel |
| GOV-001 | D-005 | `../../AGENTS.md`, `../06-operations/agent-workflow.md` | Quy trình đã lưu; phải áp dụng từng yêu cầu |
| QA-001 | D-005 | `../05-verification/test-strategy.md` | Áp dụng khi làm ứng dụng. Ngoại lệ đã duyệt riêng cho đợt nhật ký. |
| DOC-001 | D-006 | `../README.md` và các thư mục con | Đã thực hiện; xem báo cáo kiểm chứng |
| LOG-001..002 | ADR-002 | [Quy trình nhật ký](../06-operations/project-journal.md), [AGENTS.md](../../AGENTS.md) | Kiểm tra chuyển đổi trong [mục nhật ký đầu tiên](../../logs/ai/project-journal.md) |

## Tham chiếu phê duyệt lịch sử của ADR-001

- Dùng session `01a1f48e-f0fe-7da3-90db-86359dc86993` khi đối chiếu log cục bộ.
- Prompt thực hiện: **“Please implement the plan.”**, sau khi đã thống nhất kế hoạch tài liệu/audit.
- Không gán approval này thành quyền triển khai ứng dụng hay hạ tầng.
- Định danh event cụ thể tra trong `logs/ai/.../events.jsonl`; file audit không được commit chỉ để làm đẹp truy vết.

## Event nguồn đã đối chiếu khi backfill

Các ID dưới đây lấy từ log đã nhập, không được tạo từ lời kể. Cùng session nêu trên; `line` là dòng native source (không phải số dòng tài liệu này). Không đưa nội dung prompt đầy đủ vào Git.

| Quyết định | Native line | Event ID |
| --- | --- | --- |
| D-002 chọn tunnel | 77 | `a42215d5eeee4d80efd1ce97832f4efc866cba1243e7f3ff67c0716f4a7ef644` |
| D-005 approval scope/UT/Playwright | 312 | `6a5f063b309e5057477d82dcdaf7a4408509af43144a6bb4ad64199e907701b4` |
| D-003 đồng ý stack | 422 | `07eb8010ef40a0291cbe8a083b93789e5a90c37883cf1b264822d6ff71f56d08` |
| D-004 đồng ý URL/publish song ngữ | 451 | `c65805e61058f40ffb35eacdfbe1a8a5f2235a23b4bd28f51816507797bcd720` |
| D-006 yêu cầu design/log | 491 | `82a5db6a348eb374ce61b76524fd298c536cea12a9740b67c8bc8b4b7321fed8` |
| Approval thực hiện kế hoạch hiện tại | 607 | `33773194972697c5d0ce0781168d456cb4d5d819c78f8b9d7f8cd35418bc3901` |
