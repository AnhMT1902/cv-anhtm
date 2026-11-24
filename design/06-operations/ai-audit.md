# Vận hành audit AI

> Tài liệu vận hành lịch sử của ADR-001. Các lệnh, đường dẫn công cụ và trạng thái bên dưới ghi lại cơ chế đã ngừng sử dụng. Quy trình hiện hành nằm tại [Nhật ký Markdown cục bộ](project-journal.md).

## Dữ liệu lưu ở đâu

```text
logs/ai/
  hook-health/
    <session-id hoặc unknown>.jsonl  chẩn đoán hook append-only, chỉ metadata
  recovery/
    2026-11-20-hook-recovery/         bản sao trước recovery, giữ nguyên bằng chứng
  <YYYY-MM-DD UTC của session_meta.timestamp>/
    <session-id>/
      events.jsonl       event đã làm sạch, append-only, hash chain
      transcript.md      bản đọc dẫn xuất, có thể tái tạo
      manifest.json      nguồn/checkpoint/coverage/gaps/runtime/activation
      artifacts/         JSON output lớn đã làm sạch, tên SHA256
```

Logs không vào Git và Docker context. Repo hiện chưa được `git init`; ignore được kiểm tra bằng repo tạm chứ không tạo repo thật. Không tự gửi log ra ngoài hoặc tự xóa theo tuổi. Node POSIX mode chỉ là best-effort trên Windows; xem thêm chính sách dữ liệu nhạy cảm.

## Nguồn và những gì được giữ

Importer chỉ đọc native source dưới `$CODEX_HOME/sessions` hoặc `~/.codex/sessions`, xác nhận `session_meta.id`, `cwd` và root project bằng realpath. Tên file đúng session chỉ giúp tìm nguồn, không thay kiểm tra metadata. Không quét nội dung chat khác để tìm thông tin. Session của dự án hiện tại: `01a1f48e-f0fe-7da3-90db-86359dc86993`.

Giữ user text/annotation, assistant commentary/final, tool call/args/result/error có trong nguồn và lifecycle chọn lọc. Không xuất reasoning, system/developer, retained/turn/world context; không nhúng attachment bytes. Trường không hỗ trợ báo gap thay vì đoán. Tool evidence chỉ phản ánh output có trong nguồn; AI nói “test đã pass” chưa đủ nếu không có kết quả tool tương ứng.

Native transcript có thể đổi format; importer không phải API ổn định. Hosted search output có thể không được native lưu; output đã truncate không thể khôi phục. `coverage.ingestionHealthy=true` chỉ nói phần dữ liệu có sẵn được xử lý, **không** khẳng định đủ mọi lịch sử. `gaps` và `historicalCompleteness` mô tả giới hạn.

## Lệnh từ project root

```powershell
node scripts/ai-audit/check.mjs
node scripts/ai-audit/cli.mjs sync --session 01a1f48e-f0fe-7da3-90db-86359dc86993
node scripts/ai-audit/cli.mjs verify --session 01a1f48e-f0fe-7da3-90db-86359dc86993
node scripts/ai-audit/cli.mjs status --session 01a1f48e-f0fe-7da3-90db-86359dc86993
node scripts/ai-audit/cli.mjs canary --session 01a1f48e-f0fe-7da3-90db-86359dc86993
```

Các lệnh CLI hiện đều sync/reconcile trước khi báo cáo; `status`/`canary` không phải read-only và có thể cập nhật log/derived files. Có thể chỉ định `--source <native-jsonl>` nhưng vẫn bị kiểm tra root/session. Khi đứng ở thư mục con, dùng đường dẫn phù hợp đến `cli.mjs`; riêng hook launcher tự tìm root qua ancestor, không yêu cầu Git. Node phải có trong PATH của chính host Codex trên Windows/Ubuntu.

`verify` so nguồn/checkpoint/events/artifacts, tái tạo derived transcript, báo lỗi khi ingestion có blocking gap. Nó không chứng minh desktop hook đã bật hoặc secrets đã được phát hiện hết. Hash chain và snapshot digest hỗ trợ phát hiện hỏng dữ liệu, không phải chống người có quyền sửa mọi file.

## Hook local và canary

Template versionable ở `scripts/ai-audit/hooks.template.json`, được tạo bởi `prepare-hooks.mjs`; cấu hình host ở `.codex/hooks.json`. Không sửa global config/trust. Review nội dung rồi trust bằng cơ chế host hỗ trợ (CLI có `/hooks`; desktop có thể cần reload/review cấu hình). Không dùng CLI test thay bằng chứng desktop. Cấu hình mới/chưa trust/chưa được host load thì chưa bảo đảm tự động ghi.

