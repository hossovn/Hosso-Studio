# Hệ sinh thái Hosso: kiến trúc và lộ trình

17/10/2026 · Nguyễn Đình Tâm

## 1. Tóm tắt

Hosso bán WIM theo hợp đồng, rồi dùng Kiln dựng và chăm sóc web bán hàng Hosso Studio trên máy chủ của khách. Thiết kế miễn phí và Store chỉ làm sau khi phần triển khai trả phí đã có khách.

Các quyết định chính:

- **Triển khai:** khách mua VPS ở nhà cung cấp bất kỳ rồi chạy một lệnh cài do Kiln cấp. Nhà cung cấp có API thì Kiln tạo máy luôn, nhưng hệ thống không phụ thuộc vào điều đó.
- **WIM:** mỗi khách một instance riêng (DB và khóa riêng), chạy trong namespace riêng trên cụm Kubernetes của Hosso. Giai đoạn đầu cụm chỉ có một server.
- **Quyền vào máy khách:** Kiln không giữ khóa SSH. Agent trên máy khách chủ động kéo lệnh từ Kiln và chỉ chạy các lệnh cố định đã ký.
- **Thanh toán:** khách dùng tài khoản cổng thanh toán của chính họ. Tiền vào thẳng khách, Hosso không giữ tiền.
- **Dữ liệu:** sản phẩm, đơn hàng và thông tin người mua nằm ở WIM. Studio chỉ đọc sản phẩm và gửi đơn.
- **Không khóa người dùng:** khách luôn tải về được site và tự chạy ở nơi khác.

## 2. Thuật ngữ

Mỗi từ dưới đây chỉ dùng với đúng một nghĩa trong toàn bộ tài liệu.

| Thuật ngữ | Nghĩa |
|---|---|
| **Khách** | Doanh nghiệp mua dịch vụ của Hosso, tức chủ cửa hàng |
| **Người mua** | Khách hàng của khách, đặt hàng trên web bán hàng |
| **Tenant** | Bản ghi của một khách trong Kiln. Gom instance WIM, các site, máy chủ, bí mật và gói dịch vụ của khách đó |
| **Instance WIM** | Một bản WIM riêng của một khách, chạy trong namespace `wim-<tenant>` với DB, khóa và hạn mức tài nguyên riêng |
| **Site** | Một Hosso Studio chạy thật cho khách (Studio + Postgres) trên một máy chủ |
| **Không gian thiết kế** | Studio chạy nhẹ trên Kiln để thiết kế miễn phí. Dùng SQLite, tự ngủ khi nhàn rỗi |
| **Máy khách** | VPS chạy site, ở nhà cung cấp hosting bên ngoài. Có thể là tài khoản của khách hoặc Hosso thuê hộ |
| **Agent** | Tiến trình nhỏ Kiln cài lên máy khách. Chỉ kết nối ra Kiln để nhận lệnh |
| **Gói site** | Tệp `.hosso-site.zip` chứa nội dung, ảnh, menu, cài đặt và cấu hình theme của một site |

## 3. Bốn thành phần

Hai thành phần đã có (WIM, Studio), hai thành phần chưa làm (Kiln, Store).

| Thành phần | Là gì | Chạy ở | Trạng thái |
|---|---|---|---|
| **Hosso WIM** | Quản lý kho, sản phẩm, đơn hàng và thông tin người mua. Mã đóng | Cụm Kubernetes của Hosso, mỗi khách một namespace | Đã có |
| **Hosso Studio** | CMS và trình dựng web. Đọc WIM qua plugin, hiển thị thành web bán hàng. Mã nguồn mở | Máy khách (site) và Kiln (không gian thiết kế) | Đã có |
| **Hosso Kiln** | Mặt phẳng điều khiển: thiết kế miễn phí, rồi triển khai, hosting, bảo trì có phí | Cụm Kubernetes của Hosso, namespace `kiln` | Chưa làm |
| **Hosso Store** (`store.hosso.vn`) | Chợ giới thiệu và bán app, plugin, theme, gói site | Cụm Kubernetes của Hosso, namespace `store` | Chưa làm |

