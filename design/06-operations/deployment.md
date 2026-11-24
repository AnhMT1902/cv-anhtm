# Triển khai ứng dụng trong tương lai

Hai image và Docker Compose cho CV mẫu đã được kiểm chứng trên Windows. Xem [hướng dẫn chạy](windows-local.md). DB, Ubuntu, Proxmox và tunnel vẫn thuộc các hạng mục sau.

1. Đề xuất scope scaffold Next.js/NestJS/PostgreSQL/Prisma và duyệt API/schema/auth/template trước.
2. Docker trên Windows: frontend và backend tách riêng cho CV mẫu. Khi bổ sung PostgreSQL, chạy database như service riêng với dữ liệu bền vững và giữ dev secret ngoài Git/image.
3. Chốt version/image digest được hỗ trợ ở thời điểm triển khai; không coi phiên bản latest hoặc compatibility là thông tin cố định.
4. Duyệt tạo Ubuntu Server VM trên Proxmox; chuẩn bị Docker, firewall, volume, secrets, migration và backup. Chưa tự quyết CPU/RAM hoặc RPO/RTO.
5. Chuyển cùng image/config hợp lệ, điều chỉnh riêng môi trường; smoke test và restore drill trong target đã duyệt. Không bind public DB.
6. Duyệt public domain/tunnel riêng; cấu hình Cloudflare Tunnel đến dịch vụ nội bộ, HTTPS và admin policy đã kiểm thử. Domain/tunnel không tự bảo vệ `/admin`.

Giữ nhật ký và bản ghi lịch sử trong `logs/ai/` ngoài container, build context và tài sản công khai. Kiểm tra lại quy tắc loại log và bí mật khi tạo Dockerfile, nhất là khi Dockerfile có tệp ignore riêng hoặc dùng build context khác project root.

Rollback ứng dụng cần xét compatibility migration và dữ liệu, không chỉ đổi image. Backup/restore cần cả PostgreSQL và media nhất quán, off-host và drill có duyệt; chưa claim đã backup hoặc restore được.
