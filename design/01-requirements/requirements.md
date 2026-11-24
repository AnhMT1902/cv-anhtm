# Yêu cầu và tiêu chí chấp nhận

Trạng thái **đã duyệt về yêu cầu**. Bản CV mẫu đã chạy cục bộ. Xem [ma trận truy vết](traceability.md) và [sổ quyết định](../04-decisions/decision-register.md).

| ID | Yêu cầu | Tiêu chí chấp nhận dự kiến |
| --- | --- | --- |
| CV-001 | Toàn bộ CV ở `/`, section dùng fragment | Không bắt người xem sang trang khác để đọc thông tin chính |
| CV-002 | Email, điện thoại và URL tương tác được | `mailto:`, `tel:`, URL an toàn; thao tác được bằng bàn phím |
| CV-003 | Responsive desktop/tablet/điện thoại | Không tràn ngang; nội dung và thao tác dùng được ở các viewport đã duyệt |
| ADM-001 | `/admin` được bảo vệ | Người chưa xác thực không đọc/sửa dữ liệu quản trị |
| ADM-002 | Sửa nội dung, màu và chọn template | Dữ liệu tách template; cấu hình có kiểm tra hợp lệ; không nhập mã tùy ý |
| I18N-001 | Tiếng Việt mặc định, tiếng Anh qua `/?lang=en` | Reload/share giữ tiếng Anh; `/` luôn mặc định Việt; chọn ngôn ngữ dùng được mọi viewport |
| I18N-002 | Nội dung chung và bản dịch tách biệt | Contact, ảnh, ngày, thứ tự, theme dùng chung; nội dung dịch nhập thủ công |
| I18N-003 | Draft/publish độc lập từng locale | Không lộ draft; thiếu bản dịch bắt buộc chặn publish; section tùy chọn thiếu dịch bị ẩn |
| I18N-004 | Nhãn UI, ngày, SEO đúng locale | Không fallback trộn nội dung Việt/Anh; chỉ quảng bá locale đã publish |
| ARC-001 | Next.js/TS + NestJS/TS + PostgreSQL/Prisma | Backend sở hữu API và DB; frontend không truy cập DB trực tiếp |
| OPS-001 | Docker đồng nhất Windows và Ubuntu/Proxmox | Ba service riêng; volume bền vững; kiểm chứng Windows trước, Ubuntu sau |
| OPS-002 | Cloudflare Tunnel cho public tương lai | Chỉ bật khi được duyệt riêng; không đồng nhất tunnel với xác thực admin |
| GOV-001 | Mọi thay đổi cần đề xuất và duyệt | Nêu scope, trước/sau, tác động, test, rollback; scope phát sinh cần duyệt lại |
| QA-001 | UT và Playwright cho chức năng ứng dụng | Kết quả thực tế, test lỗi/biên, luồng admin→public và responsive hai locale |
| DOC-001 | Phân cấp hồ sơ trong `design/` | Có yêu cầu, kiến trúc, thiết kế, ADR, test, vận hành và RCA |
| LOG-001 | Nhật ký Markdown cục bộ theo hạng mục | Ghi yêu cầu và phạm vi khi được duyệt. Bổ sung tệp đã đổi, kết quả kiểm tra và việc còn mở khi bàn giao. |
| LOG-002 | Giữ riêng tư và bảo toàn lịch sử | Lọc thông tin nhạy cảm, giữ bản ghi cũ, loại log khỏi Git, Docker build context và xuất bản. Ghi và đọc trực tiếp qua hệ thống tệp. |

Các yêu cầu lịch sử AUD-001 đến AUD-005 thuộc [ADR-001](../04-decisions/ADR-001-ai-audit.md) và được thay thế bởi LOG-001, LOG-002 theo [ADR-002](../04-decisions/ADR-002-project-journal.md).

## Ngoài phạm vi hiện tại

- Thiết kế và triển khai schema, migration và ERD thuộc hạng mục riêng.
- Không tạo thêm `/contact`, `/cv`, `/projects/[slug]`, PDF, blog hoặc route locale prefix.
- Không dịch AI tự động, không dựng VM, mở cổng, tunnel, DNS hoặc public website.
- Không quyết định thay người dùng về auth/session, màu/font/template cuối cùng, detailed API hoặc backup RPO/RTO.
- Không thay đổi skill/config global; skill Payload hiện có không phải quyết định dùng Payload.

## Yêu cầu cần làm rõ trước khi code ứng dụng

Số template MVP và mẫu thiết kế; trường CV bắt buộc theo locale; cơ chế xác thực/khôi phục admin; upload/media; hợp đồng API; thiết kế vật lý PostgreSQL; chính sách draft/published với thay đổi theme dùng chung; invalid/unpublished locale UX; tiêu chí khả dụng và backup. Mỗi mục phải có đề xuất và duyệt trước khi triển khai.