Nguyên tắc chia việc:

- **Dữ liệu thương mại ở WIM.** Studio đọc sản phẩm qua API (cache ngắn) và gửi đơn sang WIM. Studio không sao chép sản phẩm hay đơn hàng.
- **Lõi Studio không biết plugin nào.** Plugin WIM và plugin từ Store dùng chung một cơ chế đăng ký. `check:boundaries` giữ ranh giới này.
- **WIM là app, không phải plugin.** WIM bán theo kiểu liên hệ, không có giỏ hàng hay thanh toán trên Store. Plugin WIM trong Studio chỉ là mảnh nối, có sẵn trong image Studio và không bán riêng.
- **Store có bốn loại sản phẩm:** `app` (dịch vụ, liên hệ để mua, Kiln cấp tenant sau khi chốt), `plugin`, `theme`, `template`. Chỉ ba loại sau cài vào Studio.
- **Kiln điều khiển, không chạy site.** Site chạy trên máy khách. Kiln cài đặt và chăm sóc từ xa qua agent.
- **Không khóa người dùng.** Tải về luôn miễn phí và đầy đủ. Giá trị của Kiln là sự tiện lợi, không phải việc giữ dữ liệu.

## 4. Phân vùng hạ tầng

Hosso giữ WIM, Kiln và Store trên hạ tầng của mình. Site của khách chạy trên máy khách. Mọi luồng giữa hai vùng đi qua Internet nên đều được ký hoặc xác thực.

Agent và site chủ động gọi về Hosso. Chỉ webhook WIM đi theo chiều ngược lại.

| Luồng | Cách | Bảo vệ |
|---|---|---|
| Site → WIM | API HTTPS, khóa riêng mỗi site | Phạm vi hẹp (mục 6.2), giới hạn tốc độ theo khóa, thu hồi và xoay được |
| WIM → site | Webhook làm mới cache tới `/api/plugins/wim/webhook` | Ký bằng secret riêng. Webhook hỏng thì site chỉ chậm tới hết TTL cache (mặc định 30 giây) |
| Agent → Kiln | Kéo lệnh, báo trạng thái | Chỉ kết nối ra, lệnh đã ký (mục 7.1) |
| Cổng thanh toán → WIM | IPN | Xác thực chữ ký của cổng, xử lý idempotent (mục 6.2) |
| Site → Store | Kiểm tra license, tải danh mục | Store sập thì dùng kết quả gần nhất |
| Kiln, WIM → site | Token SSO | JWT ngắn hạn, dùng một lần (mục 7.3) |

### 4.1. Cụm Kubernetes của Hosso

Giai đoạn đầu, mọi thứ phía Hosso chạy trên một cụm Kubernetes một server (k3s). Mỗi khách WIM là một namespace. Kiln, Store và sandbox là dịch vụ dùng chung nên mỗi thứ một namespace.

| Namespace | Chứa gì | Cách ly |
|---|---|---|
| `wim-<tenant>` | Một instance WIM của một khách | ResourceQuota, LimitRange, NetworkPolicy chặn mặc định, Secret riêng, PriorityClass cao |
| `kiln` | Kiln | Dùng chung |
| `store` | Store, registry, dịch vụ license, hàng chờ liên hệ | Dùng chung |
| `sandbox` | Mọi không gian thiết kế miễn phí. Mỗi không gian một Deployment gắn label theo người dùng | Hạn mức chung, PriorityClass thấp nhất |
| `data` | Cụm Postgres chung (CloudNativePG). Mỗi khách WIM một database và role riêng | Chỉ nhận kết nối từ namespace của đúng khách |
| `platform` | Ingress, cert-manager, ArgoCD, External Secrets, giám sát, backup | Hạ tầng |

