import type { AnimationEvent, PointerEvent } from 'react'

/* Mark motion is started by the pointer entering a row and then left alone: the row keeps
   `is-playing` until every `mi*` keyframe inside it has finished, so leaving mid-way no longer
   snaps the mark to its rest pose — the drawing, growing or dropping simply completes. Every
   mark keyframe ends on the rest pose, so completion is the smooth return. */
export function playMark(event: PointerEvent<HTMLElement>) {
  event.currentTarget.classList.add('is-playing')
}
export function settleMark(event: AnimationEvent<HTMLElement>) {
  const host = event.currentTarget
  if (!host.classList.contains('is-playing')) return
  const running = host.getAnimations({ subtree: true }).some((a) => a instanceof CSSAnimation && a.animationName.startsWith('mi') && a.playState === 'running')
  if (!running) host.classList.remove('is-playing')
}