Events: SessionStart/End, UserPromptSubmit, PreToolUse, PostToolUse, Stop, Interrupt. Handler JSON stdin/stdout đồng bộ. Trong phạm vi AUDIT-RECOVERY-20261120, cấu hình project đặt timeout của SessionEnd và Interrupt là 3 giây, các hook còn lại là 60 giây, theo tài liệu chính thức đã được đối chiếu trực tiếp. Sửa timeout không chứng minh toàn bộ lỗi capture đã được giải quyết. Project root tìm từ cwd, chạy được trong subdir, không dựa Git. `transcript_path` phải ở native sessions; nếu unavailable → fail-closed cho mutation.

`statusMessage` là mô tả dễ đọc khi hook chạy; không cam kết đổi tên tiêu đề trong màn hình review/trust. Sau khi thay định nghĩa hook, người dùng phải review lại nội dung và hash bằng UI của host. Agent không chỉnh global `trusted_hash`. Nếu cần reload cấu hình, người dùng restart ứng dụng rồi resume chính chat hiện tại qua UI; không tự tạo chat mới để thay thế bằng chứng của phiên này.

1. Sau khi host review/trust cấu hình, gửi prompt mới: “Chỉ kiểm tra canary audit: chạy Get-Date, không chỉnh sửa file ứng dụng, rồi trả lời thời gian.”
2. Agent chỉ gọi tool đọc `Get-Date` đúng allowlist, sau đó final. Prompt/tool/final phải là lượt desktop thật.
3. Lượt kế tiếp chỉ đọc manifest (không gọi CLI sync/status khi gate còn đóng): cùng turn phải có UserPromptSubmit → PreToolUse → PostToolUse → Stop và final không rỗng; đối chiếu `recentHookReceipts`, event IDs và nội dung thực tế đã thấy trên UI. Candidate chưa tự trở thành verified. Từ project root Windows, lệnh đọc hợp lệ là `Get-Content logs/ai/2026-11-19/01a1f48e-f0fe-7da3-90db-86359dc86993/manifest.json`; Ubuntu dùng `cat` với cùng relative path. Manifest được đọc là snapshot, không phải một lần verify mới.
4. Người dùng duyệt bằng chứng canary; chủ máy chạy trực tiếp lệnh quản trị sau trong terminal (ngoài agent tool gate đang đóng), thay `<turn-id>` bằng candidate thật. Agent không bypass PreToolUse để tự mở khóa:

```text
node scripts/ai-audit/cli.mjs confirm-canary --session 01a1f48e-f0fe-7da3-90db-86359dc86993 --turn <turn-id>
```

Không tự chạy bước xác nhận khi người dùng chưa duyệt, không tạo receipt giả trong log thật để mở khóa. Synthetic tests chỉ ghi fixture tạm. Trạng thái `user_confirmed_desktop_canary` là attestation có duyệt, không phải chứng thực mật mã của host. Phiên mới cần canary/xác nhận riêng; portable config không chứng minh Ubuntu đã test. Đổi mã importer/handler, cấu hình hook hoặc Node runtime làm mất xác nhận cũ theo fingerprint. Sau thay đổi phải tạo lượt canary mới rồi xác nhận lại, không tái dùng candidate của phiên bản cũ.

## Fail-closed và chẩn đoán

PreToolUse deny công cụ không thuộc diagnostic allowlist khi audit lỗi hoặc chưa xác nhận. Chỉ allowlist các lệnh đơn giản như `Get-Date`, `Get-Location`, `node --version`, `git status --short`, `Get-Content AGENTS.md`; không cho pipeline, shell substitution, redirect hoặc lệnh ghép. Các lệnh sync/repair là thay đổi audit có kiểm soát, cần approval recovery hoặc thao tác người quản trị; không bị giả là lệnh đọc vô hại.

Allowlist cũng cho đọc chính `logs/ai/<ngày>/<session hiện tại>/manifest.json` bằng `Get-Content`/`cat` với path đơn giản, không cho đọc session khác hoặc dùng wildcard/path traversal. Manifest có tóm tắt 12 hook receipts gần nhất để kiểm tra canary mà không cần dump toàn bộ hội thoại.

