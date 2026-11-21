import type { ReactNode } from 'react'
import type { IndexerActivityStatus } from '@openreserve/contracts-sdk'
import { Icon } from './portal'
import type { iconPaths } from './icons'

type MetadataField = {
  label: string
  value: ReactNode
  icon?: keyof typeof iconPaths
  code?: string
}

export const indexerStatusLabels = {
  NOT_CONFIGURED: 'Chưa cấu hình',
  NOT_IMPLEMENTED: 'Chưa hỗ trợ',
  FRESH: 'Đã cập nhật',
  STALE: 'Chậm cập nhật',
  DOWN: 'Chưa kết nối được',
  INVALID_RESPONSE: 'Phản hồi không hợp lệ',
} satisfies Record<IndexerActivityStatus, string>

export function MetadataList({ fields, label }: { fields: readonly MetadataField[]; label: string }) {
  return <dl className="or-metadata" aria-label={label}>
    {fields.map(field => <div className="or-metadata-field" key={field.label}>
      <dt>{field.icon && <Icon name={field.icon} />}{field.label}</dt>
      <dd>{field.value}{field.code && <code>{field.code}</code>}</dd>
    </div>)}
  </dl>
}

export function agreementParties({ buyer, merchant }: { buyer: string; merchant: string }): MetadataField[] {
  return [
    { label: 'Người mua', icon: 'person', value: <code>{buyer}</code> },
    { label: 'Phòng tập', icon: 'storefront', value: <code>{merchant}</code> },
  ]
}
