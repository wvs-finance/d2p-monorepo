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
  // biome-ignore lint/suspicious/noExplicitAny: webpack config type varies by Next.js internals
  webpack: (config: any) => {
    config.plugins.push(new VeliteWebpackPlugin())
    return config
  },
}

export default withNextIntl(nextConfig)
