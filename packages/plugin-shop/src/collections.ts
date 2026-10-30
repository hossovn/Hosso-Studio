import { emitOrderStatusChanged } from '@hosso/studio-blocks'
import type { CollectionConfig, Field, GlobalConfig } from 'payload'
import { adjustStock } from './stock'
import { slugify } from './util'

type Roled = { roles?: string[] | null } | null | undefined
const manager = ({ req }: { req: { user?: unknown } }) => {
  const r = (req.user as Roled)?.roles
  return Boolean(r?.includes('admin') || r?.includes('publisher'))
}
const bi = (vi: string, en: string) => ({ vi, en })
const GROUP = bi('Cửa hàng', 'Shop')
export const SETTINGS = 'shop-settings'

// Khách chỉ đọc được sản phẩm đang bán; quản trị viên và người xuất bản thấy hết và được sửa.
const catalogAccess = {
  read: (a: { req: { user?: unknown } }) => (manager(a) ? true : { active: { equals: true } }),
  create: manager,
  update: manager,
  delete: manager,
}

export const Categories: CollectionConfig = {
  slug: 'shop-categories',
  labels: { singular: bi('Danh mục sản phẩm', 'Product category'), plural: bi('Danh mục sản phẩm', 'Product categories') },
  admin: { group: GROUP, useAsTitle: 'name', defaultColumns: ['name', 'parent', 'slug', 'order'] },
  access: { read: () => true, create: manager, update: manager, delete: manager },
  hooks: {
    beforeValidate: [({ data }) => (data && !data.slug && data.name ? { ...data, slug: slugify(data.name) } : data)],
  },
  fields: [
    { name: 'name', type: 'text', required: true, label: bi('Tên', 'Name') },
    { name: 'slug', type: 'text', unique: true, index: true, label: bi('Đường dẫn', 'Slug'), admin: { description: bi('Tự tạo từ tên nếu để trống.', 'Generated from the name if left empty.') } },
    { name: 'parent', type: 'relationship', relationTo: 'shop-categories' as any, label: bi('Danh mục cha', 'Parent category') },
    { name: 'image', type: 'upload', relationTo: 'media', label: bi('Ảnh', 'Image') },
    { name: 'order', type: 'number', defaultValue: 0, label: bi('Thứ tự hiển thị', 'Sort order') },
  ],
}