Diagnostic allowlist mới chỉ bổ sung ba dạng lệnh đọc health sau, thay `<current-session>` bằng đúng ID session hiện tại:

```text
Get-Content logs/ai/hook-health/<current-session>.jsonl
Get-Content -LiteralPath logs/ai/hook-health/<current-session>.jsonl
cat logs/ai/hook-health/<current-session>.jsonl
```

Không mở rộng sang session khác, file `unknown.jsonl`, wildcard, path traversal, lệnh ghép, pipeline, substitution hoặc redirect. Đây chỉ là quyền đọc chẩn đoán, không cho chạy sync/repair/confirm hay manual handler.

Mỗi lượt mới phải đối chiếu receipts UserPromptSubmit/tool đọc mới của chính lượt đó trước mutation. Manifest confirmed cũ không chứng minh host vẫn bật hook; thiếu receipts mới thì dừng và chẩn đoán. Không tự sync thủ công rồi dùng điều đó làm bằng chứng hook đang chạy. Kiểm tra freshness này vẫn dựa vào agent đối chiếu từng lượt; recovery hiện tại chưa bổ sung enforcement đầy đủ trong mã gate.

UserPromptSubmit lỗi đưa cảnh báo/context để vẫn trao đổi chẩn đoán. Stop lỗi đưa systemMessage, không loop continuation. PostToolUse không thể undo side-effect đã chạy. Host có thể không hỗ trợ hook cho mọi đường tool; AGENTS yêu cầu dừng mọi sửa đổi không quan sát được. Cơ chế này không thay sandbox/approval của hệ điều hành.

### Health diagnostics độc lập với receipt/canary

Health worker ghi append-only vào `logs/ai/hook-health/<session-id hoặc unknown>.jsonl`. Mỗi dòng chỉ chứa metadata đã kiểm tra hợp lệ: `schemaVersion`, `timestamp`, `sessionId`, `turnId`, `event`, `status`, `code` và tùy chọn `callId`. Không ghi prompt, tool input/output, final, đường dẫn transcript, raw error hay nội dung riêng tư. Session không xác định/không hợp lệ không được dùng để tạo đường dẫn tùy ý; dùng nhánh `unknown` cho chẩn đoán, không suy diễn đó là session hiện tại.

Các status hiện được triển khai là `received`, `verified`, `failed`; không có enum `denied`. `received` đánh dấu worker nhận lần gọi; `verified` đánh dấu bước verify audit thành công, không phải canary đã được người dùng xác nhận. Khi chưa xác nhận canary, một lần gọi có thể ghi `verified` rồi `failed` với code `DESKTOP_CANARY_NOT_CONFIRMED`; quyết định deny của PreToolUse vẫn được giữ. Phải đọc chuỗi status và safe code của cùng lần gọi, không chỉ tìm một dòng `verified`.

Health không phải hook receipt, không tham gia chuỗi canary và không tự mở gate. Nếu tự gọi handler thì health sinh ra cũng không chứng minh host tự động chạy hook. Không tạo fake receipts hoặc chạy manual handler trong live project để có bằng chứng; synthetic checks chỉ dùng fixture tạm theo phạm vi test đã duyệt.

| Bằng chứng quan sát | Diễn giải và bước tiếp theo |
| --- | --- |
| Không health mới và không receipts mới | Chưa chứng minh host đã khởi chạy hook. Điều tra snapshot cấu hình/trust được host load, launcher và PATH; không kết luận ingestion là nguyên nhân, không tự mở gate. |
| Có `received` rồi `failed` | Dùng safe `code` để xác định giai đoạn lỗi và chẩn đoán ingestion khi code chỉ về ingestion. Nếu đã có `verified` rồi `failed` với `DESKTOP_CANARY_NOT_CONFIRMED`, đó là canary gate chưa xác nhận, không phải bằng chứng ingestion lỗi. |
| Có `verified` và receipts, activation vẫn pending | Hoàn thành prompt → read tool → final thật trên desktop, đối chiếu bằng chứng rồi xin người dùng duyệt. Không auto-confirm. |

### Bằng chứng recovery ngày 20/11/2026

Điều tra read-only đã có screenshot trust mới, kiểm tra được trạng thái của bảy hook ở cấp global và `feature.hooks=true`. Những snapshot này không chứng minh worker thực sự chạy. Trong lượt `Get-Date` lúc 17:27 ngày 20/11/2026 (UTC+07), manifest chính vẫn có `updatedAt=2026-11-20T08:54:19.370Z` (15:54:19.370 UTC+07 cùng ngày). Các runtime log được chọn không có lỗi thực thi hook thực tế; không được suy rộng thành mọi runtime log đều không có lỗi. Nguyên nhân activation chính xác vẫn **UNCONFIRMED**.

