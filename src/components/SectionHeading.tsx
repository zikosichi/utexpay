import type { ReactNode } from 'react'
import './section-heading.css'

export function SectionHeading({ id, eyebrow, children, description, className = '' }: {
  id: string
  eyebrow: string
  children: ReactNode
  description: string
  className?: string
}) {
  return <header className={`section-heading ${className}`}>
    <p className="section-heading__eyebrow">{eyebrow}</p>
    <h2 className="section-heading__title" id={id}>{children}</h2>
    <p className="section-heading__description">{description}</p>
  </header>
}
