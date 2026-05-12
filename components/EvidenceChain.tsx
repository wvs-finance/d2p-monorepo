// Server Component — no 'use client'
import { BetaCIChart } from '@/components/BetaCIChart'
import { ReplicationHash } from '@/components/ReplicationHash'

export interface EvidenceChainIteration {
  slug: string
  version: number
  status: 'PASS' | 'FAIL' | 'PARKED' | 'IN_PROGRESS'
  title_es: string
  title_en: string
  beta?: number
  ci_lower?: number
  ci_upper?: number
  p_value?: number
  sample_size?: number
  replication_hash?: string
  notebook_url?: string
  dataset_ref?: string
  analysis_date: Date
  disposition_memo?: string
  code: string
}

export interface EvidenceChainProps {
  iteration: EvidenceChainIteration
  /** next-intl translator passed from RSC caller */
  t: (key: string) => string
}

function formatPValue(p: number): string {
  return p < 1e-4 ? p.toExponential(2) : p.toFixed(4)
}

export function EvidenceChain({ iteration, t }: EvidenceChainProps) {
  const { beta, ci_lower, ci_upper, p_value, sample_size, replication_hash } = iteration

  const hasBeta = beta != null
  const hasCI = ci_lower != null && ci_upper != null
  const hasBetaChart = hasBeta && hasCI

  return (
    <section aria-labelledby="evidence-heading">
      <h2 id="evidence-heading" className="text-lg font-semibold text-text-primary mb-3">
        {t('iterations.detail.evidence.heading')}
      </h2>
      <dl className="divide-y divide-border-default">
        {hasBeta && (
          <div className="flex flex-col sm:flex-row gap-1 sm:gap-4 py-3">
            <dt className="text-sm text-text-secondary min-w-[140px] shrink-0">
              {t('iterations.detail.evidence.beta_label')}
            </dt>
            <dd className="font-mono text-sm text-text-primary">
              {beta > 0 ? '+' : ''}
              {beta.toFixed(6)}
              {hasBetaChart && (
                <BetaCIChart
                  beta={beta}
                  ciLower={ci_lower as number}
                  ciUpper={ci_upper as number}
                />
              )}
            </dd>
          </div>
        )}
        {hasCI && (
          <div className="flex flex-col sm:flex-row gap-1 sm:gap-4 py-3">
            <dt className="text-sm text-text-secondary min-w-[140px] shrink-0">
              {t('iterations.detail.evidence.ci_label')}
            </dt>
            <dd className="font-mono text-sm text-text-primary">
              [{(ci_lower as number).toFixed(4)}, {(ci_upper as number).toFixed(4)}]
            </dd>
          </div>
        )}
        {p_value != null && (
          <div className="flex flex-col sm:flex-row gap-1 sm:gap-4 py-3">
            <dt className="text-sm text-text-secondary min-w-[140px] shrink-0">
              {t('iterations.detail.evidence.pvalue_label')}
            </dt>
            <dd className="font-mono text-sm text-text-primary">{formatPValue(p_value)}</dd>
          </div>
        )}
        {sample_size != null && (
          <div className="flex flex-col sm:flex-row gap-1 sm:gap-4 py-3">
            <dt className="text-sm text-text-secondary min-w-[140px] shrink-0">
              {t('iterations.detail.evidence.sample_size_label')}
            </dt>
            <dd className="font-mono text-sm text-text-primary">N = {sample_size}</dd>
          </div>
        )}
        {replication_hash != null && (
          <div className="flex flex-col sm:flex-row gap-1 sm:gap-4 py-3">
            <dt className="text-sm text-text-secondary min-w-[140px] shrink-0">
              {t('iterations.detail.evidence.replication_label')}
            </dt>
            <dd className="font-mono text-sm text-text-primary">
              <ReplicationHash
                hash={replication_hash}
                copyLabel={t('iterations.detail.replication.copy.copy_button_aria')}
                copiedLabel={t('iterations.detail.replication.copied_toast')}
              />
            </dd>
          </div>
        )}
      </dl>
    </section>
  )
}
