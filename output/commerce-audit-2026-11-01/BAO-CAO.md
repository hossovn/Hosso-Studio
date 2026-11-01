# Rà soát WIM – Studio – WordPress/WooCommerce

Ngày: **01/11/2026, giờ Việt Nam**. Phạm vi: tích hợp bán hàng, tồn kho, thanh toán, giao vận và đối soát.

## 1. Kết luận

**Hệ thống hiện có nhiều adapter và cơ chế chống gửi trùng, nhưng chưa có bộ điều phối đủ để xử lý một đơn xuyên suốt các hệ thống.** Thêm một nút gọi các API hiện tại liên tiếp sẽ làm tăng khả năng lệch tồn, thiếu dòng đơn và mất sự kiện tiền về.

Chính sách mới nhất của chủ hệ thống:

1. Khách đặt → **chờ admin duyệt**.
2. Admin bấm **“Xác nhận & xử lý” một lần trong Orders** → backend tự xử lý các hệ thống.
3. Nếu một NCC thiếu hàng: **giữ phần còn hàng, thông báo khách chọn cách xử lý phần thiếu**.
4. Các trạng thái, lỗi và thao tác khắc phục tập trung trong Orders.

Phải sửa nhóm xác thực, bảo toàn đơn/tồn và ghi nhận tiền trước khi bật luồng này. Không cần thay toàn bộ hệ thống: có thể xây bộ điều phối trên nền đơn hàng, hàng đợi và adapter hiện có.

## 2. Phạm vi và mức chắc chắn

- Studio: checkout `5f94f8db207a6bf7c3d79d2887b7f0938ca5402c`, có thay đổi local từ công việc trước. Không coi mọi file local là phiên bản đã deploy.
- Private plugin: `C:/Code/hosso-plugins/packages/plugin-cross-sell`; bốn file `core/service/remote/index` khớp bản mirror Studio tại thời điểm kiểm tra.
- WIM/ERPNext: mã local repo `C:/Code/TCAP-ERPNEXT`, commit `1ce3c04680b295fb5631ee9320b152ef64401ffb`.
- WordPress: adapter REST WooCommerce trong Studio và source Hosso Connector local. **Chưa xác minh plugin, phiên bản, quyền key và cấu hình tồn trên WordPress đang chạy.**
- Đã đọc mã, chạy test hiện có, thêm các bài tái hiện local bằng DB dùng riêng và upstream giả. Không tạo đơn thật, không gửi email thật, không thay tồn thật.
- Đây là rà soát tích hợp có bằng chứng, **không phải chứng nhận đã tìm hết mọi lỗ hổng của hạ tầng và tất cả plugin WordPress**. TLS/proxy/WAF, quyền quản trị thực tế, backup/restore và luồng thật nhiều dịch vụ còn cần nghiệm thu staging.

Nhãn bằng chứng:

- **Tái hiện:** đã chạy một tình huống local cho kết quả được mô tả.
- **Mã nguồn:** xác nhận hành vi/thiếu sót từ mã, chưa khai thác trên site thật.
- **Cần staging:** tác động phụ thuộc phiên bản, cấu hình hoặc plugin bên ngoài.

## 3. Những phần đã làm đúng

- Checkout dùng giá server, token tra cứu riêng, transaction cho tồn hàng Shop và khóa để hạn chế tranh chấp.
- Có khóa checkout riêng, snapshot đơn và cơ chế thử lại nguồn WIM.
- Bán chéo giữ snapshot theo NCC; unique dispatch key hạn chế hai worker gửi cùng phiếu.
- Khi WooCommerce đã nhận POST nhưng phản hồi bị mất, hệ thống tra cứu lại thay vì gửi mù.
- Webhook WooCommerce có HMAC, dùng làm tín hiệu đọc lại dữ liệu; snapshot cũ có kiểm tra thời gian.
- WIM dùng site key riêng, giới hạn đọc đơn theo site, có idempotency và outbox webhook.
- Connector WordPress dùng mã hóa token, kiểm tra nonce/quyền và HTTP client an toàn hơn phía Studio.

