# Kiểm chứng CV mẫu song ngữ trên Windows

Ngày 22/11/2026. Baseline chỉ có hồ sơ thiết kế. Hạng mục đã duyệt tạo một trang CV mẫu và một API chỉ đọc, chạy bằng hai tiến trình Windows trên loopback.

| Kiểm tra | Kết quả |
| --- | --- |
| `npm.cmd test` | Đạt 4/4. Locale trang, locale API, tách nội dung dịch khỏi trường chung và kiểm tra hợp đồng HTTP công khai. |
| `npm.cmd run lint` | Đạt. |
| `npm.cmd run build` | Đạt. Next.js render động theo yêu cầu và NestJS biên dịch TypeScript. |
| `npm.cmd run typecheck` | Đạt ở cả hai workspace. |
| `npm.cmd run test:e2e` | Đạt 3/3 trên Chromium, ở 390, 768 và 1440 px. Kiểm tra VI mặc định, EN qua URL, chuyển hai chiều, reload, fragment, URL sai hoặc lặp locale, ngôn ngữ tài liệu/title/ngày, focus bàn phím, href liên hệ, tràn ngang và lỗi console/network. Đã xem ảnh cả hai locale ở ba kích thước. |

Môi trường đã chạy gồm Node.js 24.22.3, npm 11.19.1, Next.js 16.4.6, NestJS 11.2.11 và Playwright 1.65.1. npm hệ thống gặp EPERM. Dùng Node portable có đối chiếu SHA-256 trong workspace. Lượt Playwright ban đầu cần dừng thủ công listener thử nghiệm do hạn chế sandbox. Lượt cuối thoát mã 0 sau khi chạy ngoài sandbox và kết thúc cả hai dịch vụ kiểm thử.

ESLint 9.39.5 chạy đạt, với cảnh báo hết hỗ trợ khi npm cài dependency. Kiểm thử trình duyệt giới hạn ở Chromium trên Windows. Kiểm chứng liên kết xác nhận href, chưa dùng ứng dụng mail hoặc điện thoại. Draft/publish, admin, dữ liệu bền vững, Docker và môi trường triển khai thuộc các hạng mục riêng.

[Hướng dẫn chạy Windows](../06-operations/windows-local.md) · [Luồng kiểm thử trình duyệt](../../tests/public-cv.spec.ts) · [Kiểm thử backend](../../apps/backend/test/public-cv.test.ts)

## Chạy bằng Docker Compose

Docker Engine ở chế độ Linux/x86_64 trên Windows, Compose v5.1.0. `docker compose config --quiet` và `docker compose up --build --wait --wait-timeout 90` đạt. Hai container healthy, chạy bằng user `node`. Frontend publish tại `127.0.0.1:3000`, backend không publish cổng. Lượt đầu đã build được image nhưng không tạo được mạng vì hết pool tự cấp. Lượt sau dùng subnet riêng `10.250.79.0/28` có thể override tại máy đích.

- Unit/API 4/4, lint và type check đạt trên Windows. Cả hai build đạt trong Docker.
- Kiểm tra HTTP từ frontend container đến NestJS đạt với VI, EN, từ chối locale sai và lọc trường riêng. Playwright 3/3 đạt trên Chromium ở 390, 768 và 1440 px với URL Compose.
- Base image `node:24.22.3-bookworm-slim` dùng digest `sha256:dc26ae92c9fb15cf6b1d63e20f0944b2efe0f115b20e00be48fb23fceb061c54`. Image local được kiểm tra là frontend `sha256:664d975b3a81d45a5f8b9a80d509ee81da8985f3c128a682578dfca2eff26f41` và backend `sha256:0a1df2efdc58f61b0fcf9c02bfde97e4c1481ffac52ebe1ec63a52f1045f7309`.
- Hoàn tác runtime bằng `docker compose down` từ thư mục dự án. Bản mẫu không có volume dữ liệu. Chưa chạy trên Ubuntu và chưa publish image hay website ra ngoài máy.
