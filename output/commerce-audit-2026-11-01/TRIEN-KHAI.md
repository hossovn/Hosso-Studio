# Bản triển khai luồng Orders

Ngày 01/11/2026. Tài liệu này cập nhật trạng thái thực hiện; BAO-CAO.md, QA.md và evidence giữ nguyên làm bằng chứng audit ban đầu.

## Luồng đã có trong mã

Khách đặt → chờ admin → **Xác nhận & xử lý** → hàng đợi bền vững cho từng nguồn → giữ/chốt hàng → chuẩn bị → giao/hoàn tất. Nhận tiền không tự duyệt đơn. Khi thiếu nguồn, giữ phần đủ trong thời hạn cấu hình và yêu cầu khách chọn nhận phần có hoặc hủy qua token riêng. Hết hạn thì hủy/giải phóng, lỗi nguồn chờ đối soát trong Orders.

## Ma trận thực hiện

| Audit | Mã và regression local | Giới hạn nghiệm thu |
|---|---|---|
| S01–S05 | Xác thực đúng loại partner, mã hóa/mask secret, chặn publisher/raw CRUD hệ thống, kiểm tra URL/DNS/IP, cấm redirect credential, giới hạn response | Cần kiểm tra egress/proxy và quyền thực tế từng site |
| S06–S08 | Token riêng cho vận đơn, rate bucket DB cho ingress, GHN đọc lại nguồn và chặn lùi trạng thái | Query webhook legacy còn được nhận; cần redact query trên reverse proxy, ưu tiên header riêng |
| F01, F06 | Admin approve, nhóm nguồn bền vững, lease/retry/CAS, quyết định thiếu hàng, thời hạn chờ hữu hạn | Thiếu theo nhóm; chưa chia lượng một dòng thành nhiều đợt giao |
| F02–F05 | WIM giữ hàng bằng pick task nguyên tử, ca online riêng, phục hồi đủ dòng, ensure theo cùng key/body; dispatch ERP không bịa tiền thanh toán | ERP thật và cạnh tranh với mọi kênh ngoài WIM chưa nghiệm thu |
| F07–F08 | Đối chiếu dòng/tổng Woo; connector NCC có journal tenant/key, native hold, commit và expiry | Chưa chạy Woo/MySQL thật; chỉ hỗ trợ sản phẩm simple và không backorder |
| F09 | Hủy có tombstone/compensation; refund ledger chứng từ tiền ra, chặn vượt số tiền cần hoàn | Trả hàng vật lý sau xuất kho, credit note ERP và hoàn từng dòng chưa tự động hoàn chỉnh |
| F10–F11 | Ledger mỗi khoản tiền vào, exact reference, transaction + outbox, ack riêng từng consumer | Phải xác minh tài khoản/currency và mapping provider thực tế |
| F12 | Giữ nguyên số tiền hoàn một phần, giảm cơ sở hoa hồng theo số tiền; WIM phát thay đổi return sau terminal | Chưa có kế toán hoa hồng/settlement theo từng dòng và COD remittance liên dịch vụ |
| F13 | Local shipment khi sẵn sàng; GHN chỉ sau dispatch, key ổn định khi retry; loại shipment NCC giao trực tiếp | Delivered tách tiền về; chưa tự đối soát bảng kê COD của hãng |

**Không tuyên bố toàn bộ audit đã đóng hay luồng hoàn/trả A–Z đã nghiệm thu.** Các đường chưa có hợp đồng đúng bị chặn và hiện ngoại lệ thay vì ghi thành công giả. Hosso inbound bridge cũ công bố `reservationExpiry:false`, nên không được dùng tự động cho provisional workflow mới; native WIM và Woo supplier connector có đường riêng.

## Kiểm thử đã chạy

- Studio: recursive typecheck, production Next build, manifests, boundaries, i18n, editor preview, site package, Kiln, admin views, checkout identity/form và email receipt.
- Fixture commerce với Payload + PostgreSQL riêng: chưa duyệt không gọi nguồn, duyệt đôi, cạnh tranh đơn vị tồn cuối, mất response, thiếu nguồn/consent, hủy/expiry, nhiều khoản tiền, refund ledger, outbox nhiều worker.
- Migration PostgreSQL: schema toàn ứng dụng, nâng bản cũ, giữ số tiền cũ, không đưa đơn cũ vào automation.
- Cross-sell: 50 bài; WIM commerce/public/partner/webhook: 32 bài (bao gồm 7 regression kho/crash/expiry).
- PHP: lint và connector harness. Chưa có Woo/MySQL hay ERPNext thật cho contract suite.

## Thứ tự phát hành

1. Chụp backup DB + media, xác minh backup đọc được; ghi lại image tag/digest cũ.
2. Build image TCAP từ **commit Studio và private plugins cố định**, không dùng ref trôi để định danh release. WIM/ERP dùng `sha-<commit>` sau CI.
3. Nâng WIM/ERP adapter tương thích. Cập nhật Hosso Connector trên NCC Woo, kích hoạt schema InnoDB và lịch cron thật mỗi phút. Chưa nâng NCC thì Orders hiện ngoại lệ.
4. Studio chạy migration `20261101_180000_order_workflow` qua entrypoint hiện có; cần `HOSSO_ENCRYPTION_KEY` 32 byte (64 hex), giữ nguyên khóa cũ. Secret plaintext được migrate khi khởi động.
5. Kiểm tra `/admin`, catalog và health/readiness. Job `shop-order-recovery`, `commerce-event-delivery`, `cross-sell-sync`, notify cần có runner. Đơn cũ không tự đăng ký workflowVersion 1.
6. Thời gian chờ Studio mặc định 30 phút. Woo NCC phải quảng bá holdMinutes đủ dài; không đủ thì chặn trước POST. Native WIM nhận deadline tuyệt đối và tự hết hạn mỗi 30 giây. Chỉ proxy đáng tin cậy mới đặt `HOSSO_CLIENT_IP_HEADER`.
7. Nghiệm thu dữ liệu thử được cô lập: đặt → chờ duyệt → duyệt → thiếu/đủ → chốt → giao → nhận tiền → hủy/hoàn. Không dùng đơn/tiền thật để thử tự động.

## Khi có lỗi

- Unknown/timeout: giữ command key; dùng **Thử lại** trong Orders. Không xóa đơn hoặc tự tạo đơn nguồn thứ hai.
- Đã xuất/đã trả tiền NCC: không tự tăng tồn hoặc ghi refunded; đối soát chứng từ, lưu kết quả trong Orders.
- Refund chứng từ: chỉ ghi nhận chuyển tiền đã thực hiện, không gọi ngân hàng chuyển tiền tự động.
- Rollback: dừng lệnh mới/runner, giữ nguyên DB, outbox và ledger; chỉ hạ image nếu còn tương thích schema additive. Migration này cố ý không hỗ trợ down phá dữ liệu. Đối soát tác dụng phụ nguồn trước khi chạy lại.
- Không đưa secrets, bản backup, ZIP tạo tự động hay log chứa PII vào Git.
