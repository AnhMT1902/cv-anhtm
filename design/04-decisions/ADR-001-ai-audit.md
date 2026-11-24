# ADR-001: Hồ sơ thiết kế và audit AI cục bộ

> Hồ sơ lịch sử. Phần audit tự động được thay thế từ 22/11/2026 theo [ADR-002](ADR-002-project-journal.md).

Ngày: 20/11/2026. **Đã duyệt**, công cụ đã thực hiện; **chưa nghiệm thu hook desktop tự động** cho tới canary thật.

## Bối cảnh

Cần tìm nguyên nhân lỗi từ chuỗi yêu cầu→đề xuất→approval→thực hiện→test, không chỉ đọc bản tóm tắt cuối. Log phải đủ bằng chứng có sẵn nhưng không lưu reasoning/system/developer, không lộ credential hoặc tự đưa hội thoại lên Git/Docker.

## Quyết định

- `design/` là hồ sơ có thể version; `logs/ai/` chỉ local, giữ vô thời hạn cho đến khi có quyết định retention khác.
- Dùng Node built-ins; không cài package, service hay background watcher. Native transcript chỉ đọc, không sửa/xóa và không chép raw vào project.
- Nguồn đầu vào không phải API ổn định: whitelist record thực tế, định danh session/project và khóa đường dẫn; shape không hỗ trợ phải báo gap/chặn thay vì cố đoán.
- Đồng bộ append-only/idempotent theo event ID; checkpoint prefix/hash phát hiện native source bị sửa/quay lui. Mỗi lần đồng bộ quét lại nguồn để đối chiếu; chưa tối ưu tail-only.
- Làm sạch trong RAM trước mọi ghi event/artifact. Output lớn thành artifact JSON đã làm sạch, tên theo SHA256. Manifest và transcript là file dẫn xuất ghi atomic.
- Lock chống sync đồng thời. Không tự xóa stale lock hoặc sửa log đứt đuôi, vì ưu tiên giữ bằng chứng. Recovery riêng có duyệt.
- Hook ở `.codex/hooks.json`, không sửa global trust/config. PreToolUse deny khi audit lỗi/chưa xác nhận; PostToolUse không thể hoàn tác hành động đã chạy. AGENTS áp dụng cả tool ngoài coverage host.
- UserPromptSubmit/Stop receipt giữ prompt/final khi native chưa flush; đây là bằng chứng hook bổ sung, có thể trùng nội dung native, không giả là tin nhắn mới.
- Stop lỗi chỉ báo trạng thái, không tự yêu cầu continuation vô hạn. Các mutation sau vẫn bị gate và AGENTS chặn.
- Canary phải từ chính desktop: prompt thật, read tool vô hại, final thật cùng turn. Fixture/manual handler không chứng minh host bật hook. Chỉ xác nhận sau khi người dùng duyệt bằng chứng.

## Giới hạn và trade-off

Không tái tạo dữ liệu mà native source không giữ, output đã truncate, attachment bytes hoặc hosted search results không có trong source. Native may grow during sync: checkpoint chỉ bao phủ snapshot đã đọc. Không thể ghi final của chính lượt hiện tại trước khi final được gửi; Stop hook hoặc lần sync tiếp theo bổ sung. Công cụ audit không biết ý định mọi lệnh shell; khi lỗi chỉ allowlist chẩn đoán rất hẹp, phần còn lại deny. Cơ chế host không phải OS sandbox chống agent/chủ máy cố ý bypass.

Hash chain không phải chữ ký/timestamp đáng tin cậy độc lập. Redaction không đảm bảo nhận biết mọi secret lạ; log vẫn nhạy cảm. Trên Windows phải xét ACL riêng. Quét lại lịch sử + kiểm tra artifacts làm tăng chi phí theo kích thước phiên; không claim tail-only hoặc throughput đã benchmark.

## Phương án không chọn

Chỉ lưu summary (thiếu bằng chứng); commit raw transcript (lộ dữ liệu); sửa global Codex (vượt scope); backend log server/SaaS (thêm hạ tầng/upload chưa duyệt); auto-prune/auto-repair (có thể mất bằng chứng); dùng CLI canary thay desktop (không cùng runtime).

## Nguồn kỹ thuật

Tài liệu chính thức được đọc ngày 20/11/2026: `https://developers.openai.com/codex/hooks`. Hợp đồng hiện dùng: `session_id`, `cwd`, `transcript_path`, `hook_event_name`, `turn_id`; PreToolUse deny qua `hookSpecificOutput.permissionDecision`; command hook JSON stdin/stdout, timeout đồng bộ 60 giây. Project hook cần được review/trust bởi host. Native source runtime quan sát `0.169.0-alpha.11.1`, CLI cài máy `0.167.0`; không coi hai runtime đồng nhất.