Quy tắc:

- **Site chạy thật của khách không nằm trong cụm.** Site vẫn ở máy khách (mục 5.1). Nếu Hosso thuê hộ trong cụm thì thêm namespace `site-<tenant>`.
- **Khách không nhìn thấy nhau.** NetworkPolicy chặn mọi kết nối giữa namespace của các khách. WIM chỉ nhận kết nối vào qua ingress.
- **Sandbox không tách namespace theo người dùng**, vì số người dùng miễn phí có thể rất lớn. Kiln hạ replicas về 0 khi nhàn rỗi và nâng lên 1 khi khách quay lại. Máy thiếu tài nguyên thì sandbox bị đẩy ra trước WIM.
- **DB chung, database riêng.** Rẻ hơn nhiều so với mỗi namespace một Postgres. Khách lớn hoặc có yêu cầu riêng thì chuyển sang Postgres riêng trong namespace của họ.
- **Tạo tenant bằng Git.** Mỗi tenant là một file trong Git. ArgoCD ApplicationSet sinh namespace và app tương ứng. Kiln tạo hay xóa tenant bằng cách commit file, không gọi thẳng API Kubernetes.
- **Secret không để trong Git.** External Secrets kéo từ vault (mục 7.2).

### 4.2. Giới hạn của một server

Namespace chỉ cách ly logic. Quota và priority giảm tranh tài nguyên, nhưng server chết thì WIM, Kiln và Store cùng dừng. Khi đó site của khách vẫn hiển thị nhờ cache nhưng không đặt được đơn.

Chấp nhận được ở giai đoạn đầu với ba điều kiện:

1. Backup DB và volume đẩy ra object storage ngoài server, khôi phục thử định kỳ.
2. Dựng lại được cả cụm từ Git cộng backup, theo quy trình ghi sẵn.
3. Thêm node thứ hai ngay khi có khách WIM trả tiền đều. Khi đó tách sandbox sang node riêng (taint và toleration) để không ảnh hưởng WIM.

Về sau, khách lớn chuyển sang node riêng hoặc VM riêng trong tài khoản của Hosso. Khi cần giảm độ trễ, đặt WIM gần site của khách.

**Không đặt WIM trên máy khách:** khách có root sẽ lấy được mã WIM và dữ liệu. Chỉ làm vậy nếu sau này bán bản tự host có giấy phép riêng.

## 5. Chu trình vòng đời

Mọi con đường dẫn tới một site chạy thật đều đi qua cùng một quy trình triển khai (5.1). Các vòng khác chỉ khác ở điểm bắt đầu.

### 5.1. Quy trình triển khai site

1. **Có máy.** Khách mua VPS (Ubuntu LTS, quyền root) ở nhà cung cấp bất kỳ, có thể qua link giới thiệu của Hosso. Hoặc Hosso thuê hộ trong tài khoản của Hosso. Nhà cung cấp có API thì Kiln tạo máy luôn.
2. **Cài đặt.** Kiln cấp một lệnh cài có token dùng một lần. Khách dán lệnh vào máy. Dự phòng: khách đưa Kiln một khóa SSH tạm, Kiln xóa khóa ngay sau khi cài xong.
3. **Dựng site.** Script cài Docker, Studio, Postgres, reverse proxy cấp TLS và agent.
4. **Cấu hình.** Kiln gửi bộ biến `HOSSO_*` qua agent: DB, khóa bí mật riêng, tên miền, `HOSSO_WIM_API_URL`, `HOSSO_WIM_API_KEY`, webhook secret, email admin.
5. **Tên miền.** Kiln trỏ `tenant.hosso.vn` về máy. Với tên miền riêng, Kiln hướng dẫn khách trỏ DNS rồi chờ kiểm tra.
6. **Nội dung.** Kiln cài gói mẫu cửa hàng (ví dụ `shop-template`) qua token dịch vụ, hoặc nhập gói site khách đã thiết kế trên Kiln.
7. **Nối WIM.** WIM đặt webhook về site để làm mới cache khi sản phẩm đổi.
8. **Bàn giao.** Khách bấm "Chỉnh web" trong Kiln hoặc WIM, được đăng nhập một lần (SSO) vào admin Studio.

