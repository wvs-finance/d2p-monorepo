// Figure — RSC. Semantic <figure>/<figcaption> with an auto-numbered caption.
//
// Numbering: a CSS counter on the article container increments per <figure> and
// prefixes the caption with "Figure N" / "Figura N" via the ::before pseudo-element
// defined in the reading-page styles. The component itself only carries the locale
// label word; the number is supplied by the counter so reorderings stay correct
// without manual renumbering.
//
// `fullwidth` opts the figure out of the ~64ch prose measure (wider bleed for
// charts / wide tables) per spec §6.

export interface FigureProps {
  /** Locale of the surrounding body — selects the caption word. Defaults to 'es'. */
  locale?: 'es' | 'en'
  /** Wider bleed beyond the 64ch prose measure */
  fullwidth?: boolean
  /** Caption text */
  caption?: React.ReactNode
  children?: React.ReactNode
}

export function Figure({
  locale = 'es',
  fullwidth = false,
  caption,
  children,
}: FigureProps): React.JSX.Element {
  return (
    <figure
      data-fullwidth={fullwidth ? '' : undefined}
      data-fig-label={locale === 'en' ? 'Figure' : 'Figura'}
      className={
        fullwidth ? 'research-figure my-8 w-full' : 'research-figure my-8 mx-auto max-w-[64ch]'
      }
    >
      {children}
      {caption ? <figcaption className="mt-2 text-sm text-text-muted">{caption}</figcaption> : null}
    </figure>
  )
}
