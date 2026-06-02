// @vitest-environment jsdom
// DEFI-06 (Wave 3): WalletPanel scoped role=status live region + absence of panel-wide aria-atomic.
//
// What this tests:
//   (a) A [role="status"][aria-live="polite"] node exists and contains the current state label.
//   (b) The outer wrapper div does NOT have aria-atomic.
//   (c) Re-render disconnected→connecting updates the status node's text content.
//
// What this does NOT test (jsdom mock limitation):
//   - RainbowKit's real accessible name resolution (ConnectButton is mocked).
//   - Focus movement (jsdom doesn't implement focus management reliably across re-renders).
//   - Real screen-reader speech output — that's the Accessibility Auditor's job in Task 3.
//
// Mock strategy follows wallet-read-only.test.tsx:
//   - wagmi hooks mocked statically (overridden per test via module mock state).
//   - ConnectButton replaced with <button>connect</button>.

import '@testing-library/jest-dom/vitest'
import { WalletPanel, type WalletPanelStrings } from '@/components/defi/WalletPanel'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

// --- Wagmi mock (controllable via module state) ---
let mockWagmiStatus: 'disconnected' | 'connecting' | 'reconnecting' | 'connected' = 'disconnected'
let mockWagmiChain: { id: number; name: string } | undefined = undefined

vi.mock('wagmi', () => ({
  useAccount: () => ({ status: mockWagmiStatus, chain: mockWagmiChain }),
  useSwitchChain: () => ({ switchChain: vi.fn() }),
}))

// Mock RainbowKit ConnectButton — WalletPanel imports it unconditionally.
vi.mock('@rainbow-me/rainbowkit', () => ({
  ConnectButton: () => <button type="button">connect</button>,
}))

// Full WalletPanelStrings fixture (Wave 2 shape).
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

// Helper: get the scoped status node (<output> — explicit role="status" aria-live="polite").
function getStatusNode(): HTMLOutputElement | null {
  return document.querySelector('output')
}

describe('WalletPanel DEFI-06 — scoped <output> live region (implicit role=status + explicit aria-live + lang)', () => {
  it('(a) an <output> element (implicit role=status) with explicit aria-live=polite exists in DISCONNECTED state', () => {
    mockWagmiStatus = 'disconnected'
    mockWagmiChain = undefined

    render(<WalletPanel strings={STRINGS} />)

    const statusNode = getStatusNode()
    expect(statusNode).not.toBeNull()
    expect(statusNode).toBeInTheDocument()
    // role="status" is IMPLICIT on <output> (HTML-AAM).
    // Biome's noRedundantRoles + useSemanticElements correctly block an explicit DOM attribute.
    // Defense-in-depth: explicit aria-live="polite" (not all AT stacks apply implicit live region).
    // The implicit role is verified via element type (output = status in HTML-AAM).
    expect(statusNode?.getAttribute('role')).toBeNull()
    expect(statusNode?.getAttribute('aria-live')).toBe('polite')
    expect(statusNode?.tagName.toLowerCase()).toBe('output')
  })

  it('(a) lang defaults to es-CO on the <output> node (WCAG 3.1.2)', () => {
    mockWagmiStatus = 'disconnected'
    mockWagmiChain = undefined

    render(<WalletPanel strings={STRINGS} />)

    const statusNode = getStatusNode()
    expect(statusNode?.getAttribute('lang')).toBe('es-CO')
  })

  it('(a) lang prop overrides default (en locale path)', () => {
    mockWagmiStatus = 'disconnected'
    mockWagmiChain = undefined

    render(<WalletPanel strings={STRINGS} lang="en" />)

    const statusNode = getStatusNode()
    expect(statusNode?.getAttribute('lang')).toBe('en')
  })

  it('(a) the <output> node contains ONLY the state label text (DISCONNECTED)', () => {
    mockWagmiStatus = 'disconnected'
    mockWagmiChain = undefined

    render(<WalletPanel strings={STRINGS} />)

    const statusNode = getStatusNode()
    expect(statusNode?.textContent?.trim()).toBe(STRINGS.statusLabels.DISCONNECTED)
  })

  it('(a) the <output> node contains the state label text (CONNECTING)', () => {
    mockWagmiStatus = 'connecting'
    mockWagmiChain = undefined

    render(<WalletPanel strings={STRINGS} />)

    const statusNode = getStatusNode()
    expect(statusNode?.textContent?.trim()).toBe(STRINGS.statusLabels.CONNECTING)
  })

  it('(a) the <output> node contains the state label text (READ_ONLY via prop)', () => {
    // readOnly=true forces READ_ONLY regardless of wagmi state
    mockWagmiStatus = 'disconnected'
    mockWagmiChain = undefined

    render(<WalletPanel strings={STRINGS} readOnly />)

    const statusNode = getStatusNode()
    expect(statusNode?.textContent?.trim()).toBe(STRINGS.statusLabels.READ_ONLY)
  })

  it('(b) the outer wrapper div does NOT have aria-atomic or aria-live', () => {
    mockWagmiStatus = 'disconnected'
    mockWagmiChain = undefined

    const { container } = render(<WalletPanel strings={STRINGS} />)

    // The outermost rendered element (the div.space-y-3) must not carry aria-atomic or aria-live.
    const outerDiv = container.firstElementChild
    expect(outerDiv?.tagName).toBe('DIV')
    expect(outerDiv?.hasAttribute('aria-atomic')).toBe(false)
    expect(outerDiv?.hasAttribute('aria-live')).toBe(false)
  })

  it('(c) status node text updates when state changes from DISCONNECTED to CONNECTING', () => {
    // Initial render: DISCONNECTED
    mockWagmiStatus = 'disconnected'
    mockWagmiChain = undefined

    const { rerender } = render(<WalletPanel strings={STRINGS} />)

    let statusNode = getStatusNode()
    expect(statusNode?.textContent?.trim()).toBe(STRINGS.statusLabels.DISCONNECTED)

    // Simulate state change: wagmi returns 'connecting'
    mockWagmiStatus = 'connecting'
    rerender(<WalletPanel strings={STRINGS} />)

    statusNode = getStatusNode()
    expect(statusNode?.textContent?.trim()).toBe(STRINGS.statusLabels.CONNECTING)
  })

  it('(c) status node text updates from CONNECTING to CONNECTED_READY', () => {
    mockWagmiStatus = 'connecting'
    mockWagmiChain = undefined

    const { rerender } = render(<WalletPanel strings={STRINGS} />)

    let statusNode = getStatusNode()
    expect(statusNode?.textContent?.trim()).toBe(STRINGS.statusLabels.CONNECTING)

    // Wallet connects successfully on Celo
    mockWagmiStatus = 'connected'
    mockWagmiChain = { id: 42220, name: 'Celo' }
    rerender(<WalletPanel strings={STRINGS} />)

    statusNode = getStatusNode()
    expect(statusNode?.textContent?.trim()).toBe(STRINGS.statusLabels.CONNECTED_READY)
  })
})
