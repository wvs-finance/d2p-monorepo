// arXiv URL derivation — pure string concat, NO network fetch.
//
// Hermetic builds (spec §4): the reading page derives the canonical arXiv abstract
// and PDF URLs from the stored `arxiv_id` at render time. We never fetch arXiv at
// build time — that would make the build non-deterministic and offline-hostile.
//
// arxiv_id format is validated upstream in velite.config.ts
// (/^\d{4}\.\d{4,5}(v\d+)?$/ — post-2007 identifiers only).

export interface ArxivUrls {
  /** Canonical abstract landing page */
  abs: string
  /** Direct PDF */
  pdf: string
}

export function deriveArxivUrls(id: string): ArxivUrls {
  return {
    abs: `https://arxiv.org/abs/${id}`,
    pdf: `https://arxiv.org/pdf/${id}`,
  }
}
