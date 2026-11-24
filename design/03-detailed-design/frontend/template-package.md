# Gói ZIP template

Phiên bản 1 chứa `template.json`, `index.html` và `styles.css` tại gốc ZIP. Có thể thêm `LICENSE` hoặc `LICENSE.txt`, và ảnh PNG/JPEG/WebP dưới `assets/`. Giới hạn tải lên 2 MiB, giải nén 6 MiB và tối đa 60 mục.

Để hiển thị ảnh đại diện từ hồ sơ CV, thêm một thẻ `<img data-cv-portrait class="portrait" width="112" height="112">` trong phần giới thiệu hoặc bên ngoài các khối `data-cv-section`. Bỏ thuộc tính `src` trên thẻ này. Nếu vị trí ảnh nằm trong vùng mà hệ thống tạo lại nội dung giới thiệu, ảnh xuất hiện trước tiêu đề. Nếu hồ sơ chưa có ảnh ở bản đang xem, thẻ ảnh được bỏ qua. Template không khai báo vị trí ảnh vẫn dùng được và việc áp dụng template không sửa hồ sơ. Các ảnh tĩnh trong `assets/` vẫn dùng `src` như trước.

```json
{ "schemaVersion": 1, "name": "Start Bootstrap – Resume" }
```

Khai báo các mục CV `intro`, `projects`, `experience`, `skills`, `education`, `contact` bằng thuộc tính `data-cv-section` trên từng khối. Mỗi mục cần đúng một khối. Nếu gói HTML/CSS thiếu khai báo, admin cho chọn các khối có ID để gán. HTML tĩnh cho phép liên kết fragment. Nội dung, liên kết liên hệ và nhãn điều hướng lấy từ CV của locale đang chọn. CSS được đặt phạm vi bên trong mẫu. Script, URL tài nguyên bên ngoài, ảnh SVG và các thẻ chủ động trả lỗi theo tệp. Dùng kích thước mặc định và responsive CSS trong mẫu cho desktop, tablet và điện thoại.

Gói mẫu [Start Bootstrap – Resume](../../../apps/backend/templates/start-bootstrap-resume.zip) lấy bố cục từ mã nguồn v7.0.6 và giữ giấy phép MIT. ZIP upstream SHA-256 `4DAA985E39F6210620C7AC7CD4F94FB74C560D9030A820B19935D3B84CC09A6A`. ZIP đã chuẩn hóa SHA-256 `FA80F59566B7FFF7838AEEE84402624C858BCDD2A1B6D638A43D6AD1A327F23F`. Đã chuyển điều hướng sang liên kết tĩnh và xếp dự án trước kinh nghiệm. [Nguồn chính thức](https://startbootstrap.com/theme/resume) · [Mã nguồn v7.0.6](https://github.com/StartBootstrap/startbootstrap-resume/tree/v7.0.6).

## Bộ mẫu JSON Resume

Các bố cục [Sidebar](https://jsonresume.org/themes/sidebar), [Elegant](https://jsonresume.org/themes/elegant), [Kendall](https://jsonresume.org/themes/kendall) và [Jake Technical](https://jsonresume.org/themes/jake-technical) được dựng lại bằng HTML/CSS trong `apps/backend/templates/json-resume/` từ bố cục tham chiếu của gallery. [Dự án JSON Resume dùng giấy phép MIT](https://github.com/jsonresume/jsonresume.org#license). Các bản dựng cục bộ dùng mã HTML/CSS của dự án CV và không nhúng package hoặc tài nguyên của gallery.

API quản trị dùng cùng luồng xem trước và áp dụng cho các mẫu. Các mẫu HTML/CSS tương thích có thể xuất ZIP. Lần áp dụng đầu tiên lưu ZIP và nội dung đã kiểm tra vào bảng template hiện có cùng với lựa chọn template trong một giao dịch. Ảnh đã xuất bản xuất hiện ở Sidebar, Elegant và Kendall. Jake Technical không khai báo vị trí ảnh.

Sidebar hiện dùng trực tiếp `jsonresume-theme-sidebar@0.2.14` (MIT) để tạo tài liệu HTML độc lập cho từng ngôn ngữ. Backend chuyển dữ liệu CV sang JSON Resume và áp dụng nhãn tiếng Việt, liên kết điện thoại, ID điều hướng và bố cục một cột dưới 640 px. Font và CSS của renderer giữ nguyên trên desktop. **Xuất HTML** tải bản đã xuất bản của ngôn ngữ đang chọn, có thể chứa ảnh và thông tin liên hệ công khai. Gói ZIP cũ vẫn có trong thư viện với tên **Sidebar (bản dựng)**. Nếu quay về image cũ, chọn lại bản dựng trước khi khởi động image cũ. [Mã nguồn renderer](https://github.com/jsonresume/jsonresume.org/tree/master/packages/themes/jsonresume-theme-sidebar)
