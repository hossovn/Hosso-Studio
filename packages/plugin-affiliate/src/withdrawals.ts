import type { PayloadRequest } from 'payload'
import { check, nextPayoutDate, idOf } from './core'
import { all, atomic, audit, find, refresh, lockAffiliate } from './service'

const localDate = (timeZone: string) => {
  const p = new Intl.DateTimeFormat('en', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date())
  return ['year', 'month', 'day'].map((key) => p.find((v) => v.type === key)!.value).join('-')
}

export async function withdrawalPolicy(req: PayloadRequest) {
  const policy: any = await req.payload.findGlobal({ slug: 'affiliate-settings' as any, depth: 0, overrideAccess: true, req })
  return { defaultRate: policy.defaultRate ?? 15, minimum: policy.minimumWithdrawal ?? 100000, allowOffCycle: policy.allowOffCycle !== false, nextDate: nextPayoutDate(new Date(), policy.timeZone || 'Asia/Ho_Chi_Minh'), timeZone: policy.timeZone || 'Asia/Ho_Chi_Minh' }
}

export async function requestWithdrawal(req: PayloadRequest, affiliate: any) {
  check(req.payload.db.name !== 'sqlite', 'Chi trả cần PostgreSQL; bản xem trước không nhận yêu cầu rút.')
  const policy = await withdrawalPolicy(req)
  check(policy.allowOffCycle || localDate(policy.timeZone) === policy.nextDate, 'Chỉ nhận yêu cầu vào ngày chi cuối tháng.')
  return atomic(req, async () => {
    check(req.transactionID, 'Yêu cầu rút cần giao dịch cơ sở dữ liệu.')
    await lockAffiliate(req, affiliate.id)
    affiliate = (await find(req, 'affiliates', { id: { equals: affiliate.id } }))[0]
    check(affiliate?.active && affiliate.approval === 'approved' && affiliate.bankInfo?.trim(), 'Cần tài khoản đã duyệt và thông tin nhận tiền.')
    check(!(await find(req, 'affiliate-withdrawals', { activeKey: { equals: String(affiliate.id) } })).length, 'Bạn đã có yêu cầu đang xử lý.')
    const candidates = await all(req, 'affiliate-referrals', { affiliate: { equals: affiliate.id }, status: { in: ['eligible', 'approved', 'holding'] } })
    const rows: any[] = []
    for (const row of candidates) { const live: any = await refresh(req, row); if (['eligible', 'approved'].includes(live.status)) rows.push(live) }
    const amount = rows.reduce((sum, row) => sum + row.commission, 0)
    check(Number.isSafeInteger(amount) && amount >= policy.minimum, `Số dư khả dụng phải từ ${policy.minimum.toLocaleString('vi-VN')}đ.`)
    const request = await req.payload.create({ collection: 'affiliate-withdrawals' as any, data: { affiliate: affiliate.id, activeKey: String(affiliate.id), amount, status: 'pending', bankInfo: affiliate.bankInfo, commissions: rows.map((r) => ({ id: r.id, amount: r.commission })) }, overrideAccess: true, req })
    await audit(req, 'withdrawal-requested', String(request.id), { affiliate: affiliate.id, amount })
    return request
  })
}

/** Prepare reviewable requests on month-end; the job never initiates a bank transfer. */
export async function prepareMonthlyWithdrawals(req: PayloadRequest) {
  if (req.payload.db.name === 'sqlite') return
  const policy = await withdrawalPolicy(req)
  if (localDate(policy.timeZone) !== policy.nextDate) return
  const affiliates = await all(req, 'affiliates', { active: { equals: true }, approval: { equals: 'approved' } })
  for (const affiliate of affiliates) {
    if (!affiliate.bankInfo?.trim() || (await find(req, 'affiliate-withdrawals', { affiliate: { equals: affiliate.id }, createdAt: { greater_than_equal: policy.nextDate + 'T00:00:00.000Z' } })).length) continue
    try { await requestWithdrawal(req, affiliate) }
    catch (e) { req.payload.logger.info(`[affiliate] Month-end request skipped for ${affiliate.id}: ${e instanceof Error ? e.message : 'unavailable'}`) }
  }
}

export async function reviewWithdrawal(req: PayloadRequest, id: unknown, approve: boolean, reason?: string) {
  return atomic(req, async () => {
    const row = (await find(req, 'affiliate-withdrawals', { id: { equals: id }, status: { in: approve ? ['pending'] : ['pending', 'approved'] } }))[0]
    check(row, 'Không tìm thấy yêu cầu chờ duyệt.')
    await lockAffiliate(req, idOf(row.affiliate))
    if (approve) {
      for (const item of row.commissions) {
        const referral = (await find(req, 'affiliate-referrals', { id: { equals: item.id }, affiliate: { equals: idOf(row.affiliate) } }))[0]
        check(referral, 'Khoản hoa hồng không còn tồn tại.')
        const live: any = await refresh(req, referral)
        check(['eligible', 'approved'].includes(live.status) && live.commission === item.amount, 'Số dư đã thay đổi. Từ chối yêu cầu để cộng tác viên gửi lại.')
        if (live.status === 'eligible') await req.payload.update({ collection: 'affiliate-referrals' as any, id: live.id, data: { status: 'approved' }, overrideAccess: true, req })
      }
    } else check(reason && reason.trim().length >= 3, 'Nhập lý do từ chối.')
    const result = await req.payload.update({ collection: 'affiliate-withdrawals' as any, where: { id: { equals: row.id }, status: { equals: row.status } }, data: { status: approve ? 'approved' : 'rejected', ...(approve ? {} : { activeKey: null }), reason: reason?.trim(), reviewedAt: new Date().toISOString() }, overrideAccess: true, req })
    check(result.docs.length === 1, 'Yêu cầu đã thay đổi. Vui lòng tải lại.')
    await audit(req, approve ? 'withdrawal-approved' : 'withdrawal-rejected', String(row.id), { amount: row.amount, reason })
    return result.docs[0]
  })
}