### 5.2. Khách mới mua WIM

1. Khách vào trang WIM trên Store, để lại thông tin liên hệ. Không có giỏ hàng hay thanh toán.
2. Hosso tư vấn, chốt hợp đồng, rồi tạo tenant cho khách trong Kiln. Khách chưa tự đăng ký.
3. Kiln commit file tenant vào Git, ArgoCD dựng namespace WIM của khách, rồi Kiln sinh khóa API riêng cho site.
4. Nếu hợp đồng có web bán hàng, chạy quy trình 5.1.

### 5.3. Khách đã có WIM, thêm web bán hàng

Khách bấm "Thêm web bán hàng" trong WIM hoặc Kiln, rồi chạy quy trình 5.1. Không cần liên hệ lại và không có bước "tích hợp ngược".

### 5.4. Thiết kế miễn phí trên Kiln

1. Khách đăng ký Kiln miễn phí, nhận một không gian thiết kế có trình dựng, theme, gói mẫu và WIM giả (`tools/mock-wim`) để xem thử.
2. Khách thiết kế và xem thử bằng link xem trước.
3. Khi xong, khách chọn một trong hai:
   - **Tải về:** nhận gói site cùng bộ cài (`docker-compose.yml`, `.env` mẫu, hướng dẫn) để tự chạy ở nơi khác.
   - **Triển khai bằng Kiln (trả phí):** chạy quy trình 5.1, nội dung lấy từ gói site. Bí mật và khóa WIM thật được nhập lại ở bước này.

### 5.5. Mua plugin, theme, mẫu từ Store

1. Khách duyệt Store, trong Kiln hoặc trong tab *Khám phá* của admin Studio, rồi mua.
2. Store cấp license key và ghi nhận quyền.
3. Gói không có thành phần admin thì bật lúc chạy. Gói có thành phần admin thì dịch vụ build của Kiln dựng image mới, dùng lại bản build có sẵn nếu tổ hợp plugin đã từng build.
4. Kiln sao lưu trước, điền key, triển khai lại qua agent.
5. Plugin kiểm tra license qua `checkLicense()`, hỏi Store định kỳ. Store sập thì dùng kết quả gần nhất.

### 5.6. Vận hành liên tục

- **Sao lưu:** theo lịch, đẩy bản sao ra kho lưu trữ ngoài máy khách.
- **Nâng cấp:** thử trên site nội bộ trước, rồi cuốn chiếu. Migration chạy trong entrypoint. Agent chỉ nhận image đã ký.
- **Giám sát:** Kiln đọc endpoint trạng thái của site, báo khi không gọi được WIM, đĩa gần đầy hoặc agent mất liên lạc.

### 5.7. Khách rời đi

1. Kiln xuất gói site cuối và bản xuất dữ liệu WIM, gửi cho khách.
2. Kiln gỡ agent, thu hồi khóa API và token của tenant.
3. Giữ bản sao lưu trong một thời hạn ghi trong hợp đồng, rồi xóa. Máy do Hosso thuê hộ thì hủy máy.

## 6. Thanh toán, đơn hàng và dữ liệu người mua

Mỗi khách dùng tài khoản cổng thanh toán (merchant) của chính họ. Tiền đi thẳng vào khách. Hosso không giữ tiền nên không phải đóng vai trung gian thanh toán.

### 6.1. Luồng đặt hàng

