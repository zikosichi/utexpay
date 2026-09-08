import type { ComponentProps } from 'react'
import './button.css'

type ButtonStyle = {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'default' | 'md' | 'sm'
  className?: string
}

function buttonClass({ variant = 'primary', size = 'default', className = '' }: ButtonStyle) {
  return `utex-button utex-button--${variant} utex-button--${size} ${className}`.trim()
}

/** UTEX Button component set in Figma: 451:74. Native semantics stay intact. */
export function Button({ variant, size, className, type = 'button', ...props }: ComponentProps<'button'> & ButtonStyle) {
  return <button {...props} type={type} className={buttonClass({ variant, size, className })} />
}

export function ButtonLink({ variant, size, className, ...props }: ComponentProps<'a'> & ButtonStyle) {
  return <a {...props} className={buttonClass({ variant, size, className })} />
}
