# Dữ liệu và ERD

PostgreSQL 17 và Prisma 7.10.1 lưu nội dung CV, thư viện template, lựa chọn template công khai và phiên admin trong Docker Compose. Bảng `cv_content` giữ bản nháp chung, dữ liệu dịch và hai bản chụp đã xuất bản. Số phiên bản ngăn lưu hoặc xuất bản đè lên thay đổi từ cửa sổ khác. Schema vật lý đã đối chiếu với migration và catalog cục bộ. [Nguồn draw.io](cv-templates.drawio) · [PNG](cv-templates.png) · [SVG](cv-templates.svg) · [PDF](cv-templates.pdf) · [Manifest](cv-templates-manifest.md).

## Nguyên tắc đã chốt

Nội dung dịch độc lập theo `vi/en`; dữ liệu không phụ thuộc ngôn ngữ dùng chung. Draft và published phải cách ly; publish từng locale cần tính nhất quán. Cách hiện thực snapshot/revision và quan hệ chưa chốt. Không tạo hai CV độc lập chỉ vì có hai ngôn ngữ.

## Điều kiện mở thiết kế vật lý

1. Duyệt danh sách field bắt buộc/optional, semantics publish và dữ liệu dùng chung.
2. Duyệt Prisma model/migration, constraint/index, transaction, media persistence nếu có.
3. Lấy schema từ migration/DDL/ORM đã kiểm chứng; ghi lại disagreement thay vì sửa schema cho đẹp sơ đồ.
4. Tạo `.drawio` native với entity tables, column rows, FK→PK/UNIQUE đúng hàng; Crow's Foot đúng nullable/UNIQUE, kể cả composite FK.
5. Export PNG/SVG/vector PDF bên cạnh source; kiểm tra ảnh render và trang A4. Không dùng screenshot thay entity editable.
6. Ghi manifest schema inputs/hash, source hash, phiên bản tool/export, asset hashes và report consumers. Chỉ export phần bị ảnh hưởng.

`AGENTS.md` là chính sách ERD đầy đủ và có hiệu lực.