1. Người mua xem hàng. Studio đọc giá và tồn kho từ WIM qua cache.
2. Khi đặt, Studio gọi WIM kiểm tra lại giá và tồn kho thật (bỏ qua cache). WIM tạo đơn ở trạng thái chờ thanh toán và giữ hàng trong thời hạn ngắn.
3. Studio chuyển người mua sang cổng thanh toán của khách (VNPay, MoMo, QR chuyển khoản…).
4. Cổng thanh toán gọi IPN về WIM. WIM xác thực chữ ký, chuyển đơn sang đã thanh toán. Studio chỉ hiển thị kết quả.
5. Hết thời hạn giữ hàng mà chưa thanh toán thì WIM hủy đơn và trả hàng về kho.
6. Đơn COD bỏ qua bước 3 và 4, tạo thẳng ở trạng thái chờ giao.

### 6.2. Quy tắc

- **Khóa API của site có phạm vi hẹp:** đọc sản phẩm, danh mục, tồn kho; tạo đơn; đọc trạng thái đơn vừa tạo. Không có quyền quản trị, không đọc danh sách khách hàng hay đơn khác. Lý do: khách có root trên máy khách nên đọc được khóa này.
- **Giá và tồn kho lúc đặt luôn lấy từ WIM.** Không tin cache hay dữ liệu trình duyệt gửi lên.
- **IPN nhận ở WIM**, vì WIM là nơi giữ đơn. Xử lý idempotent theo mã giao dịch: cổng gọi lại nhiều lần không tạo trùng.
- **Thông tin merchant lưu ở WIM**, mã hóa, khách tự nhập trong WIM.

### 6.3. Dữ liệu người mua

- Tên, số điện thoại, địa chỉ của người mua lưu ở WIM. Studio không lưu, trừ khi sau này bật tài khoản người mua.
- Hosso là bên xử lý dữ liệu thay cho khách. Hợp đồng cần điều khoản xử lý dữ liệu (mục 8).
- Khách xuất được toàn bộ đơn và dữ liệu người mua bất cứ lúc nào.

## 7. Bảo mật Kiln và quyền vào máy khách

Kiln không giữ quyền vào máy khách lâu dài. Cài đặt dùng token một lần, sau đó agent trên máy khách tự kéo lệnh về. Lộ Kiln vẫn không cho kẻ tấn công một shell trên máy của mọi khách.

### 7.1. Agent

- Agent kết nối ra Kiln qua HTTPS hoặc WebSocket. Máy khách không mở cổng quản trị nào.
- Agent chỉ chạy một danh sách lệnh cố định: sao lưu, khôi phục, nâng cấp, cài gói, khởi động lại, báo trạng thái. Không có lệnh shell tùy ý.
- Mỗi lệnh được Kiln ký. Image và gói cũng được ký; agent kiểm chữ ký trước khi chạy.
- Khách gỡ agent là cắt quyền Kiln. Site vẫn chạy bình thường, chỉ mất phần bảo trì.

### 7.2. Bí mật

- `HOSSO_ENCRYPTION_KEY` và bí mật của từng tenant nằm trong kho bí mật riêng (vault hoặc KMS), không chung DB với Kiln. Có bản sao mã hóa lưu ngoại tuyến.
- Token dịch vụ cấp theo từng site, phạm vi hẹp, xoay được.
- Khóa API WIM thu hồi và xoay được mà không cần cài lại site.

### 7.3. SSO

- Token là JWT ký bằng khóa bất đối xứng: Kiln và WIM giữ khóa riêng, site chỉ giữ khóa công khai.
- Token sống vài chục giây, dùng một lần (`jti`), ghi rõ tenant, người dùng và tên miền site (`aud`). Site từ chối mọi token có `aud` khác tên miền của mình.
- Kiểm thử bắt buộc trước khi mở: token của tenant A không mở được admin site của tenant B.

### 7.4. Bảo vệ chính Kiln

- Nhân viên Hosso đăng nhập Kiln bằng 2FA, quyền tối thiểu theo vai trò.
- Mọi thao tác lên tenant được ghi nhật ký: ai, lúc nào, lệnh gì.

