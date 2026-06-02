// @vitest-environment jsdom
// Wave 0 RED stub — DEFI-02/CROSS-09: WalletPanel readOnly renders READ_ONLY state.
// WalletPanel exists (05-04) but the `readOnly` prop is added in Wave 2.
// These tests are intentionally RED: WalletPanel has no readOnly prop yet so
// the READ_ONLY pill text will not appear in the rendered output.
// CROSS-09 anti-fishing discipline: pills always encode color + icon + text, never color alone.
import '@testing-library/jest-dom/vitest'
import { WalletPanel, type WalletPanelStrings } from '@/components/defi/WalletPanel'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

// Full strings fixture satisfying the existing WalletPanelStrings interface.
const STRINGS: WalletPanelStrings = {
  disconnectedPrompt: 'Conecta tu billetera para ver tu posición',
  connectLabel: 'Conectar billetera',
  connectingLabel: 'Conectando…',
  wrongChainLabel: 'Cambia a una red compatible',
  wrongChainExplanation: 'Estás en {chain}. Abrigo opera en Celo.',
  switchNetworkLabel: 'Cambiar red',
  connectedReadyLabel: 'Posición actual',
  statusLabels: {
    DISCONNECTED: 'Desconectado',
    CONNECTING: 'Conectando',
    CONNECTED_WRONG_CHAIN: 'Red incorrecta',
    CONNECTED_READY: 'Conectado',
  },
}

const READ_ONLY_LABEL = 'Solo lectura'

describe('WalletPanel readOnly — READ_ONLY state rendering', () => {
  it('renders the READ_ONLY pill text (RED: readOnly prop not yet implemented)', () => {
    // @ts-expect-error readOnly prop is added in Wave 2 — intentional RED stub
    render(<WalletPanel strings={STRINGS} readOnly />)
    // This assertion FAILS until Wave 2 adds the readOnly prop and READ_ONLY state rendering.
    expect(screen.getByText(READ_ONLY_LABEL)).toBeInTheDocument()
  })

  it('does NOT render the CONNECTED_READY label in readOnly mode (RED)', () => {
    // @ts-expect-error readOnly prop is added in Wave 2 — intentional RED stub
    render(<WalletPanel strings={STRINGS} readOnly />)
    // In readOnly mode, CONNECTED_READY text must not appear.
    // RED: without readOnly support the component renders DISCONNECTED state (no CONNECTED_READY either).
    // This test will pass for the wrong reason until Wave 2 adds the readOnly guard.
    expect(screen.queryByText(STRINGS.connectedReadyLabel)).not.toBeInTheDocument()
  })

  it('does NOT render the "Conectar billetera" button in readOnly mode (RED)', () => {
    // @ts-expect-error readOnly prop is added in Wave 2 — intentional RED stub
    render(<WalletPanel strings={STRINGS} readOnly />)
    // In readOnly mode, no connect CTA should appear.
    // RED: without readOnly support, the DISCONNECTED state CTA may still render.
    expect(screen.queryByText(STRINGS.connectLabel)).not.toBeInTheDocument()
  })

  it('READ_ONLY pill is visible with icon+text (CROSS-09 invariant) (RED)', () => {
    // @ts-expect-error readOnly prop is added in Wave 2 — intentional RED stub
    render(<WalletPanel strings={STRINGS} readOnly />)
    // CROSS-09: status pills always encode color + icon + text, never color alone.
    const pill = screen.getByText(READ_ONLY_LABEL)
    expect(pill).toBeVisible()
  })
})
