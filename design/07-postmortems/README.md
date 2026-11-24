# Postmortem và cải tiến

Chỉ tạo báo cáo khi có sự cố thật. Không invent timeline, nguyên nhân, mức độ thiệt hại hoặc kết quả test. Mẫu `TEMPLATE.md` là tài liệu versionable đã làm sạch; không copy full log vào báo cáo.

Đặt tên `YYYY-MM-DD-<incident-slug>.md`. Truy vết yêu cầu/ADR/approval/event ID, chỉ giữ snippet tối thiểu đã làm sạch. Phân biệt triệu chứng, giả thuyết, nguyên nhân được chứng minh và phần chưa rõ. Việc sửa lỗi vẫn qua approval gate; report không tự cho phép sửa code/data/live system.

Hành động phòng ngừa phải có người phụ trách, tiêu chí test và trạng thái. Kiểm tra không tái diễn bằng regression test; không kết luận “do AI” hoặc “do prompt” nếu chưa có bằng chứng quyết định cụ thể.