Các điểm tốt này cần giữ khi nâng cấp; không bỏ cơ chế chống trùng để đổi lấy thao tác nhanh hơn.

## 4. Phát hiện bảo mật

| ID | Ưu tiên | Phát hiện và điều kiện | Bằng chứng | Khắc phục |
|---|---|---|---|---|
| S01 | Cao | Nhánh Bearer đối chiếu `partnerCredentials(...).key` cho cả partner Woo. Người chỉ có Consumer Key đủ dài được xác thực mà không cần Consumer Secret. Không có nghĩa người hoàn toàn không có key truy cập được. | **Tái hiện**; [service.ts:43](C:/Code/Hosso-Studio/packages/plugin-cross-sell/src/service.ts:43) | Chỉ Hosso token được dùng Bearer; Woo bắt buộc đúng cặp. Tách credential inbound/outbound, cấp scope theo partner. |
| S02 | Cao | Token/Consumer Secret nhập trực tiếp được định nghĩa như text thông thường, không có hook mã hóa/che như cấu hình WIM. DB dump hoặc quyền đọc partner admin có thể lấy giá trị thô. Chưa có bằng chứng lộ cho người ẩn danh. | **Mã nguồn**; [index.ts:58](C:/Code/Hosso-Studio/packages/plugin-cross-sell/src/index.ts:58) | Secret mã hóa trong DB, trả mask; UI chỉ thay/thu hồi; secret manager hoặc env; migration không ghi giá trị vào log. |
| S03 | Cao | Role `publisher` sửa trực tiếp collection Orders: đổi total, paid/completed và lịch sử mà không đi qua command/version; còn xóa được đơn hoàn tất. `admin.readOnly/hidden` không phải kiểm soát quyền API. | **Tái hiện**, Local API với `overrideAccess:false`; [collections.ts:189](C:/Code/Hosso-Studio/packages/plugin-shop/src/collections.ts:189) | Chặn cập nhật trường tài chính/hệ thống ở field/hook server; chỉ nhận command có quyền, version và audit; bỏ delete đơn nghiệp vụ; tách quyền nội dung khỏi vận hành/thu tiền. |
| S04 | Trung bình | Validator URL partner chấp nhận HTTPS private/loopback/link-local. Cần quyền cấu hình hoặc cấu hình bị thao túng; chưa chứng minh truy cập được dịch vụ nội bộ/TLS của production. | **Tái hiện validator, không gửi request**; [core.ts:76](C:/Code/Hosso-Studio/packages/plugin-cross-sell/src/core.ts:76) | Allowlist đích, kiểm tra DNS/IP thực và port, kiểm soát egress; chính sách riêng cho mạng nội bộ có chủ đích. |
| S05 | Cao, có điều kiện | `wimFetch` tự follow redirect và mang custom `X-API-Key` sang origin khác. Nếu upstream/redirect bị cấu hình sai hoặc bị chiếm quyền có thể lộ site key. Proxy ảnh có mẫu fetch tương tự. | **Tái hiện hai HTTP server loopback, key giả**; [client.ts:35](C:/Code/Hosso-Studio/packages/plugin-wim/src/client.ts:35), [payload.ts](C:/Code/Hosso-Studio/packages/plugin-wim/src/payload.ts) | Cấm redirect ở client có credential; nếu cần migration URL thì cấu hình đích mới rõ ràng. Giới hạn kích thước response khi stream. |
| S06 | Trung bình | Tra cứu vận đơn vẫn dựa mã đơn + 4 số cuối điện thoại, trong khi tra cứu đơn Shop đã dùng token mạnh. Endpoint trả trạng thái/mã vận đơn, không trực tiếp trả toàn bộ địa chỉ. | **Mã nguồn**; [shipping/index.ts:142](C:/Code/Hosso-Studio/packages/plugin-shipping/src/index.ts:142) | Dùng quyền truy cập đơn hoặc token tra cứu shipment riêng; giới hạn thử và thống nhất cơ chế truy cập. |
| S07 | Trung bình, cần kiểm tra proxy | Chưa thấy throttle/quota ở các entry checkout và cross-sell inspected. Bot có thể tạo đơn chờ, chiếm giữ hàng và tốn API nguồn; không kết luận WAF hiện tại không có chặn. | **Mã nguồn + cần staging**; [endpoints.ts:215](C:/Code/Hosso-Studio/packages/plugin-shop/src/endpoints.ts:215), [cross-sell/index.ts:303](C:/Code/Hosso-Studio/packages/plugin-cross-sell/src/index.ts:303) | Hạn mức theo client/site/partner, hàng đợi giới hạn, TTL giữ hàng; vẫn cho khách thật đặt nhiều đơn độc lập. |
| S08 | Trung bình | Webhook GHN dùng shared key trong query URL và áp trạng thái nhận được; không thấy inbox/version để chống sự kiện cũ làm lùi trạng thái. Key trong URL có thể xuất hiện ở access log. | **Mã nguồn**; [shipping/index.ts:178](C:/Code/Hosso-Studio/packages/plugin-shipping/src/index.ts:178) | Redact query ở log, credential riêng/rotate; xác thực theo khả năng nhà vận chuyển; webhook là tín hiệu đọc lại, inbox và quy tắc tiến trạng thái. |

