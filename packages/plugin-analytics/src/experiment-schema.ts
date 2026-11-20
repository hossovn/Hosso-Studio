import type { BlockSchema } from '@hosso/studio-blocks'
export type Props = { experimentId: string; revision: number; mode: string; headingA: string; headingB: string; textA: string; textB: string; ctaA: string; ctaB: string; hrefA: string; hrefB: string }

export const experimentBlock: BlockSchema<Props> = {
  type: 'AnalyticsExperiment', label: 'Thử nghiệm A/B (tiêu đề / ưu đãi / CTA)',
  fields: {
    experimentId: { type: 'text', label: 'Mã duy nhất (chữ, số, gạch ngang)' },
    revision: { type: 'number', label: 'Phiên bản (tăng khi đổi nội dung)' },
    mode: { type: 'select', label: 'Trạng thái / quay về một bản', options: [{ label: 'Chỉ bản A', value: 'a' }, { label: 'Chạy A/B 50/50', value: 'running' }, { label: 'Chỉ bản B', value: 'b' }] },
    headingA: { type: 'text', label: 'Tiêu đề A' }, headingB: { type: 'text', label: 'Tiêu đề B' },
    textA: { type: 'textarea', label: 'Nội dung / ưu đãi A' }, textB: { type: 'textarea', label: 'Nội dung / ưu đãi B' },
    ctaA: { type: 'text', label: 'Nhãn CTA A' }, ctaB: { type: 'text', label: 'Nhãn CTA B' },
    hrefA: { type: 'text', label: 'Đường dẫn nội bộ A' }, hrefB: { type: 'text', label: 'Đường dẫn nội bộ B' },
  },
  defaultProps: { experimentId: '', revision: 1, mode: 'a', headingA: 'Tìm giải pháp phù hợp với bạn', headingB: 'Bắt đầu với một buổi tư vấn', textA: 'Để lại thông tin để được hỗ trợ.', textB: 'Trao đổi nhu cầu cùng đội ngũ của chúng tôi.', ctaA: 'Liên hệ', ctaB: 'Đăng ký tư vấn', hrefA: '#lien-he', hrefB: '#lien-he' },
}
