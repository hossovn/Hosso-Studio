# Phát hành TCAP ngày 01/11/2026

## Artifact đã build và kiểm thử

- Studio: `072e63e2ba67c9682aea3e1a46e2e98381c1b3b8`, PR https://github.com/hossovn/Hosso-Studio/pull/8.
- Private plugins: `c05f81e78274f24710f0159c284f9fec1c6692aa`, draft PR https://github.com/hossovn/hosso-plugins/pull/2.
- WIM/ERP: `96fb4fe7b622a05afec32d9c4d5e0084fc877b19`, PR https://github.com/hossovn/HOSSO-WIM/pull/146. Chưa triển khai trong đợt cập nhật stack web này.
- Image: `ghcr.io/hossovn/hosso-tcap:1.4.0-20261101.1`.
- Manifest digest: `sha256:df5fce342a36f53d0ce46c67cf8877f26e6398158d80d6bccdf212930e5312fe`.
- Release build thành công: https://github.com/hossovn/Hosso-Deploy/actions/runs/41298734324.
- Studio CI thành công cả check, roundtrip và image: https://github.com/hossovn/Hosso-Studio/actions/runs/41298735567.
- Checkout log và provenance xác nhận đúng Studio/plugin commit. Label revision của pipeline hiện trỏ tới commit repo Deploy; không dùng label đó để suy ra Studio commit.

## Đích triển khai và sao lưu

- Stack đích: **hosso-tcap-web**, Portainer stack ID 47.
- Image trước nâng cấp: `ghcr.io/hossovn/hosso-tcap:1.3.4`.
- Đổi biến `HOSSO_IMAGE`; giữ khóa mã hóa và volumes hiện có.
- Sau lần khởi động đầu, chẩn đoán xác nhận DNS trên server phân giải `tcap-wim.hosso.vn` về mạng nội bộ. SSRF guard chặn đúng thiết kế. Bổ sung duy nhất `HOSSO_PRIVATE_API_HOSTS: tcap-wim.hosso.vn` cho environment của service Studio; vẫn xác minh chứng chỉ TLS, không mở toàn bộ dải IP/private host.
- Request chẩn đoán không credentials với allowlist đúng hostname nhận HTTP 401 từ WIM, xác nhận đường mạng và TLS hoạt động. Đây chưa phải nghiệm thu thao tác đơn nguồn.
- Bản sao lưu content hiện hữu ghi thành công: 17 pages, 0 posts, 115 media, khoảng 73 MB.
- Đã tạo dump PostgreSQL định dạng custom trong volume pgdata: `/var/lib/postgresql/data/hosso-pre-commerce-20261101-1743.dump`.
- Dump có quyền 0600, khoảng 490.1 KB; `pg_restore --list` đọc được TOC. Chưa chạy phục hồi toàn bộ bản dump này.
- SHA256 dump: `02422664562d4d7f72a5f516fa905561263524190193b1634bafccdc082373c8`.
- Không đưa dump, secrets hay dữ liệu khách hàng vào Git.

## Trạng thái

Người dùng đã xác nhận triển khai image nêu trên qua giao diện Portainer. Migration `20261101_180000_order_workflow` đã thành công trong 690 ms; lần khởi động tiếp theo không còn migration chờ chạy.

- Studio container `5b8cf7785a665d2ae3e53514b44a8d824d960fc25ede982a0bc2c9a9d9f06424` và PostgreSQL đều healthy. Portainer xác nhận digest image khớp manifest trên.
- Health công khai trả `{"status":"ok","db":"up"}`. Trang chủ và giỏ hàng tải được; giỏ có ảnh và điều khiển tăng/giảm số lượng của bản mới.
- Admin tải được màn hình đăng nhập; phiên cũ đã hết hạn. Chưa thao tác Orders qua admin live trong đợt kiểm tra này.
- Sau allowlist, GET WIM `/v1/products?limit=1` trả HTTP 200 trong 146 ms; `/v1/partner-orders?unlinked=1` trả HTTP 200 trong 10 ms. Chỉ in status/thời gian, không in dữ liệu đơn hoặc credentials.
- Lượt worker đầu sau khởi động còn gặp lỗi kết nối lúc 18:06; hai lượt tiếp theo 18:07 và 18:08 không ghi thêm lỗi kết nối. Chưa suy ra đơn/tiền/tồn thực đã xử lý thành công từ kết quả này.
- Tác vụ backup sau nâng cấp ghi thành công 17 trang, 0 bài viết, 115 media lúc 18:01, khoảng 73 MB. Probe HTTP kế thừa từ image không phù hợp với worker backup; template được sửa để tắt probe này, tương tự docker-compose local.
- Đã áp dụng override probe vào stack live: backup container `585abe90c1bc69bca96ca8bf6b20ab635b48d3f6dc92874dffa0f94d49a53bfa` ở trạng thái running; Studio và PostgreSQL giữ nguyên container và vẫn healthy.
- ERPNext image/migration CI trên PR WIM đã đạt; job WIM image/smoke vẫn đang chạy tại thời điểm ghi báo cáo. Chưa triển khai WIM/ERP và Woo connector trong đợt cập nhật stack web.

Các thay đổi template/env mẫu và báo cáo sau phát hành không sửa runtime trong image `1.4.0-20261101.1`. YAML đã được parse và kiểm tra allowlist/probe; `git diff --check` đạt.

Không tạo đơn thật, không gửi email thử, không ghi tiền hoặc thay đổi tồn để kiểm thử production. Giới hạn nghiệm thu và quy trình rollback nằm trong [TRIEN-KHAI.md](./TRIEN-KHAI.md).