const ProductsBase: CollectionConfig = {
  slug: 'shop-products',
  labels: { singular: bi('Sản phẩm', 'Product'), plural: bi('Sản phẩm', 'Products') },
  admin: { group: GROUP, useAsTitle: 'name', defaultColumns: ['thumb', 'name', 'code', 'category', 'price', 'salePrice', 'stock', 'active'], listSearchableFields: ['name', 'code'] },
  access: catalogAccess,
  hooks: {
    // Tự tạo đường dẫn từ tên; trùng thì thêm mã hoặc hậu tố ngắn.
    beforeValidate: [
      async ({ data, req, operation }) => {
        if (!data || data.slug || !data.name) return data
        let slug = slugify(data.name)
        if (operation === 'create' && (await req.payload.count({ collection: 'shop-products' as any, where: { slug: { equals: slug } }, overrideAccess: true })).totalDocs)
          slug = `${slug}-${slugify(String(data.code ?? '')) || Date.now().toString(36).slice(-4)}`
        return { ...data, slug }
      },
    ],
  },
  fields: [
    { name: 'name', type: 'text', required: true, label: bi('Tên sản phẩm', 'Name') },
    { name: 'slug', type: 'text', unique: true, index: true, label: bi('Đường dẫn', 'Slug'), admin: { position: 'sidebar' } },
    { name: 'code', type: 'text', unique: true, index: true, label: bi('Mã sản phẩm (SKU)', 'SKU'), admin: { position: 'sidebar' } },
    {
      name: 'priceDisplay',
      type: 'select',
      defaultValue: 'default',
      label: bi('Hiện giá trên web', 'Show price on the web'),
      options: [
        { label: bi('Theo cài đặt chung', 'Follow the shop setting'), value: 'default' },
        { label: bi('Luôn hiện giá', 'Always show'), value: 'show' },
        { label: bi('Ẩn giá (hiện chữ liên hệ)', 'Hide (show a contact label)'), value: 'hide' },
      ],
      admin: { position: 'sidebar' },
    },
    { name: 'displayName', type: 'text', label: bi('Tên hiển thị trên web (tùy chọn)', 'Display name on the web (optional)'), admin: { description: bi('Với sản phẩm gắn WIM: để trống thì dùng tên từ WIM.', 'For WIM-linked products: leave empty to use the WIM name.') } },
    {
      name: 'wimId',
      type: 'text',
      index: true,
      label: bi('Gắn với sản phẩm WIM (mã)', 'Linked WIM product (ID)'),
      admin: {
        position: 'sidebar',
        description: bi(
          'Điền mã sản phẩm bên WIM để bản ghi này bổ sung ảnh, mô tả, trọng lượng, kích thước chỉ hiển thị trên web. Giá và tồn kho vẫn lấy từ WIM. Bản ghi gắn WIM nên bỏ chọn "Đang bán" để shop không bán trùng.',
          'Enter the WIM product ID so this record adds images, description, weight and size shown on the web only. Price and stock still come from WIM. Untick "On sale" on linked records so the shop does not sell it twice.',
        ),
      },
    },
    { name: 'active', type: 'checkbox', defaultValue: true, label: bi('Đang bán', 'On sale'), admin: { position: 'sidebar', components: { Cell: '@hosso/plugin-shop/admin-list#ActiveCell' } } },
    { name: 'category', type: 'relationship', relationTo: 'shop-categories' as any, label: bi('Danh mục', 'Category'), admin: { position: 'sidebar' } },
    { name: 'brand', type: 'text', index: true, label: bi('Thương hiệu', 'Brand'), admin: { position: 'sidebar' } },
    { name: 'price', type: 'number', required: true, min: 0, label: bi('Giá (đ)', 'Price (VND)') },
    { name: 'salePrice', type: 'number', min: 0, label: bi('Giá khuyến mãi (đ)', 'Sale price (VND)'), admin: { description: bi('Để trống nếu không giảm giá. Phải thấp hơn giá gốc.', 'Leave empty for no discount. Must be lower than the price.') } },
    { name: 'stock', type: 'number', required: true, defaultValue: 0, min: 0, label: bi('Tồn kho', 'Stock'), admin: { description: bi('Bỏ qua nếu sản phẩm có biến thể (mỗi biến thể có tồn kho riêng).', 'Ignored when the product has variants (each variant has its own stock).') } },
    {
      name: 'variants',
      type: 'array',
      label: bi('Biến thể (kích cỡ, màu, dung tích…)', 'Variants (size, color, volume…)'),
      admin: { description: bi('Khi có biến thể, khách phải chọn một biến thể. Giá để trống thì dùng giá của sản phẩm.', 'When variants exist, customers must pick one. An empty price uses the product price.') },
      fields: [
        { name: 'name', type: 'text', required: true, label: bi('Tên biến thể', 'Variant name') },
        { name: 'sku', type: 'text', label: bi('Mã (SKU)', 'SKU') },
        { name: 'price', type: 'number', min: 0, label: bi('Giá riêng (đ)', 'Own price (VND)') },
        { name: 'stock', type: 'number', defaultValue: 0, min: 0, label: bi('Tồn kho', 'Stock') },
      ],
    },
    {
      name: 'makes',
      type: 'text',
      hasMany: true,
      index: true,
      label: bi('Hãng xe tương thích', 'Compatible car makes'),
      admin: { description: bi('Viết thường, không dấu (ví dụ toyota, kia). Dùng cho bộ lọc ?make=', 'Lowercase, no accents (for example toyota, kia). Used by the ?make= filter.') },
    },
    {
      name: 'images',
      type: 'array',
      label: bi('Ảnh', 'Images'),
      fields: [{ name: 'image', type: 'upload', relationTo: 'media', required: true, label: bi('Ảnh', 'Image') }],
    },
    { name: 'description', type: 'textarea', label: bi('Mô tả', 'Description') },
    { name: 'weight', type: 'number', min: 0, label: bi('Trọng lượng (g)', 'Weight (g)'), admin: { position: 'sidebar' } },
    { name: 'length', type: 'number', min: 0, label: bi('Dài (cm)', 'Length (cm)'), admin: { position: 'sidebar' } },
    { name: 'width', type: 'number', min: 0, label: bi('Rộng (cm)', 'Width (cm)'), admin: { position: 'sidebar' } },
    { name: 'height', type: 'number', min: 0, label: bi('Cao (cm)', 'Height (cm)'), admin: { position: 'sidebar' } },
  ],
}

// Form sản phẩm chia tab (tab không đổi cấu trúc dữ liệu); các trường dùng nhanh vẫn ở cột bên.
const SIDE = ['slug', 'code', 'active', 'category', 'brand', 'priceDisplay', 'wimId']
const TABS: [ReturnType<typeof bi>, string[]][] = [
  [bi('Thông tin', 'Info'), ['name', 'displayName', 'description', 'images', 'makes']],
  [bi('Giá và kho', 'Price and stock'), ['price', 'salePrice', 'stock', 'variants']],
  [bi('Vận chuyển', 'Shipping'), ['weight', 'length', 'width', 'height']],
]
const named = (f: Field) => ('name' in f ? f.name : '')
const pf = ProductsBase.fields as Field[]
// Trường nằm trong tab thì không được đặt position: 'sidebar'.
const pick = (names: string[]) => names.flatMap((n) => pf.filter((f) => named(f) === n)).map((f) => ('admin' in f && f.admin && 'position' in f.admin ? ({ ...f, admin: { ...f.admin, position: undefined } } as Field) : f))
export const Products: CollectionConfig = {
  ...ProductsBase,
  fields: [
    { name: 'thumb', type: 'ui', admin: { components: { Cell: '@hosso/plugin-shop/admin-list#ThumbCell' } } },
    ...pf.filter((f) => SIDE.includes(named(f))),
    { type: 'tabs', tabs: TABS.map(([label, names]) => ({ label, fields: pick(names) })) },
  ],
}

