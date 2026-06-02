'use client'

// PayoffDiagram — recharts CFMM curve client island (DEFI-04).
// Loaded via PayoffDiagramClient.tsx wrapper (owns dynamic(ssr:false) — B1).
// Renders ONLY with real instrument data — the page guards `instrument !== null`.
// CROSS-09: sr-only data table below the chart.
// SVG text: fill="var(--token)" — NOT Tailwind text-* (which sets CSS color, not SVG fill).
// Locked tokens: stroke="var(--accent-text)", grid vertical={false}, NO gradient fill.
// ResponsiveContainer parent MUST have h-[240px] sm:h-[320px] to avoid 0-height (B1/MINOR).

import { generatePayoffData } from '@/lib/apps/abrigo/payoff'
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

interface PayoffDiagramProps {
  /** Strike price (K) */
  strike: number
  /** Payoff slope coefficient (m) */
  slope: number
  /** Current market price — shown as a reference line */
  currentPrice: number
  /** 'es-CO' | 'en' — for locale-aware axis tick formatting */
  locale: string
}

function formatTick(locale: string) {
  return (value: number) =>
    new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 2 }).format(value)
}

export function PayoffDiagram({ strike, slope, currentPrice, locale }: PayoffDiagramProps) {
  const data = generatePayoffData(strike, slope)

  const ariaLabel = locale.startsWith('es')
    ? `Diagrama de rentabilidad — precio de activación ${strike}`
    : `Payoff diagram — strike price ${strike}`

  // sr-only table data — CROSS-09 accessibility requirement.
  // Sampled at every 5th point to keep the DOM manageable.
  const tableData = data.filter((_, i) => i % 5 === 0)

  const tickFormatter = formatTick(locale)
  const priceLabel = locale.startsWith('es') ? 'Precio' : 'Price'
  const payoffLabel = locale.startsWith('es') ? 'Cobertura' : 'Payoff'
  const strikeLabel = locale.startsWith('es') ? 'Activación' : 'Strike'
  const currentLabel = locale.startsWith('es') ? 'Actual' : 'Current'

  return (
    <div>
      {/* Sized parent + a11y wrapper — ResponsiveContainer height="100%" needs a parent with a
          RESOLVED height; a percentage height on height:auto resolves to 0px.
          Use a fixed h-* class (h-[240px] sm:h-[320px]). role="img" + aria-label on the
          outer div (recharts ResponsiveContainer does not forward ARIA props). */}
      <div className="h-[240px] sm:h-[320px]" role="img" aria-label={ariaLabel}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
            <CartesianGrid stroke="var(--border-default)" strokeOpacity={0.4} vertical={false} />
            <XAxis
              dataKey="price"
              type="number"
              domain={['auto', 'auto']}
              tickFormatter={tickFormatter}
              tick={{
                fill: 'var(--text-muted)',
                fontSize: 14,
                fontFamily: 'var(--font-plex-sans)',
              }}
              axisLine={{ stroke: 'var(--border-default)' }}
              tickLine={false}
            >
              {/* SVG text: fill="var(--text-muted)" — NOT Tailwind text-* */}
              <text
                x="50%"
                y={30}
                textAnchor="middle"
                fill="var(--text-muted)"
                fontSize={12}
                fontFamily="var(--font-plex-sans)"
              >
                {priceLabel}
              </text>
            </XAxis>
            <YAxis
              dataKey="payoff"
              tickFormatter={tickFormatter}
              tick={{
                fill: 'var(--text-muted)',
                fontSize: 14,
                fontFamily: 'var(--font-plex-sans)',
              }}
              axisLine={{ stroke: 'var(--border-default)' }}
              tickLine={false}
              width={60}
            />
            {/* Strike reference line — text annotation via SVG text fill="var(--text-secondary)" */}
            <ReferenceLine
              x={strike}
              stroke="var(--text-secondary)"
              strokeDasharray="4 4"
              label={{
                value: strikeLabel,
                fill: 'var(--text-secondary)',
                fontSize: 12,
                fontFamily: 'var(--font-plex-sans)',
              }}
            />
            {/* Current price reference line — accent-text (clears WCAG 1.4.11 3:1 non-text) */}
            <ReferenceLine
              x={currentPrice}
              stroke="var(--accent-text)"
              strokeDasharray="3 3"
              label={{
                value: currentLabel,
                fill: 'var(--accent-text)',
                fontSize: 12,
                fontFamily: 'var(--font-plex-sans)',
              }}
            />
            {/* CFMM payoff curve — accent-text stroke (WCAG 1.4.11 non-text 3:1 cleared; axe pass) */}
            <Line
              type="linear"
              dataKey="payoff"
              stroke="var(--accent-text)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: 'var(--accent-text)' }}
            />
            <Tooltip
              contentStyle={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius)',
                fontFamily: 'var(--font-plex-sans)',
                fontSize: 13,
                color: 'var(--text-primary)',
              }}
              formatter={(value) => [
                typeof value === 'number' ? tickFormatter(value) : String(value),
                payoffLabel,
              ]}
              labelFormatter={(label) =>
                `${priceLabel}: ${typeof label === 'number' ? tickFormatter(label) : String(label)}`
              }
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* sr-only data table — CROSS-09 accessibility */}
      <table className="sr-only">
        <caption>{ariaLabel}</caption>
        <thead>
          <tr>
            <th scope="col">{priceLabel}</th>
            <th scope="col">{payoffLabel}</th>
          </tr>
        </thead>
        <tbody>
          {tableData.map(({ price, payoff }) => (
            <tr key={price}>
              <td>{tickFormatter(price)}</td>
              <td>{tickFormatter(payoff)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
