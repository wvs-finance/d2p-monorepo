import './lib/env'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./i18n/request.ts')

// VeliteWebpackPlugin — integrated here so Plans 03/06/07 only create referenced source files
// Runs velite build before webpack compilation; handles watch mode in dev
class VeliteWebpackPlugin {
  static started = false
  // biome-ignore lint/suspicious/noExplicitAny: webpack Compiler type not available at config time
  apply(compiler: any) {
    compiler.hooks.beforeCompile.tapPromise('VeliteWebpackPlugin', async () => {
      if (VeliteWebpackPlugin.started) return
      VeliteWebpackPlugin.started = true
      const dev = compiler.options.mode === 'development'
      const { build } = await import('velite')
      await build({ watch: dev, clean: !dev })
    })
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    typedRoutes: true,
  },
  // TypeScript 5.9.3 on Node 25 triggers "Debug Failure" when the TS worker runs with default
  // memory limits. ignoreBuildErrors: true allows the build to complete in CI / local dev.
  // The typecheck is run separately via `pnpm tsc --noEmit` (with NODE_OPTIONS=--max-old-space-size=4096).
  typescript: {
    ignoreBuildErrors: true,
  },
  // biome-ignore lint/suspicious/noExplicitAny: webpack config type varies by Next.js internals
  webpack: (config: any) => {
    config.plugins.push(new VeliteWebpackPlugin())
    // Resolve @/.velite to a committed webpack-compatible shim (lib/velite-shim.ts).
    // Velite 0.3.x generates .velite/index.js using JSON import assertions ("with" clause)
    // that webpack 5 does not reliably process. The shim uses require() for stable resolution.
    // TypeScript types still come from .velite/index.d.ts via tsconfig paths.
    config.resolve.alias = {
      ...config.resolve.alias,
      '@/.velite': require('node:path').resolve(process.cwd(), 'lib/velite-shim.ts'),
    }
    return config
  },
}

export default withNextIntl(nextConfig)
