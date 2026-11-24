# Chạy CV mẫu bằng Docker trên Windows

Khởi động Docker Desktop ở chế độ Linux containers và chạy từ thư mục gốc dự án.

```powershell
docker compose up --build
```

Khi frontend sẵn sàng, mở [tiếng Việt](http://127.0.0.1:3000/) hoặc [tiếng Anh](http://127.0.0.1:3000/?lang=en). Docker build cài dependency theo lockfile. Backend dùng địa chỉ `http://backend:3001` trong mạng Compose, và chỉ frontend được publish ra loopback Windows.

## Quản trị template

Từ thư mục dự án, đặt tên tài khoản và mật khẩu quản trị rồi khởi động lại backend bằng PowerShell.

```powershell
pwsh -File .\scripts\set-admin-password.ps1
docker compose up -d --wait
```

Script lưu tên tài khoản và hash scrypt trong `.env`. Nếu đã đặt mật khẩu từ bản trước, đăng nhập bằng tên `admin` và mật khẩu đã đặt, hoặc chạy lại script để chọn tên khác. Script tạo khóa database nếu đây là lần cấu hình đầu tiên. Backend áp dụng migration lúc khởi động. Giữ nguyên khóa database hiện có khi tái sử dụng volume.

Mở [Trang quản trị](http://127.0.0.1:3000/admin) rồi dùng **Tải ZIP tương thích → Kiểm tra và nhập → Xem trước → Áp dụng**. Mỗi mẫu có hình thu nhỏ; **Xem trước** mở hộp thoại để chọn ngôn ngữ và kích thước. Dùng **Xuất ZIP** để lấy mẫu đã chuẩn hóa, hoặc **Áp dụng** ở mẫu ban đầu để quay lại. [Định dạng gói template](../03-detailed-design/frontend/template-package.md).

Trong **Template → Mẫu JSON Resume**, chọn **Xem trước** cho Sidebar, Elegant, Kendall hoặc Jake Technical, rồi đổi ngôn ngữ trong khung xem trước nếu cần. **Áp dụng** chọn một bố cục chung cho hai bản công khai hiện có. Dùng **Thư viện** để chọn lại mẫu cũ.

Trong **Nội dung CV**, di chuột hoặc dùng bàn phím để hiện các thao tác ngay trên bản xem trước; trên màn hình cảm ứng các thao tác được hiển thị sẵn. Sửa hoặc thêm mục trong hộp thoại với các tab **Tiếng Việt** và **English**. **Lưu vào nháp** lưu thay đổi; **Lưu** lưu và xuất bản cả tiếng Việt và tiếng Anh trong cùng một lần. Nội dung thiếu bản dịch của một mục tùy chọn sẽ ẩn ở bản đó. Dùng phần quản lý mục chưa hiển thị để thêm hoặc chỉnh sửa các mục đang ẩn.

Nhập dữ liệu CV cục bộ bằng `node scripts/import-cv.cjs <đường-dẫn-json>` để kiểm tra, rồi thêm `--apply` để lưu và xuất bản cả VI/EN. Script giữ ảnh hiện có, ẩn các mục cũ trong bản nháp và lưu bản sao nội dung trước khi thay đổi vào `logs/cv-content-backup-*.json`. Nội dung và bản sao chứa thông tin cá nhân và cần được giữ riêng. Để khôi phục, chạy `node scripts/import-cv.cjs <đường-dẫn-bản-sao> --restore`. Khôi phục ghi đè nội dung CV hiện tại sau khi lưu thêm một bản sao. Cả hai thao tác kiểm tra phiên bản dữ liệu để phát hiện thay đổi đồng thời.

Trong hộp thoại sửa thông tin đầu trang, chọn ảnh PNG, JPEG hoặc WebP tối đa 512 KiB. Bạn có thể chọn tệp khác hoặc bấm **Xóa ảnh**, rồi **Lưu vào nháp**. Ảnh cập nhật trên cả hai bản công khai khi bấm **Lưu**. Chuyển template giữ lại ảnh đã lưu, kể cả khi template đang dùng không hiển thị ảnh. Nếu quay về ứng dụng cũ, sao lưu PostgreSQL trước khi lưu bản nháp bằng trình chỉnh sửa cũ.

Sửa tiêu đề và các mục dự án trực tiếp trên bản xem trước; hộp thoại cho phép sửa nội dung dịch và các trường chung. Chứng chỉ, giải thưởng và hoạt động có thể thêm, ẩn và đổi thứ tự từng mục. Nội dung đã lưu ở định dạng trước vẫn đọc được.

`docker compose down` giữ volume PostgreSQL. Khi quay về image ứng dụng trước đợt này, giữ riêng volume `cv-project_cv-data` để có thể dùng lại thư viện template với image mới.

Dùng `docker compose up --build --wait` để chạy nền và đợi cả hai dịch vụ healthy. Dùng `docker compose ps` để kiểm tra trạng thái và `docker compose down` để dừng, gỡ container và mạng của dự án. Mạng mặc định dùng `10.250.79.0/28` vì các pool tự cấp trên máy kiểm thử đã hết. Nếu dải này trùng mạng trên máy khác, đặt `CV_DOCKER_SUBNET` thành một subnet riêng khả dụng trước khi tạo mạng.

## Kiểm thử từ Windows

Node.js 24 và npm chỉ cần cho bộ kiểm thử trên máy. Nếu dùng runtime portable đã kiểm chứng, chạy các lệnh sau trong PowerShell.

```powershell
$runtime = (Resolve-Path 'logs/cv-tooling/node-v24.22.3-win-x64').Path
$env:Path = "$runtime;$env:Path"
npm.cmd ci
```

Khởi động Compose trước khi chạy Playwright. Nếu đã tải Chromium vào workspace, dùng đường dẫn dưới đây để chạy lại.

```powershell
$env:PLAYWRIGHT_BROWSERS_PATH = Join-Path (Get-Location) 'logs/cv-tooling/browsers'
npx.cmd playwright install chromium
npm.cmd test
npm.cmd run lint
npm.cmd run typecheck
$env:CV_E2E_BASE_URL = 'http://127.0.0.1:3000'
npm.cmd run test:e2e
```

Phiên bản này dùng dữ liệu minh họa và đặt `noindex`. Quá trình chạy cục bộ chỉ dùng địa chỉ loopback.