export const Reviews: CollectionConfig = {
  slug: 'shop-reviews',
  labels: { singular: bi('Đánh giá', 'Review'), plural: bi('Đánh giá sản phẩm', 'Product reviews') },
  admin: { group: GROUP, useAsTitle: 'name', defaultColumns: ['product', 'name', 'rating', 'status', 'createdAt'] },
  defaultSort: '-createdAt',
  // Khách gửi qua endpoint (chờ duyệt); chỉ đánh giá đã duyệt hiện trên site.
  access: { read: manager, create: () => false, update: manager, delete: manager },
  fields: [
    { name: 'product', type: 'relationship', relationTo: 'shop-products' as any, required: true, label: bi('Sản phẩm', 'Product') },
    { name: 'name', type: 'text', required: true, label: bi('Người đánh giá', 'Reviewer') },
    { name: 'rating', type: 'number', required: true, min: 1, max: 5, label: bi('Số sao (1-5)', 'Rating (1-5)') },
    { name: 'comment', type: 'textarea', label: bi('Nhận xét', 'Comment') },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'pending',
      label: bi('Trạng thái', 'Status'),
      options: [
        { value: 'pending', label: bi('Chờ duyệt', 'Pending') },
        { value: 'approved', label: bi('Đã duyệt', 'Approved') },
        { value: 'rejected', label: bi('Từ chối', 'Rejected') },
      ],
    },
  ],
}