Chuẩn tham chiếu: [OWASP SSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html). Chỉ kiểm tra scheme HTTPS chưa đủ để xác nhận đích là dịch vụ được phép.

## 5. Phát hiện luồng nghiệp vụ và độ tin cậy

| ID | Ưu tiên | Phát hiện | Bằng chứng / tác động | Khắc phục |
|---|---|---|---|---|
| F01 | Cao | Gửi NCC là thao tác thủ công riêng trong Bán chéo; scheduler không gửi pending. | **Mã nguồn**; [service.ts:383](C:/Code/Hosso-Studio/packages/plugin-cross-sell/src/service.ts:383). Đây là thiết kế hiện tại, chưa khớp yêu cầu một nút. | Admin approve tạo command/outbox cho từng nhóm NCC. |
| F02 | Cao | Paid/complete trong Orders chưa điều khiển lấy hàng, thu tiền và submit ERP; webhook WIM chủ yếu làm mới cache/affiliate, chưa cập nhật đầy đủ đơn bán lẻ Shop. Đơn web WIM còn phụ thuộc ca POS đang mở. | **Mã nguồn**; [order-operations.ts:23](C:/Code/Hosso-Studio/packages/plugin-shop/src/order-operations.ts:23), [wim/payload.ts:95](C:/Code/Hosso-Studio/packages/plugin-wim/src/payload.ts:95), [public-api.service.ts:265](C:/Code/TCAP-ERPNEXT/WIM/src/wim/public-api.service.ts:265) | Adapter command có quyền và sự kiện WIM → projection đơn Shop. Thiết kế kênh online/ca hệ thống thay phụ thuộc ca quầy khi phù hợp kế toán. |
| F03 | Cao | WIM tạo đơn web nhưng chưa reserve tại lúc nhận ở ca quét mã; reserve chỉ phát sinh khi tạo task lấy hàng. | **Tái hiện:** khả dụng 16 → nhận 2 đơn ×16 → vẫn khả dụng 16, có 2 hóa đơn nháp; [public-api.service.ts:295](C:/Code/TCAP-ERPNEXT/WIM/src/wim/public-api.service.ts:295), [pos-picking.service.ts:171](C:/Code/TCAP-ERPNEXT/WIM/src/wim/pos-picking.service.ts:171) | Reserve nguyên tử tại nguồn khi admin xử lý; pick task sử dụng reservation đó, không giữ lần hai. |
| F04 | Cao | Retry idempotency WIM trả ngay đơn đã link mà không kiểm tra giai đoạn/đủ dòng. | **Tái hiện crash boundary:** HTTP200, yêu cầu 1 dòng, đơn trả 0 dòng; [public-api.service.ts:255](C:/Code/TCAP-ERPNEXT/WIM/src/wim/public-api.service.ts:255) | Lưu stage + expected hash/line count; resume các bước idempotent đến complete, chỉ trả accepted nếu đang dựng. |
| F05 | Cao | Supplier WIM receipt được lưu trước POST. Nếu POST không tới WIM, lần sau thấy receipt chỉ GET rồi báo unknown, không có bước tiếp tục ensure đơn. | **Tái hiện:** 1 receipt, 0 remote orders, retry vẫn không POST; [service.ts:425](C:/Code/Hosso-Studio/packages/plugin-cross-sell/src/service.ts:425), [service.ts:452](C:/Code/Hosso-Studio/packages/plugin-cross-sell/src/service.ts:452) | Durable command state. Với endpoint có idempotency thực ở nguồn, retry ensure bằng đúng key/body; không áp cơ chế này cho raw Woo POST chưa có cam kết tương đương. |
| F06 | Cao | Chưa có trạng thái hoàn tất một phần, lựa chọn khách và compensation cho đơn nhiều nguồn. Một nguồn đã nhận, nguồn sau từ chối thì đơn có thể ở source_pending; không đủ để thực thi chính sách giữ phần còn hàng. | **Mã nguồn**; [endpoints.ts:147](C:/Code/Hosso-Studio/packages/plugin-shop/src/endpoints.ts:147) | Tách group/line quantities; partial acceptance, giữ TTL, customer decision, điều chỉnh tiền và shipment theo revision. |
| F07 | Cao | Woo response chỉ kiểm tra key/currency/tổng và hướng dẫn giao; không đối chiếu product/quantity từng dòng. Hoa hồng Woo còn được tính lại từ snapshot local. | **Tái hiện:** đặt product7 ×1, response product999 ×8 cùng total vẫn được parse; [remote.ts:60](C:/Code/Hosso-Studio/packages/plugin-cross-sell/src/remote.ts:60), [service.ts:311](C:/Code/Hosso-Studio/packages/plugin-cross-sell/src/service.ts:311) | Fingerprint normalized của supplier ID/variation/qty/unit price/currency/tax/shipping/discount; mismatch dừng nhóm, không ghi nhận thành công. |
| F08 | Cao, cần staging | Studio tạo Woo order `pending`, `set_paid:false`; có local reservation nhưng chưa có bằng chứng giữ tồn nguyên tử dùng chung với mọi kênh NCC. GET stock rồi POST đơn có khoảng tranh chấp. Meta key không tự tạo unique constraint ở Woo. | **Mã nguồn + cần staging**; [remote.ts:53](C:/Code/Hosso-Studio/packages/plugin-cross-sell/src/remote.ts:53), [remote.ts:75](C:/Code/Hosso-Studio/packages/plugin-cross-sell/src/remote.ts:75) | Supplier endpoint ensure/reserve có unique key và expiry; xác minh trên Woo thật cả giao dịch mua trực tiếp. Không dùng `set_paid:true` chỉ để ép trừ kho. |
| F09 | Cao | Hủy/hoàn còn rời rạc. Cancel Shop gọi nguồn trong hook; bán chéo cần thao tác riêng, paid/shipped phải đối soát tay. Không có saga xử lý kết quả không rõ, hủy từng phần và bù trừ tiền/tồn. | **Mã nguồn**; [collections.ts:191](C:/Code/Hosso-Studio/packages/plugin-shop/src/collections.ts:191), [remote.ts:106](C:/Code/Hosso-Studio/packages/plugin-cross-sell/src/remote.ts:106) | Command cancel/return/refund độc lập, trạng thái từng bước, giữ nguyên thông tin thực tế; lỗi hiện ngay trong Orders, không giả hủy toàn bộ. |
| F10 | Cao | Bank webhook lưu Payment paid trước rồi emit event; event dispatcher nuốt lỗi. Retry không chọn Payment đã paid, nên consumer cập nhật đơn/ERP có thể mất vĩnh viễn. | **Tái hiện:** webhook200, payment paid, consumer lỗi; replay không gọi consumer lại; [payment/index.ts:109](C:/Code/Hosso-Studio/packages/plugin-payment/src/index.ts:109), [events.ts:8](C:/Code/Hosso-Studio/packages/blocks/src/events.ts:8) | Inbox lưu giao dịch + outbox paid-event trong cùng transaction; consumer ack riêng, retry theo event ID. |
| F11 | Cao | Chuyển khoản nhiều lần ghi đè `paidAmount` và transactionId thay vì cộng sổ giao dịch. Matching giới hạn 500 payment và dùng substring mã đơn cũng cần thay bằng lookup/reference chính xác. | **Tái hiện:** 60k+40k cho đơn100k → recorded40k, underpaid; [payment/index.ts:99](C:/Code/Hosso-Studio/packages/plugin-payment/src/index.ts:99) | Ledger mỗi giao dịch, unique provider/transaction; allocate nhiều khoản cho một đơn; kiểm tra tài khoản/currency, khoản thừa và giao dịch chưa khớp. |
| F12 | Cao | Woo có bất kỳ refund nào được map thành refunded; cross-sell commission là trạng thái nguyên đơn, chưa tính hoàn một phần theo dòng/tiền. Webhook WIM cũng ngừng scan đơn đã terminal nên cần cơ chế riêng cho thay đổi hậu hoàn tất. | **Mã nguồn**; [remote.ts:71](C:/Code/Hosso-Studio/packages/plugin-cross-sell/src/remote.ts:71), [core.ts:72](C:/Code/Hosso-Studio/packages/plugin-cross-sell/src/core.ts:72), [site-webhook.service.ts](C:/Code/TCAP-ERPNEXT/WIM/src/wim/site-webhook.service.ts) | Các số ordered/fulfilled/returned/refunded và commission earned/reversed/paid theo dòng; sự kiện sau hoàn tất + reconciliation định kỳ. |
| F13 | Cao | Shipping có thể tạo GHN ngay khi onOrderPlaced, trước supplier dispatch hoặc WIM picking. Webhook cập nhật Shipment nhưng chưa khép vòng trạng thái retail/payment/COD. Timeout create GHN còn cần kiểm tra idempotency/lookup của nhà vận chuyển. | **Mã nguồn; timeout cần staging**; [shipping/index.ts:268](C:/Code/Hosso-Studio/packages/plugin-shipping/src/index.ts:268), [shipping/index.ts:98](C:/Code/Hosso-Studio/packages/plugin-shipping/src/index.ts:98) | Chỉ tạo shipment khi nhóm đủ điều kiện; ensure shipment theo client key; tách delivered với COD remitted, projection đơn tổng từ các nhóm. |

