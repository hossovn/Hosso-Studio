# Bằng chứng kiểm thử và kế hoạch nghiệm thu

Ngày 01/11/2026. Phạm vi/revision xem [BAO-CAO.md](./BAO-CAO.md). Luồng đích xem [thiết kế](./THIET-KE-LUONG-MOT-NUT.md).

## 1. Đã chạy trong lượt rà soát

Các lệnh dưới đây đã chạy local. Dữ liệu synthetic, DB tạm, upstream giả hoặc loopback. Không dùng tài khoản production để tạo đơn, chuyển tiền, gửi email hay đổi tồn.

### Studio — `C:/Code/Hosso-Studio`

```powershell
rtk pnpm --filter @hosso/plugin-cross-sell test
rtk proxy node scripts/test-product-pool.mjs
rtk proxy node .tmp/audit-commerce-security.mjs
rtk proxy node .tmp/audit-commerce-payload.mjs
rtk proxy node .tmp/audit-wim-receipt.mjs
```

| Bộ | Kết quả đã quan sát | Giới hạn |
|---|---|---|
| Cross-sell | 50/50 | HTTP mock; không phải Woo thật |
| Product pool | Qua các nhóm catalogue/checkout/retry/cancel/migration | Payload + SQLite tạm; WIM/NCC giả |
| Security reproductions | Exit 0; 6 ID tái hiện | S04 chỉ validator; redirect dùng key giả |
| Payload access reproduction | Lượt cuối exit 0; S03 update và delete qua `overrideAccess:false` | Role publisher giả lập trong Local API, không dùng admin bypass |
| WIM supplier receipt | Exit 0; F05 tái hiện | POST bị ngắt trước nguồn nhận; fixture upstream giả |

Lượt đầu của Payload harness báo exit 1 sau khi assertion đã hoàn tất; chạy lại đã exit 0. Đây không phải full CI/build toàn monorepo và không chứng nhận mọi thay đổi local trước đó.

### WIM — `C:/Code/TCAP-ERPNEXT/WIM`

```powershell
rtk npm test -- --runInBand --runTestsByPath test/wim-public-api.e2e-spec.ts test/wim-partner-commerce.e2e-spec.ts test/wim-site-webhook.e2e-spec.ts
rtk npm test -- --runInBand --runTestsByPath test/commerce-audit-20261101.spec.ts
```

- Ba suite có sẵn: **23/23**.
- Hai tình huống audit mới: **2/2 tái hiện lỗi F03/F04**.
- Dùng Nest, DB encrypted SQLite tạm và fake ERP. Không chứng minh cấu hình/migration ERP production.

### Hosso Connector — `C:/Code/hosso-plugins/packages/hosso-connector/hosso-connector`

```powershell
rtk proxy php test/connector.test.php
```

Qua harness validation/encryption/multisupplier/idempotency/dispatch/timeout/refund/checkout guards với PHP 8.3.33. WordPress/Woo/DB/HTTP được stub; chưa chạy plugin trong WordPress thật. Không chứng minh contract supplier Woo đã được triển khai.

## 2. Mười phát hiện đã tái hiện

| ID | Dữ kiện đầu vào | Kết quả hiện tại được test khẳng định | Kỳ vọng sau sửa |
|---|---|---|---|
| S01 | Woo partner có CK/CS synthetic; chỉ gửi CK qua Bearer | Xác thực được | Woo bắt buộc cặp key/secret; Bearer chỉ đúng loại credential và scope |
| S03 | Publisher update/delete đơn qua Payload, `overrideAccess:false` | Đổi total/paid/completed, xóa lịch sử/version; xóa đơn hoàn tất | API từ chối trường hệ thống và delete; dùng command có quyền/version/audit |
| S04 | HTTPS loopback/private/link-local | Validator chấp nhận cả ba; không gửi request | Theo allowlist/DNS/IP policy; private exception tường minh |
| S05 | WIM URL loopback redirect sang origin khác | Server đích nhận `X-API-Key` giả | Không gửi key ra đích redirect |
| F03 | Khả dụng 16; hai đơn web tuần tự mỗi đơn 16 | Cả hai được nhận; khả dụng vẫn 16; 2 ERP drafts | Tổng reservation mọi kênh không vượt khả dụng; đơn sau thiếu/rejected đúng policy |
| F04 | Persist link order rồi giả crash trước addLine | Retry HTTP 200 nhưng 0 dòng cho yêu cầu 1 dòng | Resume đủ dòng hoặc báo in-progress, không false success |
| F05 | Receipt đã lưu, POST chưa đến WIM | Retry chỉ GET; 0 đơn nguồn, không tiếp tục tạo | Idempotent ensure phục hồi với cùng key/hash |
| F07 | Đặt product7 ×1; response product999 ×8 cùng tổng/key | Parse chấp nhận | Mismatch dòng/snapshot bị từ chối và đối soát |
| F10 | Lưu Payment paid xong consumer lỗi; replay webhook | Provider nhận 200, consumer không được gọi lại | Durable outbox còn chờ và retry consumer đến ack |
| F11 | Đơn 100k nhận hai khoản 60k + 40k | Chỉ recorded40k, underpaid | Hai ledger rows, tổng allocated100k, paid; replay không cộng thêm |

