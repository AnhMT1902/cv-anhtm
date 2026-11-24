# Kiến trúc hệ thống

Kiến trúc **đã duyệt ở mức thành phần**. Hai tiến trình Next.js và NestJS cho CV mẫu chạy cục bộ trên Windows. Backend phục vụ dữ liệu mẫu trong mã. Thiết kế PostgreSQL/Prisma và image triển khai vẫn chờ hạng mục riêng.

```text
Trình duyệt public / hoặc /?lang=en ──┐
Trình duyệt quản trị /admin ──────────┤
                                    v
                           Next.js + TypeScript
                                    |
                             API qua NestJS
                                    |
                             Prisma → PostgreSQL

Tương lai: domain → Cloudflare Tunnel → dịch vụ trong VM Ubuntu/Proxmox
Local đầu tiên: Docker trên Windows; chưa public tunnel
```

Sơ đồ trên là sơ đồ thành phần, không phải ERD.

## Trách nhiệm và ranh giới

- **Next.js:** render CV, chọn locale theo URL, nhãn UI, SEO, template/theme, màn hình admin. Không dùng Prisma hoặc DB credential trong frontend.
- **NestJS:** xác thực/phân quyền, kiểm tra input, quản lý nội dung dùng chung/bản dịch/draft/published, API public lọc dữ liệu và API admin. Prisma chỉ thuộc backend.
- **PostgreSQL:** dữ liệu bền vững; chi tiết schema/index/transaction sẽ có thiết kế và migration được duyệt riêng.
- **Docker Compose:** frontend, backend, database riêng; không tự thêm queue, Redis, object store, Kubernetes hoặc microservice.
- **Ingress tương lai:** tunnel đưa request vào hệ thống, không thay thế auth, CSRF/rate-limit hoặc policy admin. Cách route `/api`, origin/CORS và cache chưa chốt.

## Luồng công khai

1. Người dùng vào `/` hoặc `/?lang=en`; chỉ chấp nhận tập locale `vi/en`.
2. Frontend yêu cầu/read model public của locale từ NestJS.
3. Backend trả snapshot đã publish, loại draft/private; thiếu dịch tùy chọn thì bỏ section.
4. Frontend render template với theme hợp lệ, UI/SEO theo locale.
5. Thay locale giữ URL chia sẻ và fragment ổn định. UX khi locale không hợp lệ/chưa publish cần duyệt trước code.

## Luồng quản trị

Admin xác thực → chỉnh dữ liệu chung/bản dịch → lưu draft → kiểm tra hoàn chỉnh bắt buộc → publish locale → public thấy phiên bản đã xuất bản. Thay đổi draft không tác động snapshot public hiện có. Cơ chế revision/snapshot và theme chung tác động khi publish cần thiết kế chi tiết, không chọn ngầm cấu trúc DB.

## Nhật ký phát triển

Người thực hiện ghi tóm tắt đã lọc vào `logs/ai/project-journal.md` khi phạm vi được duyệt và khi bàn giao. Nhật ký là tệp cục bộ phục vụ phát triển. Xem [quy trình ghi nhật ký](../06-operations/project-journal.md).
