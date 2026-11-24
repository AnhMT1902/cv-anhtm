# Chiến lược kiểm thử

## Cổng thay đổi bắt buộc

Trước code: yêu cầu/acceptance, scope, baseline, rủi ro và test plan phải được duyệt. Sau code: kiểm tra scope thực tế, UT, technical checks, UI thật bằng Playwright khi liên quan ứng dụng, regression và rollback. Không chỉ dựa vào build thành công.

## Chuyển đổi nhật ký ngày 22/11/2026

Unit test ứng dụng và Playwright không áp dụng theo phê duyệt riêng cho đợt chuyển đổi. Kiểm tra đường dẫn, tham chiếu, ghi và đọc lại nhật ký, quy tắc loại log và toàn vẹn bản ghi lịch sử. Xem [mục bàn giao](../../logs/ai/project-journal.md).

Bằng chứng của quy trình cũ nằm trong [báo cáo bootstrap](2026-11-20-audit-bootstrap.md) và [báo cáo audit subagent](2026-11-21-subagent-audit.md).

## Khi triển khai ứng dụng sau này

- UT locale/default/validation/publication/theme/DTO; API tests auth, draft isolation, database transaction.
- Playwright public CV VI/EN, contact links, selector URL/reload/share, section nav và admin edit→draft→publish→public.
- Responsive hai locale ở phone/tablet/desktop, overflow/focus/console/network; không claim cross-browser khi chỉ chạy một browser.
- Integration DB/migrations/volume; Docker Windows trước, Ubuntu sau; smoke test qua tunnel chỉ sau duyệt triển khai.
- Schema thật mới có ERD draw.io và kiểm chứng export; backup/restore phải drill trong môi trường được duyệt riêng.