**Các test audit hiện xanh vì chúng khẳng định lỗi đang tồn tại. Chúng không phải regression xác nhận đã sửa.** Khi khắc phục, chuyển assertion sang kỳ vọng ở cột cuối và đưa vào suite chính.

### Bằng chứng lưu lại

- [security-reproductions.json](./security-reproductions.json): kết quả sáu ID S01/S04/S05/F07/F10/F11.
- [wim-receipt-reproduction.log](./wim-receipt-reproduction.log): F05.
- [evidence/](./evidence/): bản chụp bốn script/spec tái hiện; đối chiếu SHA-256 trong manifest. Bản chụp phục vụ lưu bằng chứng; muốn chạy phải đặt lại vào vị trí gốc được ghi trong manifest vì import tương đối theo repo.
- S03 và F03/F04 còn được mô tả cụ thể trong bảng trên; không có log runtime đầy đủ riêng lưu tại đây. Lệnh/spec cho phép tái lập trong môi trường local tương ứng.

## 3. Ma trận bắt buộc cho luồng admin một nút

Đây là kế hoạch nghiệm thu **chưa chạy đầy đủ**. Dùng staging và dữ liệu riêng, có phiên bản Woo/plugins/ERP/Studio pin rõ.

| Nhóm | Tình huống | Điều kiện đạt |
|---|---|---|
| Duyệt | Khách đặt WIM/Woo/giỏ hỗn hợp; không admin duyệt | Không dispatch/reserve/shipment ngoài policy; không paid/completed giả; email chỉ tiếp nhận |
| Một nút | Admin duyệt; double-click; hai admin cùng revision; reload request | Một kế hoạch/command mỗi revision; mọi nhóm tự chạy; quyền actor và version đúng |
| Khách đặt thêm | Cùng khách tạo nhiều đơn hợp lệ | Đơn độc lập, không bị khóa vì đơn trước; throttle chỉ chặn lạm dụng |
| Kho WIM | Hai web, web + POS, ERP/kênh khác tranh hàng cuối | Không vượt nguồn khả dụng; reservation dùng chung hoặc có giới hạn phân bổ bảo đảm; không tồn âm |
| Kho Woo | Studio + khách mua trực tiếp Woo cùng SKU/variation cuối | Giữ tồn nguyên tử thật, đúng behavior plugin/version; expiry/cancel release đúng một lần |
| Crash | Dừng tiến trình sau mỗi durable boundary: receipt, link, addLine, reserve, remote POST, local save, event ack | Retry tiếp tục đúng bước; không đơn rỗng/trùng/giữ đôi; unknown được đối soát |
| Key/body | Replay cùng key/cùng body; cùng key/body khác; hai tenant trùng key | Replay cùng kết quả; body khác bị từ chối; không lẫn tenant |
| Hỗn hợp | WIM thành công, Woo hết; một NCC timeout; thiếu một phần số lượng | Giữ phần đủ; phân biệt thiếu/unknown; không tự hủy nhóm khác; thông báo và chờ lựa chọn khách |
| Khách quyết định | Nhận phần có hàng/chờ/yêu cầu hủy; link hết hạn hoặc dùng lại | Quyền đúng đơn; revision mới có consent; không thực hiện hai lựa chọn; tổng/phí/tiền hoàn đúng |
| TTL | Khách im lặng; worker dừng khi reservation hết hạn; NCC expiry chậm | Không giữ vô hạn; gia hạn có giới hạn; không release hàng đã pick/ship; lỗi hiện Orders |
| Giá | Nguồn tăng giá, đổi thuế/phí/variation sau đặt | Dừng chờ consent khi ảnh hưởng khách; không tăng thu âm thầm; không dùng dữ liệu mẫu làm dữ liệu xác minh |
| Thanh toán | Một lần, nhiều lần, thiếu/thừa, duplicate, sai currency/tài khoản, reference gần giống | Ledger chính xác; không substring match nhầm; tiền chưa khớp vào đối soát; không lost paid event |
| Trước duyệt | Tiền thật về khi đơn còn chờ admin | Lưu tiền; không tự dispatch thay admin; từ chối đơn tạo refund work đúng quyền |
| Giao hàng | Nhóm chưa đủ, nhiều kho/NCC, timeout tạo vận đơn, duplicate webhook | Shipment chỉ khi đủ điều kiện, không trùng; đúng địa chỉ/kiện/phí; không giả shipped |
| COD | Delivered nhưng hãng chưa chuyển tiền; chuyển thiếu/thừa | Delivered tách COD remitted, công nợ đúng; không paid chỉ vì đã giao |
| Hủy/hoàn | Trước giữ/sau giữ/sau pick/sau ship/sau paid; hủy/hoàn từng dòng | Bù trừ theo trạng thái thật, không tăng tồn hai lần; refund có chứng cứ; phần còn lại tiếp tục đúng |
| ERP | SI update_stock so với đường chứng từ kho riêng; retry submit/return | Chính xác một đường posting cho mỗi lượng xuất/nhập; đúng công ty/kho/UOM; draft không coi là đã trừ sổ |
| Affiliate | Hoàn một phần trước/sau chi, đơn nhiều NCC, phí/thuế, kỳ chi | Snapshot policy; earned/reversed/payable/paid chính xác; lịch sử không bị xóa |
| Webhook | Duplicate, out of order, stale, giả mạo, sai tenant, sau completed | Inbox/idempotency/version đúng; không lùi trạng thái; đọc lại nguồn; nhận được hoàn hậu hoàn tất |
| Quyền | Publisher/raw CRUD; admin khác site; operator không có quyền tài chính | Từ chối server; không đổi tiền/hệ thống/audit/delete; mọi command có actor |
| Secret/SSRF | Redirect, DNS đổi IP, IP private, log URL/query, export DB | Key không chuyển origin, đích theo policy; mask/encryption/redaction; không lộ PII/secret |
| Chịu lỗi | 429/5xx, mất mạng từng bên, worker lease hết, worker cũ sống lại | Backoff/bounded concurrency, fencing đúng; không ghi đè thành công; DLQ có replay |
| Đối soát | Webhook mất hẳn; remote thay đổi sau terminal; mất remoteId | Job tìm bằng index/key và sửa projection có audit; không quét giới hạn rồi tạo trùng |
| Phát hành | Adapter cũ, migration đang chạy, rolling upgrade, rollback khi command dở | Capability gate; không tự chạy pending cũ; outbox/ledger còn nguyên và reconcile được |
| Thông báo/UI | Desktop/mobile, chờ/partial/error, mail retry | Một nút dễ hiểu; timeline/nhóm hàng rõ; không lộ mã bảo mật; không gửi trùng theo event |

