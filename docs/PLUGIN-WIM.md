# Tách riêng plugin WIM khi công khai repo
**Tiếng Việt** | [English](en/PLUGIN-WIM.md)

`packages/plugin-wim` là mã nguồn đóng (`"license": "UNLICENSED"`, `"private": true`, không có file LICENSE). Trong PoC nó nằm chung monorepo để tiện phát triển.

Khi công khai repo:

1. Chuyển thư mục `packages/plugin-wim` sang một repo riêng tư (giữ lịch sử bằng `git subtree split -P packages/plugin-wim`).
2. Xóa thư mục khỏi repo công khai, kèm lịch sử của nó (`git filter-repo --path packages/plugin-wim --invert-paths`).
3. Gỡ dòng import và khai báo plugin khỏi `apps/studio/hosso.config.ts` và `apps/studio/package.json`; Studio vẫn chạy vì lõi không phụ thuộc plugin.
4. `pnpm check:boundaries` phải qua trước khi đẩy lên.

Gói site mẫu cửa hàng nằm cùng plugin tại `packages/plugin-wim/templates/phu-tung-o-to.hosso-site.zip` (lõi tự quét `packages/*/templates`), nên đi theo plugin ở bước 1. Repo công khai cần một gói mẫu không phụ thuộc WIM đặt trong `seed/sites`. Khách WIM dùng gói từ repo riêng thì đặt `HOSSO_TEMPLATES_DIR` trỏ tới thư mục chứa gói. Trong trang Kết nối Hosso WIM có nút "Cài site cửa hàng mẫu" để cài gói này một chạm.
