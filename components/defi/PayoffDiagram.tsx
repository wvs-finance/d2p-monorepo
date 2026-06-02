'use client'

// PayoffDiagram — recharts CFMM curve client island (DEFI-04).
// Loaded via PayoffDiagramClient.tsx wrapper (owns dynamic(ssr:false) — B1).
// Wave 2: props changed to data: PayoffPoint[] + ariaLabel + strikeRef?/currentPriceRef? + isSchematic?
//   - `data` is passed in from the caller (RSC computes it) — no internal generatePayoffData call
//   - type="monotone" for smooth convex curve rendering (not linear kink)
//   - strikeRef rendered only when provided; currentPriceRef rendered only when provided
//   - isSchematic: shows "(esquemático)" annotation; caller labels the ariaLabel accordingly
//   - curve-aware sr-only table samples the data array (multiple rows reflecting curve shape)
//   - strokeWidth 2.5 for perceptual prominence (deferred fix from 05.1-00 Wave-2 note)
// CROSS-09: sr-only data table below the chart.
// SVG text: fill="var(--token)" — NOT Tailwind text-* (which sets CSS color, not SVG fill).
// Locked tokens: stroke="var(--accent-text)", grid vertical={false}, NO gradient fill.
// ResponsiveContainer parent MUST have h-[240px] sm:h-[320px] to avoid 0-height (B1/MINOR).

import type { PayoffPoint } from '@/lib/apps/abrigo/payoff'
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
  /** Pre-computed payoff data points — caller (RSC) generates from payoff.ts */
  data: PayoffPoint[]
  /** Strike price reference line — rendered only when provided */
  strikeRef?: number
  /** Current-price reference line — rendered only when provided */
  currentPriceRef?: number
  /** Full aria-label for the chart container (caller composes locale-aware string) */
  ariaLabel: string
  /** 'es-CO' | 'en' — for locale-aware axis tick formatting */
  locale: string
  /** When true, renders a "(esquemático)" / "(schematic)" SVG annotation */
  isSchematic?: boolean
}

function formatTick(locale: string) {
  return (value: number) =>
    new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 2 }).format(value)
}

export function PayoffDiagram({
  data,
  strikeRef,
  currentPriceRef,
  ariaLabel,
  locale,
  isSchematic,
}: PayoffDiagramProps) {
  // sr-only table: sample every Nth point to reflect curve shape (not just endpoints).
  // With 200 points, every 10th gives 20 rows — enough to show convex rise+fall.
  const sampleStep = Math.max(1, Math.floor(data.length / 20))
  const tableData = data.filter((_, i) => i % sampleStep === 0)

  const tickFormatter = formatTick(locale)
  const priceLabel = locale.startsWith('es') ? 'Precio' : 'Price'
  const payoffLabel = locale.startsWith('es') ? 'Cobertura' : 'Payoff'
  const strikeLabel = locale.startsWith('es') ? 'Activación' : 'Strike'
  const currentLabel = locale.startsWith('es') ? 'Actual' : 'Current'
  const schematicLabel = locale.startsWith('es') ? '(esquemático)' : '(schematic)'

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

            {/* Strike reference line — rendered ONLY when strikeRef is provided */}
            {strikeRef !== undefined && (
              <ReferenceLine
                x={strikeRef}
                stroke="var(--text-secondary)"
                strokeDasharray="4 4"
                label={{
                  value: strikeLabel,
                  fill: 'var(--text-secondary)',
                  fontSize: 12,
                  fontFamily: 'var(--font-plex-sans)',
                }}
              />
            )}

            {/* Current price reference line — rendered ONLY when currentPriceRef is provided */}
            {currentPriceRef !== undefined && (
              <ReferenceLine
                x={currentPriceRef}
                stroke="var(--accent-text)"
                strokeDasharray="3 3"
                label={{
                  value: currentLabel,
                  fill: 'var(--accent-text)',
                  fontSize: 12,
                  fontFamily: 'var(--font-plex-sans)',
                }}
              />
            )}

            {/* CFMM payoff curve — accent-text stroke (WCAG 1.4.11 non-text 3:1 cleared; axe pass)
                type="monotone" produces a smooth convex curve (not linear kink between points).
                strokeWidth 2.5 for perceptual prominence (Wave-2 deferred fix from 05.1-00). */}
            <Line
              type="monotone"
              dataKey="payoff"
              stroke="var(--accent-text)"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4, fill: 'var(--accent-text)' }}
            />

            {/* Schematic annotation — only when isSchematic is true */}
            {isSchematic && (
              <text
                x="75%"
                y={24}
                textAnchor="middle"
                fill="var(--text-muted)"
                fontSize={11}
                fontFamily="var(--font-plex-sans)"
                fontStyle="italic"
              >
                {schematicLabel}
              </text>
            )}

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

      {/* sr-only data table — CROSS-09 accessibility.
          Samples data array so the table reflects the curve shape (rising/falling rows),
          not a single kink. Caption uses the caller-provided ariaLabel. */}
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