Đối chiếu nguồn read-only do luồng điều tra chính cung cấp: `readSource` trả 1.586 records, 467 visible events, prefix hash khớp checkpoint đã lưu, `pendingTailBytes=0`, không blocking gap; chỉ có các gap nonblocking đã biết về hosted output, truncation và attachments. Không chạy live sync/manual handler và không tạo receipt thực tế trong phép đối chiếu này. Kết quả không tái hiện lỗi đọc/format/prefix integrity của nguồn hiện tại; không loại trừ lỗi thoáng qua trong lịch sử và không chứng minh hook tự động hoạt động.

Recovery này có phạm vi audit/launcher/config hook cấp project/test/runbook, không sửa ứng dụng hoặc global config. Ngoài freshness còn dựa vào agent, hai giới hạn đánh giá trước vẫn **chưa được sửa trong phạm vi này**: receipt quá lớn chuyển sang artifact có thể mất khả năng tạo candidate, và thiếu chẩn đoán field bắt buộc theo từng event. Không coi thay timeout, statusMessage hoặc health diagnostics là hoàn thành thiết kế rộng hơn. Kết quả test và nghiệm thu desktop được tổng hợp riêng khi có bằng chứng; tài liệu này chưa chốt số lượng test hay tuyên bố capture đã phục hồi.

## Recovery và rollback không mất bằng chứng

- Lock timeout: dừng mutation, đọc PID/timestamp; xác minh process thực sự đã chết. Không auto-delete lock. Đề xuất và duyệt thao tác lock recovery cụ thể trước khi làm.
- Partial line nguồn: chờ native flush, sync lại; không cắt/sửa native file. Malformed/unknown shape: giữ log, bổ sung parser + regression test có duyệt; không đánh dấu bỏ qua để mở gate.
- Append đã thành công nhưng manifest chưa ghi: lần sync tiếp theo nhận event ID và tái tạo derived files, không duplicate.
- `events.jsonl` partial/corrupt, rewind hoặc artifact hỏng: fail closed. Không truncate/ghi đè/xóa; giữ bản gốc và bản sao an toàn ngoài Git theo approval, điều tra và khôi phục từ nguồn đã xác minh hoặc mở audit lineage mới có liên kết bằng chứng.
- Rollback công cụ: review/disable riêng hook project bằng cơ chế host hoặc đổi cấu hình đã duyệt; giữ nguyên `logs/ai` và native source. Không tự xóa log để test chạy lại. Khôi phục code/config không tự làm dữ liệu cũ hợp lệ.
- AUDIT-RECOVERY-20261120: giữ các bản sao trước thay đổi trong `logs/ai/recovery/2026-11-20-hook-recovery/`, gồm `ai-audit.md.before`. Rollback chỉ khôi phục các bản gốc đã được duyệt đúng phạm vi; không ghi đè/xóa log, health diagnostics hoặc bằng chứng recovery. Sau khôi phục, người dùng review lại định nghĩa/hash hook qua UI; agent không chỉnh global `trusted_hash`, và rollback không tự xác nhận canary hoặc mở gate.
- Không thể hoàn tác credential đã lộ chỉ bằng sửa log; phải xin phép xử lý/rotate credential đúng hệ thống và đánh giá bản sao liên quan.

Sau mỗi recovery cần UT/integration, native reconcile và canary lại nếu hook/contract thay đổi. Không khẳng định full coverage trong thời gian hook bị tắt hoặc lỗi.

## AUDIT-SUBAGENT-20261121: định danh phiên cha và phiên con

Người dùng đã duyệt phạm vi recovery riêng sau khi hai agent chỉ đọc bị `SOURCE_SESSION_MISMATCH`. Trên host đang dùng, hook của agent con mang `session_id` của cha nhưng `transcript_path` trỏ tới nguồn của con. Nguồn native con khai báo `source.subagent.thread_spawn.parent_thread_id`; nguồn cha có cặp dispatch thật với `name=spawn_agent`, `namespace=multi_agent_v1` và kết quả `agent_id` tương ứng. Đây là bằng chứng quan sát trên bản host hiện tại, không phải cam kết cho mọi bản Codex.