## 4. Các bất biến phải đo được

1. Chưa duyệt → không có tác dụng phụ dispatch/reservation/shipment do orchestration mới. Tiền thật đến vẫn được ghi sổ.
2. Mỗi `(tenant, commandKey, revision)` chỉ có một tác dụng phụ nghiệp vụ tương ứng; khác body không được tái sử dụng key.
3. Tổng lượng giữ/đã cấp phát không vượt khả dụng nguồn; mọi đường bán cùng tham gia kiểm soát hoặc có phân bổ độc lập đã bảo đảm. Không cộng reservation hai lần khi pick.
4. Số lượng đã giao/hủy/trả/hoàn không vượt giới hạn dòng theo quan hệ nghiệp vụ; hủy trước giao và trả sau giao được phân biệt.
5. Tiền đơn tổng khớp phân bổ nhóm, thuế/phí/giảm giá theo cùng currency và quy tắc làm tròn. Ledger không mất/ghi đôi giao dịch.
6. Paid/completed/refunded chỉ xuất hiện khi có bằng chứng đủ điều kiện; payment received không đồng nghĩa supplier settled/COD remitted.
7. Transaction đơn/outbox không có khoảng commit làm mất event; consumer lỗi vẫn có công việc chưa ack.
8. Mọi tác động ngoài có correlation ID, actor/nguồn xác thực, tenant, command key và kết quả. Không xóa chứng cứ để “reset”.
9. Không lộ secret/PII ngoài scope; publisher không có quyền tài chính; quyết định khách không thể đoán bằng mã đơn + điện thoại.

## 5. Cổng phát hành

- Các regression của 10 ID tái hiện chuyển sang khẳng định hành vi đã sửa và đều qua.
- Contract suite chạy trên WIM/ERP và Woo thật với phiên bản/plugins được pin; có cạnh tranh kho giữa các kênh và restart/crash.
- Full E2E: khách đặt → không tự gửi → admin một nút → giữ/chuyển → giao/thu tiền → ERP/hoa hồng/hoàn một phần đúng.
- Có migration, unique indexes, capability và feature flag; chạy dry-run reconciliation đơn cũ, không tự phát lệnh hàng loạt.
- Có metric/cảnh báo, DLQ và runbook xử lý unknown, restore/rollback được thử với dữ liệu riêng.
- Bật theo site/NCC đủ khả năng. NCC legacy hiện ngoại lệ trong Orders và không được gắn nhãn tự động hoàn chỉnh.

Chưa có kết quả staging/liên dịch vụ cho các cổng trên trong lượt audit này. Không dùng số test local xanh thay cho nghiệm thu luồng thật.
