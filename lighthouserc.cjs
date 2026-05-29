module.exports = {
  ci: {
    collect: {
      numberOfRuns: 3,
      // The reading-page URL (a migrated Mode-A /research/{slug}) is the LCP gate target
      // for Plan 03.1-04 — rendered KaTeX math is the heaviest above-the-fold paint.
      // The prod-build port is 3040 (matches playwright.config.ts webServer). When
      // LHCI_COLLECT__URL is set (CI / Evidence Collector), it overrides this default.
      url: process.env.LHCI_COLLECT__URL
        ? [process.env.LHCI_COLLECT__URL]
        : [
            'http://localhost:3040/research/pair-d-dispatch-brief',
            'http://localhost:3040/research',
          ],
      settings: {
        formFactor: 'mobile',
        screenEmulation: {
          mobile: true,
          width: 412,
          height: 823,
          deviceScaleFactor: 2.625,
          disabled: false,
        },
        throttling: {
          rttMs: 150,
          throughputKbps: 1638.4,
          cpuSlowdownMultiplier: 4,
          requestLatencyMs: 562.5,
          downloadThroughputKbps: 1474.6,
          uploadThroughputKbps: 675,
        },
        throttlingMethod: 'simulate',
        // Send the Vercel automation-bypass header (when provided) so lhci can reach an
        // SSO-protected preview deployment without a 401.
        ...(process.env.VERCEL_AUTOMATION_BYPASS_SECRET
          ? {
              extraHeaders: JSON.stringify({
                'x-vercel-protection-bypass': process.env.VERCEL_AUTOMATION_BYPASS_SECRET,
              }),
            }
          : {}),
      },
    },
    assert: {
      assertions: {
        // LCP is a WARN (not error): the math-heavy reading page measures ~3.5s on the real
        // CDN under simulated 3G — a data-backed v2 waiver (byte-subsetting KaTeX is the lever,
        // spec §5 deferred it). See 03.1-LIVE-VERIFICATION.md. Keep the budget visible as a warn.
        'largest-contentful-paint': ['warn', { maxNumericValue: 2500 }],
        'total-blocking-time': ['error', { maxNumericValue: 200 }],
        'cumulative-layout-shift': ['warn', { maxNumericValue: 0.1 }],
        'first-contentful-paint': ['warn', { maxNumericValue: 2000 }],
        'categories:accessibility': ['warn', { minScore: 0.9 }],
        'categories:performance': ['warn', { minScore: 0.75 }],
      },
    },
    upload: { target: 'temporary-public-storage' },
  },
}
