// Server Component — no 'use client'
// Pattern: inline SVG horizontal range bar for β + 95% CI visualization.
// ~30 lines of SVG math per RESEARCH.md Pattern 4.

export interface BetaCIChartProps {
  beta: number
  ciLower: number
  ciUpper: number
  /** Override the default aria-label */
  label?: string
}

const W = 300
const H = 60
const PAD = 20

function toX(value: number, axisMin: number, axisMax: number): number {
  return PAD + ((value - axisMin) / (axisMax - axisMin)) * (W - 2 * PAD)
}

export function BetaCIChart({ beta, ciLower, ciUpper, label }: BetaCIChartProps) {
  const axisMax = 1.5 * Math.max(Math.abs(ciLower), Math.abs(ciUpper))
  const axisMin = -axisMax

  const betaX = toX(beta, axisMin, axisMax)
  const ciLowerX = toX(ciLower, axisMin, axisMax)
  const ciUpperX = toX(ciUpper, axisMin, axisMax)
  const zeroX = toX(0, axisMin, axisMax)
  const midY = H / 2

  const ariaLabel =
    label ?? `β = ${beta.toFixed(4)}, 95% CI [${ciLower.toFixed(4)}, ${ciUpper.toFixed(4)}]`

  return (
    <figure className="my-2">
      <svg
        viewBox="0 0 300 60"
        width={W}
        height={H}
        role="img"
        aria-label={ariaLabel}
        className="overflow-visible"
      >
        {/* Zero reference line — dashed */}
        <line
          x1={zeroX}
          y1={PAD}
          x2={zeroX}
          y2={H - PAD}
          stroke="currentColor"
          strokeOpacity={0.3}
          strokeDasharray="3 3"
          strokeWidth={1}
        />
        {/* CI whisker horizontal line */}
        <line
          x1={ciLowerX}
          y1={midY}
          x2={ciUpperX}
          y2={midY}
          stroke="currentColor"
          strokeWidth={2}
        />
        {/* CI lower cap */}
        <line
          x1={ciLowerX}
          y1={midY - 5}
          x2={ciLowerX}
          y2={midY + 5}
          stroke="currentColor"
          strokeWidth={2}
        />
        {/* CI upper cap */}
        <line
          x1={ciUpperX}
          y1={midY - 5}
          x2={ciUpperX}
          y2={midY + 5}
          stroke="currentColor"
          strokeWidth={2}
        />
        {/* β point */}
        <circle cx={betaX} cy={midY} r={5} fill="var(--color-accent-default)" stroke="none" />
      </svg>
      <table className="sr-only">
        <tbody>
          <tr>
            <th scope="row">β</th>
            <td>{beta.toFixed(4)}</td>
          </tr>
          <tr>
            <th scope="row">CI lower</th>
            <td>{ciLower.toFixed(4)}</td>
          </tr>
          <tr>
            <th scope="row">CI upper</th>
            <td>{ciUpper.toFixed(4)}</td>
          </tr>
        </tbody>
      </table>
      <figcaption className="sr-only">{ariaLabel}</figcaption>
    </figure>
  )
}
