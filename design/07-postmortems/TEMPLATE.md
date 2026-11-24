# RCA: <tên sự cố thật>

Trạng thái: mẫu chưa điền, không phải sự cố đã xảy ra.

## Phạm vi và ảnh hưởng

- Incident ID / môi trường / thời gian UTC và múi giờ người dùng:
- Mô tả trước sự cố / hành vi quan sát / hành vi kỳ vọng:
- Ảnh hưởng UI/API/data/auth/availability; mức chưa xác minh:
- Requirement ID / ADR / approval và scope được duyệt:

## Timeline có bằng chứng

| Thời điểm | Sự kiện thực tế | Session/event/tool/test evidence ID | Độ tin cậy và phần thiếu |
| --- | --- | --- | --- |
| <UTC> | <không suy đoán> | <tham chiếu log local đã làm sạch> | <verified/claimed/unknown> |

## Phân tích nguyên nhân

- Trigger và nguyên nhân trực tiếp có chứng cứ:
- Điều kiện đóng góp; quyết định nào và vì sao được đưa ra:
- Phần prompt mơ hồ, thiếu thiết kế/approval, agent vượt scope, code hoặc test thiếu (chỉ kết luận nếu có bằng chứng):
- Cách tái hiện tối thiểu; giả thuyết đã loại; điều chưa biết:

## Xử lý và phòng ngừa

| Hành động | Scope/ảnh hưởng | Approval | Owner | Regression/acceptance | Trạng thái |
| --- | --- | --- | --- | --- | --- |
| <đề xuất> | <file/module/data> | <chưa/đã duyệt> | <người chịu trách nhiệm> | <test và evidence> | <open/verified> |

## Recovery và kiểm chứng sau sửa

- Rollback/restore đã thực hiện hay chỉ đề xuất:
- UT, integration, Playwright, môi trường/kết quả và blocker:
- Kiểm tra cập nhật nhật ký và đường dẫn bằng chứng nếu sự cố ảnh hưởng đến hồ sơ cục bộ
- Theo dõi tái phạm, rủi ro còn lại, tài liệu/ADR cần cập nhật:

## Kiểm tra dữ liệu nhạy cảm trước chia sẻ

Không credential, cookie, CV riêng hoặc raw prompt dump. Tham chiếu event ID thay vì copy toàn bộ logs; ghi rõ nguồn bị truncate/không có sẵn. Không upload log khi chưa có phép.