export const Orders: CollectionConfig = {
  slug: 'shop-orders',
  labels: { singular: bi('Đơn hàng', 'Order'), plural: bi('Đơn hàng', 'Orders') },
  admin: { group: GROUP, useAsTitle: 'orderNo', defaultColumns: ['orderNo', 'customerName', 'phone', 'total', 'status', 'createdAt'], components: { beforeListTable: ['@hosso/plugin-shop/admin-list#OrderTabs'] } },
  defaultSort: '-createdAt',
  // Đơn chỉ được tạo qua endpoint thanh toán; quản trị viên xem và đổi trạng thái.
  access: { read: manager, create: () => false, update: manager, delete: manager },
  hooks: {
    // Hủy đơn thì hoàn lại tồn kho (một lần).
    afterChange: [
      async ({ doc, previousDoc, req, operation }) => {
        if (operation === 'update' && previousDoc?.status && previousDoc.status !== doc.status && !req.context.skipStatusEvent)
          await emitOrderStatusChanged(req.payload, { order: { id: doc.orderNo, total: doc.total, status: doc.status, customer: { name: doc.customerName, phone: doc.phone, address: doc.address, email: doc.email || undefined } }, from: previousDoc.status, to: doc.status, source: 'shop' })
        if (operation !== 'update' || doc.status !== 'cancelled' || doc.restocked || req.context.skipRestock) return doc
        for (const l of doc.items ?? []) {
          await adjustStock(req.payload, String(l.productId), l.variantId || undefined, l.quantity)
        }
        await req.payload.update({ collection: 'shop-orders' as any, id: doc.id, data: { restocked: true }, overrideAccess: true, context: { skipRestock: true } })
        return doc
      },
    ],
  },
  fields: [
    { name: 'printLink', type: 'ui', admin: { components: { Field: '@hosso/plugin-shop/admin#PrintLink' } } },
    { name: 'orderNo', type: 'text', unique: true, index: true, label: bi('Mã đơn', 'Order number'), admin: { readOnly: true } },
    { name: 'cartId', type: 'text', unique: true, admin: { hidden: true } },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'new',
      required: true,
      label: bi('Trạng thái', 'Status'),
      options: [
        { value: 'new', label: bi('Mới', 'New') },
        { value: 'confirmed', label: bi('Đã xác nhận', 'Confirmed') },
        { value: 'shipping', label: bi('Đang giao', 'Shipping') },
        { value: 'completed', label: bi('Hoàn tất', 'Completed') },
        { value: 'cancelled', label: bi('Đã hủy', 'Cancelled') },
      ],
    },
    { name: 'subtotal', type: 'number', label: bi('Tạm tính (đ)', 'Subtotal (VND)'), admin: { readOnly: true } },
    {
      name: 'adjustments',
      type: 'array',
      label: bi('Phí và giảm giá', 'Fees and discounts'),
      admin: { readOnly: true, description: bi('Phí ship (dương) và giảm giá (âm) do các plugin thêm.', 'Shipping fees (positive) and discounts (negative) added by plugins.') },
      fields: [
        { name: 'label', type: 'text', label: bi('Tên', 'Label') },
        { name: 'amount', type: 'number', label: bi('Số tiền (đ)', 'Amount (VND)') },
        { name: 'source', type: 'text', label: bi('Plugin', 'Plugin') },
      ],
        { name: 'scope', type: 'text' },
    },
    { name: 'total', type: 'number', label: bi('Tổng tiền (đ)', 'Total (VND)'), admin: { readOnly: true } },
    {
      name: 'paymentStatus',
      type: 'select',
      defaultValue: 'unpaid',
      label: bi('Tình trạng thanh toán', 'Payment status'),
      options: [
        { value: 'unpaid', label: bi('Chưa thanh toán', 'Unpaid') },
        { value: 'paid', label: bi('Đã thanh toán', 'Paid') },
        { value: 'refunded', label: bi('Đã hoàn tiền', 'Refunded') },
      ],
    },
    { name: 'email', type: 'email', label: 'Email' },
    { name: 'paymentMethod', type: 'text', defaultValue: 'cod', label: bi('Cách thanh toán', 'Payment method'), admin: { description: bi('cod = thanh toán khi nhận hàng, bank = chuyển khoản.', 'cod = cash on delivery, bank = bank transfer.') } },
    { name: 'fulfillmentType', type: 'select', defaultValue: 'delivery', label: bi('Nhận hàng', 'Fulfillment'), options: [{ value: 'delivery', label: bi('Giao tận nơi', 'Delivery') }, { value: 'pickup', label: bi('Nhận tại cửa hàng', 'Store pickup') }] },
    { name: 'customerName', type: 'text', label: bi('Khách hàng', 'Customer') },
    { name: 'phone', type: 'text', label: bi('Điện thoại', 'Phone') },
    { name: 'address', type: 'textarea', label: bi('Địa chỉ giao', 'Delivery address') },
    { name: 'note', type: 'textarea', label: bi('Ghi chú của khách', 'Customer note') },
    {
      name: 'items',
      type: 'array',
      label: bi('Sản phẩm', 'Items'),
      admin: { readOnly: true },
      fields: [
        { name: 'productId', type: 'text', required: true },
        { name: 'variantId', type: 'text' },
        { name: 'name', type: 'text', label: bi('Tên', 'Name') },
        { name: 'code', type: 'text', label: bi('Mã', 'SKU') },
        { name: 'price', type: 'number', label: bi('Đơn giá', 'Unit price') },
        { name: 'quantity', type: 'number', label: bi('Số lượng', 'Quantity') },
      ],
    },
    { name: 'restocked', type: 'checkbox', admin: { hidden: true } },
  ],
}

export const Settings: GlobalConfig = {
  slug: SETTINGS,
  label: bi('Cài đặt cửa hàng', 'Shop settings'),
  admin: { group: GROUP },
  access: { read: () => true, update: manager },
  fields: [
    {
      name: 'showPrices',
      type: 'checkbox',
      defaultValue: true,
      label: bi('Hiện giá sản phẩm trên web', 'Show product prices on the web'),
      admin: { description: bi('Tắt thì cả site chỉ hiện chữ liên hệ thay giá và ẩn nút Thêm vào giỏ. Từng sản phẩm vẫn chỉnh riêng được.', 'When off, the whole site shows a contact label instead of prices and hides Add to cart. Each product can still override this.') },
    },
    {
      name: 'priceHiddenLabel',
      type: 'text',
      defaultValue: 'Liên hệ để biết giá',
      label: bi('Chữ hiện khi ẩn giá', 'Label shown when the price is hidden'),
    },
    {
      name: 'policyTitle',
      type: 'text',
      label: bi('Tiêu đề khối chính sách ở trang sản phẩm', 'Policy block title on the product page'),
      admin: { description: bi('Ví dụ: Chính sách khách hàng.', 'For example: Customer policy.') },
    },
    {
      name: 'policyItems',
      type: 'array',
      label: bi('Các dòng chính sách', 'Policy lines'),
      fields: [{ name: 'text', type: 'textarea', required: true, label: bi('Nội dung', 'Text') }],
    },
    {
      name: 'bankInfo',
      type: 'textarea',
      label: bi('Thông tin chuyển khoản', 'Bank transfer details'),
      admin: { description: bi('Hiện cho khách khi chọn thanh toán chuyển khoản. Để trống thì chỉ có COD.', 'Shown when the customer picks bank transfer. Leave empty to offer COD only.') },
    },
  ],
}