### Ràng buộc định tuyến

- Đường exact-ID giữ kiểm tra session/project/source hiện hữu. Không sửa ID nguồn hoặc dùng ID từ tên file để vượt kiểm tra metadata.
- Khi ID khác nhau, chỉ nhận quan hệ cha trực tiếp khớp incoming hook ID. Cả nguồn cha và con phải thuộc native source root được phép, có cwd nằm trong project đã canonicalize. Không suy sibling/grandparent; không tìm nguồn thay thế khi nguồn con được hook chỉ định bị lỗi.
- Nguồn cha phải duy nhất, vượt kiểm tra audit/checkpoint và có đúng một cặp native tool call/result theo thứ tự, cùng `callId`. Tool phải đúng namespace/tên đã quan sát; không nhận alias chưa được xác thực, JSON trong message, result orphan, failure, duplicate hoặc ambiguous dispatch. Result thành công có top-level `agent_id` khớp con; các trường ngoài `agent_id`/`nickname` bị chặn để không coi error envelope là success.
- Resolver giữ prefix byte/hash của hai nguồn. Trước append receipt, trong lock project, kiểm tra lại child metadata, hai prefix và dispatch cha. Rewrite/truncate, blocking gap, partial tail hoặc dispatch mới gây mơ hồ đều chặn. Append hoàn chỉnh giữ nguyên prefix được phép.
- Đây là kiểm tra toàn vẹn tại các bước quan sát, không phải file locking nguyên tử chống một tác nhân sửa nguồn ngay sau kiểm tra. Người có quyền sửa đồng thời native source và toàn bộ audit vẫn nằm ngoài khả năng chứng thực của hash chain cục bộ.

### Log và canary

- Receipt và native visible events của con nằm trong `logs/ai/<ngày UTC bắt đầu con>/<child-id>/`. Không chép nội dung parent/sibling không liên quan vào log con. Không xuất system/developer, reasoning hoặc native metadata thô.
- Receipt con có `data.sessionBinding` do resolver tạo: incoming `hookSessionId`, parent đã đối chiếu và `spawnCallId`. Payload không được cung cấp hoặc ghi đè binding nội bộ.
- Health vẫn dùng incoming `session_id` của host, nên health của lần gọi agent con có thể nằm trong file của cha. Health không phải bằng chứng sở hữu log hoặc xác nhận canary; cần đối chiếu receipt trong manifest con.
- `diagnosticRead` sau định tuyến dùng ID con. Chỉ các diagnostic chính xác trong allowlist được phép khi gate chưa mở; ghép lệnh/pipeline không được phép. Diagnostic khi ingestion lỗi không tạo bằng chứng thành công để mở gate.
- Con luôn bắt đầu với canary riêng; xác nhận cha hoặc sibling không mở gate con. Không tự chạy `confirm-canary`, tạo receipts trong live logs, hoặc sửa trạng thái activation để tiếp tục làm việc.
- Thay mã parser/handler/audit đổi fingerprint của cả phiên đang dùng mã đó. Sau promote, cần một lượt prompt mới → `Get-Date` → final dưới fingerprint mới; lượt đang sửa mã không đủ vì prompt đã mang fingerprint cũ. Chủ máy chỉ xác nhận candidate thật sau khi xem bằng chứng. Sau đó kiểm tra một sub-agent thật bằng quy trình tương tự và xác nhận riêng nếu cần giao tool không thuộc diagnostic.

### Kiểm chứng và khôi phục

Mã được kiểm thử trong runtime cô lập ở `logs/ai/recovery/2026-11-21-subagent-audit/staged/` trước khi promote. Xem `../05-verification/2026-11-21-subagent-audit.md` và evidence riêng; không coi fixture canary là desktop canary. Mã nguồn/log cũ không được viết lại để thêm namespace; parser dùng namespace của nguồn native hiện tại khi kiểm chứng dispatch.

Bản trước thay đổi nằm ở `logs/ai/recovery/2026-11-21-subagent-audit/before/`, kèm baseline hashes và bằng chứng. Rollback chỉ khôi phục các file audit/runbook đã thay từ bản này, sau khi kiểm tra không ghi đè chỉnh sửa mới của người dùng. Giữ nguyên mọi events, artifacts, nguồn native, diagnostics và bằng chứng recovery. Không rollback trạng thái manifest bằng cách chép file cũ; code rollback cũng có thể cần canary/xác nhận lại theo fingerprint.
