'use client'

// Temporary scratch page for 05-02 Evidence Collector modal verification.
// DELETE after WAIVER-05-01 is cleared via screenshot.
import { ConnectButton } from '@rainbow-me/rainbowkit'

export default function ModalCheckPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-xl font-semibold">05-02 Modal Check</h1>
      <p className="text-sm text-secondary">
        Click the button to open the RainbowKit modal and verify the ochre theme.
      </p>
      <ConnectButton label="Conectar billetera" />
    </main>
  )
}
