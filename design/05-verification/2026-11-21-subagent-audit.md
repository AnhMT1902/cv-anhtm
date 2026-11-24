# Recovery audit cho sub-agent

ID: `AUDIT-SUBAGENT-20261121`. Ngày: 21/11/2026, Asia/Saigon.

## Phê duyệt và trạng thái

Nguồn duyệt: người dùng trả lời “mình duyệt nhé” sau đề xuất sửa ánh xạ phiên cha–con, giữ fail-closed, thêm regression và không kế thừa canary. Đây không phải approval scaffold ứng dụng, cập nhật skill global hoặc mở tunnel.

Trạng thái kiểm chứng: **bản cô lập đã kiểm thử**; nghiệm thu desktop với fingerprint mới và sub-agent thật **đang chờ**. Không coi kết quả unit/integration là bằng chứng host đã kích hoạt recovery. Hồ sơ JSON đi kèm ghi hashes và phạm vi promote thực tế.

## Trước và sau

- Trước: phiên chính đã có canary, nhưng cả hai sub-agent requirements/skill bị chặn ngay tool đọc với `SOURCE_SESSION_MISMATCH`. Không có thay đổi ứng dụng hay skill từ các agent đó.
- Bằng chứng tối thiểu: health của host ghi ID cha; metadata con có ID riêng và parent trực tiếp; nguồn cha chứa dispatch native `namespace=multi_agent_v1`, `name=spawn_agent` và result top-level `agent_id` trả đúng con. Chỉ trích các định danh/shape cần thiết, không sao chép native transcript thô.
- Sau trong fixture: chứng minh quan hệ rồi ghi receipt/log theo con; giữ incoming ID trong binding metadata; arbitrary tool vẫn bị chặn cho tới canary riêng của con được xác nhận. Exact-ID và strict `readSource(expectedSession)` vẫn giữ kiểm tra cũ.
- Bảo toàn: không sửa source ID, không bỏ mismatch guard, không tự duyệt canary, không sửa global trust/config hoặc hook definition, không di chuyển/xóa log cũ.

## Phạm vi thực hiện

| File | Thay đổi |
| --- | --- |
| `scripts/ai-audit/source.mjs` | Giữ namespace và trạng thái dispatch; đọc/kiểm tra parent metadata; không xuất context nội bộ |
| `scripts/ai-audit/audit.mjs` | Resolve quan hệ cha trực tiếp bằng dispatch đã kiểm chứng; prefix anchors và revalidation trước receipt append |
| `scripts/ai-audit/hook.mjs` | Dùng audit identity đã resolve cho receipt/diagnostic/gate; không kế thừa activation |
| `scripts/ai-audit/tests/audit.test.mjs` | Regression phiên chính, phiên con, identity, dispatch, corruption, canary và privacy |
| `design/06-operations/ai-audit.md` | Contract, giới hạn, trình tự canary mới và rollback |
| Báo cáo này và `evidence/subagent-audit-*` | Kết quả, hashes, điều kiện nghiệm thu còn thiếu |

Không đổi schema, data CV, auth ứng dụng, dependency, Docker, DNS, VM, tunnel hay global skill. Repo chưa có ứng dụng để build hoặc kiểm tra giao diện.

## Kết quả kiểm thử

| Kiểm tra | Kết quả / giới hạn |
| --- | --- |
| Baseline sandbox | 27/30; ba fixture launcher không khởi động đúng trong sandbox Windows; không coi là pass |
| Baseline ngoài sandbox | 30/30 tests và 10 syntax checks pass |
| Targeted bản cô lập ban đầu | 33 pass, 0 fail, 30 skip do filter tên; không phải full regression |
| Full regression cô lập lần đầu | 62/63; staging thiếu `.gitignore`, không phải lỗi runtime; TAP giữ tại recovery `regression-attempt-1.tap` |
| Full regression cô lập sau bổ sung staging | 63/63 trước các ca namespace/sibling/corruption bổ sung |
| Full regression cô lập cuối | **81/81 pass, 0 fail, 0 skip**, cộng **10 syntax checks**; Node v20.19.6 trên Windows, ngoài sandbox |
| Đọc metadata/parser nguồn con thật | Hai nguồn con bị chặn trước đó: đúng parent ID, 0 partial tail, 0 blocking gaps; không gọi handler thủ công vào live logs |
| Review độc lập | Sub-agent đánh giá đặc tả/code được cung cấp, không dùng tool và không tự chạy tests; góp ý namespace/alias, prefix và ma trận test đã được đối chiếu |
| Desktop canary mới | **Chờ** prompt mới, harmless read, final, receipts và chủ máy xác nhận |
| Sub-agent thật sau promote | **Chờ** kiểm chứng routing, receipt riêng và canary riêng; không khẳng định tool công việc đã mở gate |
| Playwright / app build | **Đã duyệt N/A**: thay công cụ audit, chưa có UI ứng dụng |
| Ubuntu / production | **Chưa chạy**, không deploy |

Nhóm bổ sung bao gồm namespace/tên tool đúng, failed status/error envelope, missing/orphan/order/duplicate/ambiguous dispatch, self/sibling/grandparent, source root/project/parent uniqueness, log và checkpoint corruption, rewrite/truncate/partial tail trước và giữa resolve/commit, append hợp lệ, idempotence, canary parent/sibling không mở con, privacy và tương thích log đã materialize theo normalizer cũ. Các canary được tạo thủ công trong tests chỉ thuộc fixture tạm.

## Evidence và phục hồi

- Baseline code/runbook/TAP/JSON: `logs/ai/recovery/2026-11-21-subagent-audit/before/`.
- Source hashes ban đầu: `logs/ai/recovery/2026-11-21-subagent-audit/baseline-hashes.json`.
- Runtime cô lập và full TAP: `logs/ai/recovery/2026-11-21-subagent-audit/staged/`.
- Evidence versionable riêng dùng prefix `subagent-audit-`; không ghi đè báo cáo bootstrap thành chứng cứ nghiệm thu mới.
- Khi promote, kiểm tra hashes file live vẫn khớp baseline, rồi chỉ thay bốn file mã/test đã duyệt. Kiểm tra SHA256 byte-identical với bản đã test ngay trong thao tác promote. Nếu phát hiện thay đổi ngoài agent, dừng để hỏi người dùng.
- Rollback có kiểm soát từ `before/`, không chép manifest cũ hoặc sửa/xóa events/health/artifacts/native. Giữ fingerprint/canary đúng trạng thái thực, yêu cầu xác nhận mới khi cần.

## Rủi ro và bước nghiệm thu còn lại

Resolver chỉ hỗ trợ quan hệ parent trực tiếp khớp incoming hook ID và shape native đã quan sát trên host này. Nếu host đổi envelope/namespace, nguồn cha chưa flush dispatch, nguồn bị partial hoặc phiên con mang grandparent ID, fail-closed có thể chặn: chờ nguồn thật ổn định hoặc đề xuất cập nhật riêng, không mở whitelist tùy tiện.

Hash/prefix checks không phải chứng thực mật mã của host, không loại bỏ toàn bộ TOCTOU và không chống tác nhân kiểm soát đồng thời native source lẫn audit. Không cam kết full historical coverage hoặc browser/Ubuntu compatibility. Recovery chỉ hoàn tất nghiệm thu host sau khi các bước desktop và sub-agent chờ ở trên có bằng chứng thật và người dùng xác nhận.