## 8. Trách nhiệm, pháp lý và ranh giới hỗ trợ

Khách có root trên máy của mình nên có thể làm hỏng site. Hợp đồng phải ghi rõ Hosso chịu trách nhiệm tới đâu ở từng gói.

### 8.1. Ranh giới hỗ trợ

| Gói | Hosso lo | Khách lo |
|---|---|---|
| Tự host (tải về) | Phần mềm và bản cập nhật công khai | Máy chủ, sao lưu, nâng cấp, bảo mật |
| Kiln triển khai trên máy khách | Cài đặt, sao lưu, nâng cấp, giám sát, khôi phục, vá lỗi Studio | Trả tiền VPS, không sửa gì ngoài admin Studio. Khách tự sửa hệ thống thì Hosso khôi phục về bản sao lưu gần nhất |
| Kiln trên máy Hosso thuê hộ | Toàn bộ phần máy chủ. Khách không có root | Nội dung web |
| WIM | Vận hành, sao lưu, giám sát, xuất dữ liệu khi khách yêu cầu | Dữ liệu nhập vào |

### 8.2. Việc pháp lý cần luật sư xác nhận

- **Bảo vệ dữ liệu cá nhân.** Hosso xử lý dữ liệu người mua thay cho khách. Hợp đồng cần điều khoản xử lý dữ liệu. Cần kiểm tra nghĩa vụ theo quy định bảo vệ dữ liệu cá nhân hiện hành.
- **Website thương mại điện tử.** Web bán hàng của khách có thể phải thông báo với Bộ Công Thương. Hosso có thể làm hộ thủ tục này như một dịch vụ bán kèm.
- **Hóa đơn.** Hợp đồng WIM ký ngoài hệ thống. Dịch vụ Kiln cần hóa đơn điện tử.
- **Điều khoản sử dụng gói miễn phí.** Cấm lừa đảo, giả mạo, nội dung trái phép. Hosso có quyền khóa tài khoản và gỡ link xem trước.
- **Giấy phép phần mềm.** Studio mã nguồn mở theo một giấy phép cụ thể (chưa chọn). WIM mã đóng.

## 9. Hợp đồng dữ liệu

Đây là các điểm nối giữa các phần. Chốt sớm thì rẻ, đổi muộn thì đắt.

| Hợp đồng | Giữa | Nội dung | Trạng thái |
|---|---|---|---|
| `hosso.json` | Gói ↔ Studio, Store | Phiếu thông tin: id, loại (`app`, `plugin`, `theme`, `template`), tên vi/en, version, `requires`, license, trang cài đặt, có thành phần admin hay không | Có cho plugin và theme; `pnpm check:manifests` kiểm tra. Chưa có `requires`, `template` |
| `registry.json` | Store ↔ Studio, Kiln | Danh mục: phiếu, link tải, sha256, chữ ký, giá, cách cài (`npm`, `template`, `docker`, hoặc `kiln` cho app) | Cần chốt |
| Biến môi trường `HOSSO_*` | Kiln ↔ Studio | Toàn bộ cấu hình site. Biến ưu tiên hơn cài đặt trong admin | Có, đủ trong `.env.example` |
| API đặt hàng | Studio → WIM | Đọc sản phẩm và tồn kho, kiểm giá lúc đặt, tạo đơn, đọc trạng thái đơn. Phạm vi khóa như mục 6.2 | Cần chốt |
| Webhook WIM | WIM → Studio | Sự kiện sản phẩm đổi, ký bằng secret riêng của site | Có |
| Giao thức agent | Kiln ↔ agent | Danh sách lệnh cố định, định dạng lệnh đã ký, báo kết quả | Cần chốt |
| Token dịch vụ | Kiln → Studio | Cài mẫu, nhập gói site, tạo backup, đọc trạng thái, không cần người đăng nhập | Có phía Studio (`HOSSO_SERVICE_TOKEN`); Kiln chưa có |
| Token SSO | Kiln, WIM → Studio | JWT bất đối xứng, ngắn hạn, dùng một lần, gắn tenant và tên miền | Có phía Studio (`GET /api/site/sso`, `HOSSO_SSO_PUBLIC_KEY`); bên cấp token chưa có |
| `checkLicense()` | Plugin ↔ Store | Một hàm duy nhất | Có (`packages/blocks/src/license.ts`, key Ed25519 kiểm offline, hỏi `HOSSO_LICENSE_SERVER` để thu hồi). Store chưa có |
| Endpoint trạng thái | Studio → Kiln | Phiên bản, tình trạng, dung lượng đĩa, kết nối WIM | Có: `GET /api/site/status`. Plugin báo tình trạng qua hook `status` (kết nối WIM do plugin WIM khai báo) |
| Gói site `.hosso-site.zip` | Kiln, Store → Studio | Dữ liệu thuần, cài ngay không build | Có |

