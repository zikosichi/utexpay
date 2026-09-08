import type { ReactNode } from 'react'
import './panel-kit.css'

/**
 * A cut in the bronze face, glazed. Shared by all three boxes so a window on
 * Payments is physically the same object as one on Personal.
 */
export function PanelWindow({ children, className = '', as: Tag = 'div' }: {
  children: ReactNode
  className?: string
  as?: 'div' | 'li'
}) {
  return (
    <Tag className={`panel-window ${className}`}>
      <div className="panel-window-face">
        <div className="panel-window-grain" aria-hidden="true" />
        <div className="panel-window-sheen" aria-hidden="true" />
        <div className="panel-window-body">{children}</div>
      </div>
    </Tag>
  )
}
