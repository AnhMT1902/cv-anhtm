# Kết quả bootstrap tài liệu và audit

Ngày thực hiện: 20/11/2026, Windows, Node v20.19.6. Phạm vi nghiệm thu: **tài liệu/công cụ audit**, không phải ứng dụng CV.

## Trước và sau

- Trước: có AGENTS.md với yêu cầu đã duyệt; chưa có ứng dụng, thư mục design hoặc audit tooling.
- Sau: có hồ sơ phân cấp `design/`, ID/ADR/approval-event traceability, quy trình agent, test strategy, runbook và mẫu RCA; có importer Node built-ins, project hook config và log đã làm sạch từ nguồn thật.
- Giữ nguyên stack và các yêu cầu đã chốt; không tạo app, schema/ERD giả, migration, Docker services, VM, tunnel, DNS, dependency hoặc thay config/skill global.
- Thay đổi trạng thái dữ liệu chỉ là log local/derived reports và file tài liệu/công cụ. Không sửa native transcript. Không init Git repo của dự án.

## Kết quả có bằng chứng

| Kiểm tra | Kết quả | Bằng chứng |
| --- | --- | --- |
| Unit/integration audit | **16/16 đạt**, không skip | `evidence/audit-tests.tap` |
| Node syntax | **9 file .mjs đạt** | `evidence/audit-checks.json`; có SHA256 source và TAP |
| Filter/privacy/idempotence/concurrency/recovery/path guards | Đạt trên fixtures tạm | Test suite; không phải chứng nhận loại bỏ mọi secret |
| Portable launcher | Đạt trên Windows từ subdir không có Git; stdin→deny JSON | Test process thật, handler synthetic; chưa phải desktop E2E |
| Git ignore | Đạt trong repo Git tạm; log/secret bị ignore, design không bị ignore | Test suite; project thật không có `.git` |
| Docker ignore | Assertion quy tắc loại logs/secrets đạt | Test suite; **chưa build Docker image** |
| Native backfill/reconcile | **Đạt với phần nguồn có sẵn**, sync thứ hai thêm 0 event | `evidence/native-reconciliation.json` |
| Project hook installation | Config `.codex/hooks.json` khớp template SHA256 | Native reconciliation report; không thay global trust |
| Desktop hook tự động/canary | **Chưa kiểm chứng**, cần user review/trust + prompt/tool/final thật | Manifest `pending_real_desktop_canary`, chưa có candidate |
| Playwright/UI | **N/A đã duyệt** cho bootstrap không có ứng dụng | Kế hoạch test, không dùng thay test UI tương lai |
| App build/typecheck | **N/A**, chưa scaffold | Không có package/app |
| Ubuntu/Proxmox/tunnel/backup restore | **Chưa chạy** | Ngoài phạm vi đợt này |

Lần chạy trong sandbox Windows bị EPERM khi Node khởi động module fixture dưới `%TEMP%`; một thử nghiệm copy đệ quy cũng chạm ancestor không được phép. Đã thu hẹp copy fixture vào đúng các file cần và chạy lại validation ngoài sandbox với approval. Kết quả 16/16 là lần chạy ngoài sandbox; không báo sandbox đã pass. Các lần fail thật còn trong tool evidence nguồn, không xóa để tạo lịch sử đẹp.

## Snapshot native đã đối chiếu

`evidence/native-reconciliation.json` ghi thời điểm snapshot, checkpoint/hash, số event duy nhất và số lượng từng kind. Sync lặp trong cùng lần kiểm chứng thêm **0 event**. Nguồn tiếp tục tăng sau snapshot; không dùng một con số mô tả cố định thay checkpoint đã ghi trong report.

Coverage là **available_with_gaps**, ingestion healthy: có hosted tool result không được native source lưu, output bị truncate và tool result hiện chưa phát ra; số lượng cụ thể nằm trong `gapCounts`. Đây là giới hạn nguồn/turn đang chạy, không được diễn giải thành “đã lưu đủ mọi thứ”. Final của chính lượt bàn giao chưa tồn tại lúc snapshot; cần Stop hook đã hoạt động hoặc sync tiếp theo để nhập.

## Phần còn lại trước khi mở gate sửa ứng dụng

1. Chủ máy review/trust hook project trong chính host desktop; không tự sửa global trust.
2. Chạy lượt canary thật theo `../06-operations/ai-audit.md` (prompt mới → `Get-Date` → final).
3. Kiểm tra receipts cùng turn và gap; người dùng duyệt, rồi chủ máy xác nhận candidate bằng lệnh quản trị trong runbook. Không dùng fixture hoặc CLI session thay desktop.
4. Chỉ sau đó mới đề xuất/duyệt scope code ứng dụng; mọi scope/rủi ro mới vẫn cần approval.

## Rollback

Nếu cần rollback, đề xuất/duyệt disable riêng project hook và khôi phục công cụ/tài liệu liên quan; **giữ nguyên logs và native source** để điều tra. Không tự xóa lock/corrupt tail/event/artifact. Runbook phân biệt recovery dẫn xuất tự động với sửa bằng chứng gốc cần approval riêng.

Kết luận: tài liệu, importer và synthetic tests đã thực hiện/kiểm chứng theo giới hạn nêu trên. **Chưa nghiệm thu hoàn toàn cơ chế tự động trên desktop**; không triển khai sản phẩm hoặc hạ tầng.
