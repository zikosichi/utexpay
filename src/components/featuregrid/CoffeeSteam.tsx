import { useEffect, useRef } from 'react'

/**
 * Steam rising off the espresso in the spending tile.
 *
 * A small particle system on a 2D canvas: each wisp is a soft, warm-white sprite that is born just
 * above the crema, rises, is pushed sideways by a slow time-varying flow field, stretches and
 * widens as it thins out, and fades. Everything is drawn additively at very low alpha so it reads
 * as air moving over the cup rather than as a graphic. The cup is located in the scene image's own
 * pixel space and mapped through the image's rendered box (including `object-fit: cover`), so the
 * steam stays on the cup at every breakpoint.
 */

/** Cup geometry in the 1122 × 1402 source image (`coffee-card-scene`): the crema's centre and the rim's half-width. */
const CUP = { x: 805, y: 790, halfWidth: 150 }
const SPRITE = 96

interface Wisp {
  x0: number; y0: number; age: number; life: number; rise: number; size: number; grow: number
  alpha: number; sway: number; phase: number; stretch: number; curl: number
}

const rand = (min: number, max: number) => min + Math.random() * (max - min)

function makeSprite() {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = SPRITE
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas
  const half = SPRITE / 2
  const g = ctx.createRadialGradient(half, half, 0, half, half, half)
  g.addColorStop(0, 'rgba(255, 240, 222, 1)')
  g.addColorStop(0.35, 'rgba(255, 240, 222, .45)')
  g.addColorStop(0.7, 'rgba(255, 240, 222, .1)')
  g.addColorStop(1, 'rgba(255, 240, 222, 0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, SPRITE, SPRITE)
  return canvas
}

function spawn(origin: { x: number; y: number; halfWidth: number }, scale: number, age = 0): Wisp {
  const spread = rand(-1, 1)
  // Two populations: broad haze that reads as warm air, and thin threads that give the steam its shape.
  const thread = Math.random() < 0.45
  return {
    x0: origin.x + spread * origin.halfWidth * (thread ? 0.4 : 0.55),
    y0: origin.y - rand(0, 6) * scale,
    age,
    life: thread ? rand(2.6, 4) : rand(3.2, 5.2),
    rise: (thread ? rand(30, 42) : rand(24, 36)) * scale,
    size: (thread ? rand(7, 11) : rand(16, 24)) * scale,
    grow: thread ? rand(1.4, 2.2) : rand(2.2, 3.4),
    alpha: thread ? rand(0.07, 0.11) : rand(0.04, 0.075),
    sway: (thread ? rand(12, 20) : rand(9, 16)) * scale,
    phase: rand(0, Math.PI * 2),
    stretch: thread ? rand(3.2, 4.6) : rand(1.5, 2.1),
    curl: thread ? rand(-0.5, 0.5) : rand(-0.15, 0.15),
  }
}

export function CoffeeSteam() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    const tile = canvas?.parentElement
    const scene = tile?.querySelector<HTMLImageElement>('.fg-spending-scene')
    const ctx = canvas?.getContext('2d')
    if (!canvas || !tile || !scene || !ctx) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sprite = makeSprite()
    const wisps: Wisp[] = []
    let origin = { x: 0, y: 0, halfWidth: 0 }
    let scale = 1
    let dpr = 1
    let width = 0
    let height = 0
    let frame = 0
    let last = 0
    let visible = false
    let count = 0

    /** Map the cup from image pixels to tile pixels through the image's rendered, object-fit: cover box. */
    const measure = () => {
      const tileRect = tile.getBoundingClientRect()
      const imgRect = scene.getBoundingClientRect()
      // Not naturalWidth: Chrome divides that by the chosen srcset candidate's density.
      const natural = { w: 1122, h: 1402 }
      const s = Math.max(imgRect.width / natural.w, imgRect.height / natural.h)
      const [px = '50%', py = '50%'] = getComputedStyle(scene).objectPosition.split(' ')
      const fx = parseFloat(px) / 100
      const fy = parseFloat(py) / 100
      const offsetX = (imgRect.width - natural.w * s) * fx
      const offsetY = (imgRect.height - natural.h * s) * fy
      scale = s / (594 / natural.w)
      origin = {
        x: imgRect.left - tileRect.left + offsetX + CUP.x * s,
        y: imgRect.top - tileRect.top + offsetY + CUP.y * s,
        halfWidth: CUP.halfWidth * s,
      }
      width = tileRect.width
      height = tileRect.height
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      count = Math.round(22 * Math.min(1.4, Math.max(0.6, scale)))
    }

    const draw = (time: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, width, height)
      ctx.globalCompositeOperation = 'lighter'
      for (const w of wisps) {
        const p = w.age / w.life
        if (p >= 1) continue
        const envelope = Math.min(1, p / 0.14) * Math.pow(1 - Math.max(0, (p - 0.4) / 0.6), 1.6)
        // A slow flow field: two incommensurate sines in time, one in height, plus a hint of air drift.
        const y = w.y0 - w.rise * w.age - 0.5 * 4 * scale * w.age * w.age
        const t = time / 1000
        const flow = Math.sin(t * 0.7 + w.phase + y * 0.012) * 0.6 + Math.sin(t * 1.9 + w.phase * 1.7 - y * 0.02) * 0.4
        const x = w.x0 + (flow * w.sway + 5 * scale * w.age) * Math.min(1, 0.35 + p)
        const size = w.size * (1 + p * w.grow)
        const stretch = w.stretch - (w.stretch - 1) * p
        ctx.globalAlpha = w.alpha * envelope
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        ctx.translate(x, y)
        // Shear follows the flow so threads lean and curl with the air instead of standing upright.
        ctx.transform(1, 0, w.curl * flow * (0.4 + p), stretch, 0, 0)
        ctx.drawImage(sprite, -size / 2, -size / 2, size, size)
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.globalAlpha = 1
      ctx.globalCompositeOperation = 'source-over'
    }

    const step = (dt: number) => {
      for (const w of wisps) w.age += dt
      for (let i = wisps.length - 1; i >= 0; i--) if (wisps[i].age >= wisps[i].life) wisps.splice(i, 1)
      // Births are spaced by a little randomness so the column never pulses.
      while (wisps.length < count) wisps.push(spawn(origin, scale, wisps.length === 0 ? 0 : rand(-0.6, 0)))
    }

    const loop = (time: number) => {
      frame = 0
      if (!visible || document.hidden) return
      const dt = last ? Math.min(0.05, (time - last) / 1000) : 0
      last = time
      step(dt)
      draw(time)
      frame = requestAnimationFrame(loop)
    }

    const still = () => {
      // Reduced motion: one settled frame, no loop.
      wisps.length = 0
      for (let i = 0; i < count; i++) { const w = spawn(origin, scale); w.age = rand(0.2, w.life * 0.9); wisps.push(w) }
      draw(0)
    }

    const start = () => {
      if (reduced.matches) { still(); return }
      if (!frame) { last = 0; frame = requestAnimationFrame(loop) }
    }
    const stop = () => { cancelAnimationFrame(frame); frame = 0 }

    const observer = new IntersectionObserver(([entry]) => {
      visible = !!entry?.isIntersecting
      if (visible) start(); else stop()
    }, { threshold: 0.05 })
    const resize = new ResizeObserver(() => { measure(); if (reduced.matches) still() })
    const onVisibility = () => { if (document.hidden) stop(); else if (visible) start() }
    const onMotion = () => { stop(); if (visible) start() }

    // Seed the column so the first visible frame is not empty.
    measure()
    for (let i = 0; i < count; i++) { const w = spawn(origin, scale); w.age = rand(0, w.life); wisps.push(w) }
    if (scene.complete) measure(); else scene.addEventListener('load', measure, { once: true })
    observer.observe(tile)
    resize.observe(tile)
    document.addEventListener('visibilitychange', onVisibility)
    reduced.addEventListener('change', onMotion)
    return () => {
      stop(); observer.disconnect(); resize.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
      reduced.removeEventListener('change', onMotion)
      scene.removeEventListener('load', measure)
    }
  }, [])
  return <canvas ref={ref} className="fg-steam" aria-hidden="true" />
}
