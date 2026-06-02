// @vitest-environment jsdom
// DEFI-02/CROSS-09: WalletPanel readOnly renders READ_ONLY state (Wave 2).
// WalletPanel calls useAccount + useSwitchChain unconditionally (React hook rules).
// wagmi and @rainbow-me/rainbowkit are mocked so the component renders in unit tests
// without a provider tree.
// CROSS-09 anti-fishing discipline: pills always encode color + icon + text, never color alone.
import '@testing-library/jest-dom/vitest'
import { WalletPanel, type WalletPanelStrings } from '@/components/defi/WalletPanel'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

// Mock wagmi hooks — WalletPanel calls these unconditionally (hook rules).
// readOnly path never uses the returned values, but hooks must still be called.
vi.mock('wagmi', () => ({
  useAccount: () => ({ status: 'disconnected', chain: undefined }),
  useSwitchChain: () => ({ switchChain: vi.fn() }),
}))

// Mock RainbowKit ConnectButton — not needed in read-only path but imported by WalletPanel.
vi.mock('@rainbow-me/rainbowkit', () => ({
  ConnectButton: () => null,
}))

// Full strings fixture satisfying the WalletPanelStrings interface (Wave 2 shape).
const STRINGS: WalletPanelStrings = {
  disconnectedPrompt: 'Conecta tu billetera para ver tu posición',
  connectLabel: 'Conectar billetera',
  connectingLabel: 'Conectando…',
  wrongChainLabel: 'Cambia a una red compatible',
  wrongChainExplanation: 'Estás en {chain}. Abrigo opera en Celo.',
  switchNetworkLabel: 'Cambiar red',
  connectedReadyLabel: 'Posición actual',
  readOnlyLabel: 'sin transacción — fork simulado',
  statusLabels: {
    DISCONNECTED: 'Desconectado',
    CONNECTING: 'Conectando',
    CONNECTED_WRONG_CHAIN: 'Red incorrecta',
    CONNECTED_READY: 'Conectado',
    READ_ONLY: 'Solo lectura',
  },
}

const READ_ONLY_LABEL = 'Solo lectura'

describe('WalletPanel readOnly — READ_ONLY state rendering', () => {
  it('renders the READ_ONLY pill text', () => {
    render(<WalletPanel strings={STRINGS} readOnly />)
    expect(screen.getByText(READ_ONLY_LABEL)).toBeInTheDocument()
  })

  it('does NOT render the CONNECTED_READY label in readOnly mode', () => {
    render(<WalletPanel strings={STRINGS} readOnly />)
    expect(screen.queryByText(STRINGS.connectedReadyLabel)).not.toBeInTheDocument()
  })

  it('does NOT render the "Conectar billetera" button in readOnly mode', () => {
    render(<WalletPanel strings={STRINGS} readOnly />)
    expect(screen.queryByText(STRINGS.connectLabel)).not.toBeInTheDocument()
  })

  it('READ_ONLY pill is visible with icon+text (CROSS-09 invariant)', () => {
    render(<WalletPanel strings={STRINGS} readOnly />)
    // CROSS-09: status pills always encode color + icon + text, never color alone.
    const pill = screen.getByText(READ_ONLY_LABEL)
    expect(pill).toBeVisible()
  })
})
