# Sổ quyết định

Trạng thái quyết định và trạng thái triển khai là hai việc khác nhau. Nguồn: hội thoại dự án, session `01a1f48e-f0fe-7da3-90db-86359dc86993`, và AGENTS.md đã tồn tại trước đợt tài liệu này. Không suy đoán thời điểm chấp thuận nếu nguồn không cho phép xác minh.

| ID | Quyết định | Nguồn chấp thuận | Trạng thái thực hiện |
| --- | --- | --- | --- |
| D-001 | CV đầy đủ ở `/`; fragment cùng trang; admin riêng | Người dùng yêu cầu CV và admin, phản hồi không cần route phụ | Trang CV mẫu đã được kiểm chứng cục bộ. Admin còn mở. |
| D-002 | Windows trước, Docker portable Ubuntu VM/Proxmox; Cloudflare Tunnel sau | “VM chưa tạo... trước tiên chạy được trên window... docker”; chọn Tunnel | Chưa có VM/Docker/tunnel |
| D-003 | Next.js/TS + NestJS/TS + PostgreSQL + Prisma, ba service | “t muốn có backend nhé, dùng nestJS”; annotation đồng ý bảng stack | Hai tiến trình Next.js/NestJS đã chạy trên Windows. DB và Compose còn mở. |
| D-004 | Việt mặc định, Anh qua `?lang=en`, publish riêng locale | Yêu cầu song ngữ và annotation “ok” với đề xuất URL/quy tắc | Đã kiểm chứng URL và nội dung mẫu song ngữ. Publish còn mở. |
| D-005 | Đề xuất→duyệt scope/ảnh hưởng→code→UT/Playwright→bàn giao | Annotation yêu cầu phải duyệt, nêu scope/tác động và test UT/Playwright; “ok lưu quy trình” | Đã lưu AGENTS; áp dụng từng yêu cầu |
| D-006 | Hồ sơ phân cấp trong `design/` và lưu bản ghi cục bộ | Yêu cầu thư mục thiết kế, lưu logs và duyệt kế hoạch | Đã lưu hồ sơ. Cách ghi log hiện hành theo ADR-002. |
| [ADR-001](ADR-001-ai-audit.md) | Audit tự động, backfill và lưu log cục bộ | Các lựa chọn đã thống nhất trong kế hoạch audit | Lịch sử. Phần audit tự động được thay thế bởi ADR-002. |
| [ADR-002](ADR-002-project-journal.md) | Nhật ký Markdown trực tiếp theo từng hạng mục | Người dùng duyệt chuyển đổi ngày 22/11/2026 | Đã áp dụng quy trình nhật ký. |

## Tham chiếu annotation gốc (không phải approval mới)

- Tunnel: `8e2b92f1-a7db-4d17-bc22-4ce4896f226d`.
- Route đơn trang: `a8b36611-748e-42a3-bd44-b30d8880a35a`.
- Approval/scope: `96a45f2e-7c1b-467b-9931-f21fa15a84eb`; UT/Playwright: `d0cbab31-c3bc-40c0-abc7-bcdd44e69b71`.
- Stack: `de7917f0-4b69-42ad-9c58-68eab2178ca5`.
- URL/publish song ngữ: `7500f42a-9b0a-42ea-9fd4-8cb932955811`.

Quyết định mới phải có ADR hoặc cập nhật rõ ID, nguồn duyệt và tác động; không âm thầm biến đề xuất thành đã duyệt.