## 10. Thứ tự triển khai

Bán được cho khách trả tiền trước. Thiết kế miễn phí và Store làm sau cùng, vì tốn chi phí nhất mà không giúp có doanh thu sớm hơn.

| Giai đoạn | Nội dung | Điều kiện hoàn thành |
|---|---|---|
| **0. Nền** (đã có) | Plugin WIM, 3 theme, gói mẫu đi cùng plugin, cấu hình bằng biến môi trường, ranh giới lõi/plugin | `check:boundaries` qua |
| **1. Một khách làm tay** | Cụm k3s một server, một instance WIM, một site dựng tay theo 5.1 trên một VPS. Đo các số liệu ở mục 11 | Một khách đặt được đơn thật, có số đo tài nguyên |
| **2. Kiln tối thiểu** | Tenant trong Git và ArgoCD, lệnh cài và agent, token dịch vụ, endpoint trạng thái, API đặt hàng và thanh toán qua merchant của khách (mục 6) | Tạo tenant và site mới không cần thao tác tay trên máy |
| **3. Vận hành** | Sao lưu ra ngoài, nâng cấp bằng image đã ký, giám sát, khách rời đi (5.7). Thêm node thứ hai | Khôi phục thử thành công, cụm hai node |
| **4. SSO** | JWT bất đối xứng, kiểm thử chéo tenant (7.3) | Bấm "Chỉnh web" là vào admin, kiểm thử chéo tenant qua |
| **5. Thiết kế miễn phí** | Namespace `sandbox`, tự ngủ, hạn mức, bộ cài tải về, điều khoản sử dụng | Đo được chi phí mỗi không gian nhàn rỗi |
| **6. Store** | `registry.json`, license, thanh toán cho plugin, theme, mẫu, quy trình duyệt, trang liên hệ WIM | Bán được món đầu tiên |

Phần chuẩn bị Store rẻ nên làm song song từ giai đoạn 1, để mọi gói có phiếu `hosso.json` hợp lệ trước khi Store mở. Vận hành đứng trước SSO vì khách trả tiền cần sao lưu và khôi phục hơn cần đăng nhập một chạm.

Cụm Hosso bắt đầu bằng một server ở giai đoạn 1, và có node thứ hai trước khi xong giai đoạn 3 (mục 4.2).

## 11. Rủi ro và những thứ cần đo

Hai rủi ro nặng nhất là SSO đăng nhập chéo tenant và Kiln bị chiếm. Cả hai đã có biện pháp ở mục 7 và phải kiểm thử trước khi mở cho khách.

