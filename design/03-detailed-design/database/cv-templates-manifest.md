# Manifest ERD nội dung CV, template và phiên admin

Kiểm chứng ngày 22/11/2026 với catalog PostgreSQL trong môi trường Compose cục bộ và Compose kiểm thử. Prisma quản lý bảng `_prisma_migrations`. Ràng buộc CHECK của khóa `public` và `main` nằm trong SQL migration. FK nullable kết hợp PK và CHECK của bảng chọn template cho lực lượng 0..1 ở hai đầu.

| Đầu vào hoặc tệp | SHA-256 |
| --- | --- |
| [schema.prisma](../../../apps/backend/prisma/schema.prisma) | `A6854A3C9F0FD6C3E5265A7DCDFBA45F2852E57E0BA7A4629A6BF0D27909B054` |
| [migration.sql](../../../apps/backend/prisma/migrations/202611220001_templates/migration.sql) | `341092AB7A43CCA2662BA9454AA920D1E2BB50C86781A7C3FABDE7F14A19F764` |
| [Migration CV](../../../apps/backend/prisma/migrations/202611220002_cv_content/migration.sql) | `E5D66B85082E37C72178124730D4F499F3561B5D4488EE80C302509AA045838C` |
| [Nguồn draw.io](cv-templates.drawio) | `2C47F9C2A8174496A6884DACE02EBCC30F9675E0D16F28819FBB43D44183D436` |
| [PNG](cv-templates.png) | `56DA50DBA4647AB17F7588D55089811667F1E5E75C358BC0AD63C463B4B0C56C` |
| [SVG](cv-templates.svg) | `A91CB357171CCE34C53D00BAAC44FD734CA38A5BF2D40A545F21F2EE2143D32F` |
| [PDF](cv-templates.pdf) | `445BD7AE56CF7427D8FFFCB658909921DC5A12FACC86A6574913FC90CF6FF5DB` |

Xuất qua draw.io Desktop 32.4.1, `--export --format <format> --border 18` ở kích thước mặc định. PDF giữ trang A4 ngang. Đã kiểm tra ảnh xuất và bản raster hóa PDF. Hiện các tệp được liên kết tại [hồ sơ database](README.md).
