// The platform release only adds collections, columns, indexes and scheduled task values.
export function beforePlatform(current) {
  const previous = structuredClone(current)
  const added = ['form_deliveries', 'analytics_events', 'shop_saved_carts', 'shop_returns']
  const removedColumns = {
    content_entries_locales: ['search_text'],
    content_types: ['detail_template_id'],
    form_submissions: ['submission_key', 'lead_status', 'assigned_to_id', 'notes', 'attribution', 'experiments', 'revision'],
    payload_locked_documents_rels: added.map((name) => name + '_id'),
  }
  for (const [key, table] of Object.entries(previous.tables)) {
    if (added.includes(table.name)) { delete previous.tables[key]; continue }
    const columns = removedColumns[table.name] || []
    for (const name of columns) delete table.columns[name]
    for (const [name, index] of Object.entries(table.indexes || {})) if (index.columns.some((column) => columns.includes(typeof column === 'string' ? column : column.expression))) delete table.indexes[name]
    for (const [name, fk] of Object.entries(table.foreignKeys || {})) if (fk.columnsFrom.some((column) => columns.includes(column))) delete table.foreignKeys[name]
  }
  for (const [key, value] of Object.entries(previous.enums || {})) {
    if (added.some((table) => value.name.startsWith('enum_' + table + '_')) || value.name === 'enum_form_submissions_lead_status') delete previous.enums[key]
    else value.values = value.values.filter((name) => !['form-delivery-sweep', 'analytics-retention', 'analytics-record-event', 'shop-return-retention'].includes(name))
  }
  return previous
}
