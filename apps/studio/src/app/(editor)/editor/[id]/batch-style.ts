import type { FreeElement } from '@hosso/studio-blocks'
import { inheritedElementFlag } from '../../../../../../../packages/blocks/src/free-geometry.ts'
import { elementStyleProps } from './canvas-model.ts'
export function batchStyle(list: FreeElement[], ids: string[], patch: Record<string, unknown>) {
  return list.map((el) => ids.includes(el.id) && !inheritedElementFlag(list, el.id, '_locked') ? { ...el, props: { ...el.props, ...elementStyleProps(patch) } } : el)
}
