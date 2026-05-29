// ArticleTOC — RSC. Builds an H2/H3 table of contents from `entry.toc`, the
// s.toc() field produced by Velite (Plan A added it to the collection schema).
// We do NOT hand-roll heading extraction from rehype-slug anchors — entry.toc is
// the canonical data source.
//
// HARD RULE (spec §3.2): the TOC is NEVER a collapsible disclosure. On lg+ it
// renders as a sticky rail; on narrow viewports it renders inline-expanded.
// No JS toggle, no disclosure/summary element.

// s.toc() node shape: { title, url, items: TocNode[] } (recursive).
export interface TocNode {
  title: string
  url: string
  items?: TocNode[]
}

export interface ArticleTOCProps {
  toc: TocNode[]
  /** Translated "On this page" / "En esta página" heading */
  label: string
}

function TocList({ nodes }: { nodes: TocNode[] }): React.JSX.Element {
  return (
    <ol className="m-0 list-none space-y-1 p-0">
      {nodes.map((node) => (
        <li key={node.url}>
          <a
            href={node.url}
            className="block text-sm text-text-secondary underline-offset-2 hover:text-accent-default hover:underline"
          >
            {node.title}
          </a>
          {node.items && node.items.length > 0 ? (
            <div className="ml-3 mt-1">
              <TocList nodes={node.items} />
            </div>
          ) : null}
        </li>
      ))}
    </ol>
  )
}

export function ArticleTOC({ toc, label }: ArticleTOCProps): React.JSX.Element | null {
  // No headings → no TOC rail.
  if (!toc || toc.length === 0) return null

  return (
    <nav
      aria-label={label}
      className="research-toc lg:sticky lg:top-24 lg:self-start"
      data-testid="article-toc"
    >
      <p className="mb-2 font-mono text-xs uppercase tracking-wider text-text-muted">{label}</p>
      <TocList nodes={toc} />
    </nav>
  )
}