Tham chiếu WooCommerce: [Order Statuses](https://woocommerce.com/document/managing-orders/order-statuses/) và [Orders REST API](https://developer.woocommerce.com/docs/apis/rest-api/v3/orders/). Trạng thái `pending`, `on-hold`, `processing` có ý nghĩa tiền/tồn khác nhau. Không được đổi trạng thái chỉ để giả lập sự kiện tài chính.

### Hai hướng WordPress phải phân biệt

- **Studio bán hàng của NCC WordPress:** Studio gọi Woo REST API NCC. Đây là hướng khách đang hỏi.
- **WordPress bán hàng nguồn Hosso:** Hosso Connector local nhóm đơn theo NCC và đợi `is_paid()` trước khi gửi Hosso. Nó không tự bổ sung giao thức reserve/idempotency vào API supplier Woo ở hướng thứ nhất.
- Connector đã qua harness local nhưng chưa chạy nghiệm thu WordPress thật; không suy từ “đã có connector” ra “mọi hướng đã tự đồng bộ”.

## 6. Vận hành và chất lượng

| ID | Ưu tiên | Phát hiện | Hướng xử lý |
|---|---|---|---|
| O01 | Trung bình | Job bán chéo xử lý catalogue25/transfer10 mỗi lượt, networking tuần tự; verify từ hook tạo đơn có thể giữ transaction lâu. Woo recovery quét tối đa2.000 đơn khi mất remoteId. WIM webhook bỏ cuộc sau10 lần. Có log/alert từng phần, chưa có màn xử lý chung và SLO. | Hàng đợi riêng, bounded concurrency theo partner; transaction ngắn, outbox; index tra key phía NCC; DLQ có replay, cảnh báo queue age và periodic reconciliation độc lập webhook. Capacity cần đo bằng benchmark, không suy từ số batch ra TPS thực. |
| O02 | Cao cho phát hành tự động | Test hiện có bảo vệ nhiều adapter nhưng chưa là gate cho luồng mới. Test còn xác nhận “sync không tự gửi pending”. CI Studio inspected không chạy một E2E liên dịch vụ với Woo thật + WIM/ERP staging. | Thêm contract suite xuyên repo, E2E nghiệp vụ và fault injection; migration/backward compatibility; release manifest pin mọi dịch vụ/connector theo capability. |

Giới hạn chức năng cần công bố: Woo adapter hiện chỉ simple product, VND; WIM public API chưa có dữ liệu tương thích xe đầy đủ và một số thông tin đang dùng mặc định. Đồng bộ dữ liệu không tự sinh ra thông số thật. Không coi dữ liệu mẫu là thông số đã xác minh từ NCC.

## 7. Kết quả kiểm thử trong lượt rà soát

| Bộ kiểm tra | Kết quả | Giới hạn |
|---|---|---|
| `rtk pnpm --filter @hosso/plugin-cross-sell test` | **50/50** | HTTP/upstream giả; không phải Woo/ERP thật |
| `rtk proxy node scripts/test-product-pool.mjs` | **Qua** các nhóm catalogue/checkout/retry/cancel/migration | Payload thật + SQLite tạm, WIM/NCC giả |
| WIM public API + partner commerce + site webhook | **23/23**, 3 suite | Nest/SQLite thật, ERP giả |
| PHP Connector harness | **Qua** | Stub WordPress/Woo/DB/HTTP |
| Các tình huống audit mới | **10 phát hiện được tái hiện** | Test xác nhận lỗi đang tồn tại, không phải xác nhận đã sửa |

Các ID đã tái hiện: **S01, S03, S04, S05, F03, F04, F05, F07, F10, F11**. S04 chỉ chứng minh validator thiếu chặn, chưa chứng minh kết nối nội bộ.

Chi tiết lệnh, bằng chứng và ma trận nghiệm thu: [QA.md](C:/Code/Hosso-Studio/output/commerce-audit-2026-11-01/QA.md). Thiết kế và thứ tự sửa: [THIET-KE-LUONG-MOT-NUT.md](C:/Code/Hosso-Studio/output/commerce-audit-2026-11-01/THIET-KE-LUONG-MOT-NUT.md).

## 8. Thứ tự xử lý đề xuất

1. **Đóng các đường sai quyền và mất tiền/tồn:** S01–S05, F03–F05, F07, F10–F11. Giữ workflow duyệt hiện tại trong lúc sửa.
2. **Bổ sung giao thức nguồn:** atomic reservation/idempotent commands/lookup/version ở WIM và supplier Woo; inbound credentials có scope.
3. **Bộ điều phối + Orders:** một nút admin, phần còn hàng/thiếu hàng, outbox/inbox và các trạng thái chứng minh được.
4. **Khép vòng tài chính/giao vận:** paid/refund/return/COD, ERP posting, commission và email.
5. **Nghiệm thu liên hệ thống:** crash/retry/concurrency/partial/refund + rolling upgrade; sau đó mới bật automation theo site/NCC.

Không triển khai kiểu “đánh dấu paid/completed tất cả hệ thống sau một lần bấm”. Một nút phải khởi động chuỗi công việc có kiểm soát; tiền nhận, hàng lấy/giao và bút toán ERP phải có bằng chứng hoặc người có quyền xác nhận trong cùng màn Orders.