| Rủi ro | Cách giảm |
|---|---|
| SSO cho đăng nhập chéo tenant | `aud` gắn tên miền, `jti` dùng một lần, kiểm thử chéo tenant bắt buộc |
| Kiln bị chiếm | Agent kéo lệnh, lệnh cố định đã ký, bí mật trong vault, 2FA, nhật ký thao tác |
| Mất `HOSSO_ENCRYPTION_KEY` của tenant | Vault cộng bản sao mã hóa ngoại tuyến |
| Server Hosso hoặc WIM sập làm mọi site không đặt được đơn | Cache ở Studio, backup ra ngoài server, dựng lại cụm từ Git, thêm node thứ hai khi có khách trả tiền đều (mục 4.2) |
| Bán quá số hàng còn | WIM kiểm lại tồn kho lúc đặt và giữ hàng ngắn hạn |
| Khách tự sửa máy làm hỏng site | Ranh giới hỗ trợ trong hợp đồng, khôi phục từ bản sao lưu |
| Phụ thuộc một nhà cung cấp hosting | Đường VPS bất kỳ là mặc định, API chỉ là adapter thêm |
| Chi phí và lạm dụng gói miễn phí | Hạn mức, tự ngủ, link xem trước có nhãn, khóa tài khoản. Làm sau cùng |
| Plugin bên thứ ba chạy cùng quyền server | Quy trình duyệt trước khi mở Store |
| Build image cho từng tổ hợp plugin | Dịch vụ build có cache theo tổ hợp. Gói không có thành phần admin thì bật lúc chạy |
| Giấy phép chỉ chặn người dùng thường | Chấp nhận được: plugin WIM vô dụng nếu thiếu WIM thật |

Cần đo trước khi chốt cấu hình và giá:

- RAM và CPU của một site Studio khi nhàn rỗi và khi có tải, để chọn cấu hình VPS tối thiểu khuyến nghị.
- RAM của một không gian thiết kế và thời gian đánh thức sau khi ngủ.
- RAM, CPU, kích thước DB của một instance WIM, và số instance chạy được trên một node.
- Độ trễ API từ site tới WIM khi hai bên ở hai nhà cung cấp khác nhau.
- Gói site đi từ SQLite sang Postgres: test tự động xuất ở adapter này, nhập ở adapter kia.

## 12. Câu hỏi còn mở

1. Hosso thuê VPS hộ khách, hay khách luôn tự mua qua link giới thiệu, hay cả hai tùy gói?
2. Nhà cung cấp hosting đầu tiên khuyên dùng là ai? Có API tạo máy và snapshot không?
3. Hỗ trợ tên miền riêng của khách ngay từ đầu, hay chỉ `tenant.hosso.vn`?
4. Cổng thanh toán nào hỗ trợ trước (VNPay, MoMo, QR chuyển khoản)? Ai hướng dẫn khách đăng ký merchant?
5. Form liên hệ của WIM gửi về đâu: email, CRM, hay block Form có sẵn của Studio?
6. Studio dùng giấy phép mã nguồn mở nào?
7. Dịch vụ Kiln thu tiền theo tháng hay năm, qua kênh nào, xuất hóa đơn ra sao?
8. Hạn mức gói miễn phí: bao nhiêu site, bao nhiêu dung lượng, ngủ sau bao lâu nhàn rỗi?

## Phụ lục: nhà cung cấp hosting vHost (vhost.vn)

Thông tin lấy từ trang công khai của vHost, cần xác nhận lại với họ trước khi dựa vào.

- Có Cloud Server (root đầy đủ), VPS từ 100.000đ/tháng, domain, email, SSL. Một nơi đủ cả hosting lẫn domain.
- Chương trình affiliate: hoa hồng 10% một lần cho mỗi lượt giới thiệu (không tính khi gia hạn), 5% cho Private Cloud, domain không có hoa hồng. Rút tối thiểu 1.000.000đ. Có thể đổi hoa hồng thành tín dụng dịch vụ.
- Trang công khai không thấy tài liệu API tạo máy, và không nhắc Docker, cloud-init hay snapshot. Cần hỏi trực tiếp.

Hoa hồng affiliate chỉ là khoản thu phụ một lần. Mô hình kinh doanh không dựa vào khoản này.
