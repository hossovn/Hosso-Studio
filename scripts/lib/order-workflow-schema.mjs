import assert from 'node:assert/strict'

export const workflowTables = ['commerce_events', 'commerce_rate_buckets', 'payment_transactions', 'payment_refunds', 'shop_order_groups', 'cross_sell_cancellations']
export const workflowColumns = {
  shop_orders: ['workflow_version', 'approval_state', 'approved_at', 'approved_by', 'workflow_state', 'fulfillment_intent', 'processing_plan', 'customer_decision', 'decision_at', 'decision_revision', 'reservation_expires_at', 'original_total', 'refund_due'],
  shop_settings: ['reservation_minutes'], payments: ['version', 'opening_paid_amount', 'refunded_amount'],
  cross_sell_transfers: ['workflow_key', 'remote_refunded_amount'], payload_jobs: ['notify_order_no'],
  payload_locked_documents_rels: workflowTables.map(table => table + '_id'),
}

/** Reconstruct the pre-release schema, including plugins whose older migrations lack snapshots. */
export function beforeOrderWorkflow(current) {
  const previous = structuredClone(current)
  for (const table of workflowTables) { assert.ok(previous.tables['public.' + table], table); delete previous.tables['public.' + table] }
  for (const [table, columns] of Object.entries(workflowColumns)) {
    const t = previous.tables['public.' + table]; assert.ok(t, table)
    for (const column of columns) { assert.ok(t.columns[column], table + '.' + column); delete t.columns[column] }
    for (const [key, value] of Object.entries(t.indexes)) if (value.columns.some(c => columns.includes(c.expression))) delete t.indexes[key]
    for (const [key, value] of Object.entries(t.foreignKeys)) if (value.columnsFrom.some(c => columns.includes(c))) delete t.foreignKeys[key]
  }
  for (const key of Object.keys(previous.enums)) if (workflowTables.some(table => key.startsWith('public.enum_' + table + '_')) || ['public.enum_shop_orders_approval_state', 'public.enum_shop_orders_customer_decision', 'public.enum_shop_orders_fulfillment_intent'].includes(key)) delete previous.enums[key]
  for (const name of ['enum_payload_jobs_log_task_slug', 'enum_payload_jobs_task_slug']) previous.enums['public.' + name].values = previous.enums['public.' + name].values.filter(v => v !== 'commerce-event-delivery')
  return previous
}
