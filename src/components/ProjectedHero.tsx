import { useEffect, useRef } from 'react'

import './projected-hero.css'

/** Width of the source render the face quads were measured against. */
const RENDER_WIDTH = 1672

/**
 * Hero built by projecting live HTML panels onto a pre-rendered 3D plate.
 *
 * The plate is a static render of the empty block structure; each product
 * panel is an HTML quad skewed with a matrix measured off that render, so
 * inside a face 1px == 1px of the source image (scaled by --k). Pointer
 * movement rotates the whole "world" in CSS perspective and offsets the
 * panels/card slightly for depth.
 */
export function ProjectedHero() {
  const heroRef = useRef<HTMLDivElement>(null)
  const worldRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const copyRef = useRef<HTMLDivElement>(null)
  const sheenRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const hero = heroRef.current
    const world = worldRef.current
    const stage = stageRef.current
    const copy = copyRef.current
    const sheen = sheenRef.current
    if (!hero || !world || !stage || !copy || !sheen) return

    // 1 unit inside a face == 1 pixel of the source render
    const setScale = () => {
      stage.style.setProperty('--k', String(stage.clientWidth / RENDER_WIDTH))
    }
    setScale()
    const ro = new ResizeObserver(setScale)
    ro.observe(stage)

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return () => ro.disconnect()
    }

    let tx = 0
    let ty = 0
    let cx = 0
    let cy = 0
    let active = false
    let raf: number | null = null

    const tick = () => {
      cx += (tx - cx) * 0.075
      cy += (ty - cy) * 0.075

      world.style.transform =
        `perspective(1900px) rotateY(${(cx * 2.4).toFixed(3)}deg)` +
        ` rotateX(${(-cy * 1.5).toFixed(3)}deg)` +
        ` translate3d(${(-cx * 16).toFixed(2)}px,${(-cy * 9).toFixed(2)}px,0)`

      stage.style.setProperty('--px', cx.toFixed(4))
      stage.style.setProperty('--py', cy.toFixed(4))

      copy.style.transform = `translate3d(${(cx * 7).toFixed(2)}px,${(cy * 4).toFixed(2)}px,0)`

      if (Math.abs(tx - cx) > 0.0006 || Math.abs(ty - cy) > 0.0006 || active) {
        active = false
        raf = requestAnimationFrame(tick)
      } else {
        raf = null
      }
    }

    const onMove = (e: MouseEvent) => {
      const r = hero.getBoundingClientRect()
      tx = (e.clientX - r.left) / r.width - 0.5
      ty = (e.clientY - r.top) / r.height - 0.5
      active = true
      sheen.style.setProperty('--mx', `${((tx + 0.5) * 100).toFixed(2)}%`)
      sheen.style.setProperty('--my', `${((ty + 0.5) * 100).toFixed(2)}%`)
      if (raf === null) raf = requestAnimationFrame(tick)
    }

    const onLeave = () => {
      tx = 0
      ty = 0
      active = true
      sheen.style.setProperty('--mx', '50%')
      sheen.style.setProperty('--my', '45%')
      if (raf === null) raf = requestAnimationFrame(tick)
    }

    window.addEventListener('mousemove', onMove, { passive: true })
    hero.addEventListener('mouseleave', onLeave)

    return () => {
      ro.disconnect()
      window.removeEventListener('mousemove', onMove)
      hero.removeEventListener('mouseleave', onLeave)
      if (raf !== null) cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <div className="phero" ref={heroRef}>
      <div className="world" ref={worldRef}>
        <div className="stage" ref={stageRef}>
          <img className="plate" src="/projection-blocks.png" alt="" draggable={false} />

          {/* PERSONAL */}
          <div className="face f1">
            <div className="flabel">PERSONAL</div>
            <div className="panel">
              <div className="plabel">TOTAL BALANCE</div>
              <div className="big">€ 28,142.55</div>
              <div className="rule" />
              <div className="row">
                <span className="dot eur">€</span>EUR<span className="amt">€18,432.55</span>
                <span className="chev">›</span>
              </div>
              <div className="row">
                <span className="dot usd">$</span>USD<span className="amt">$5,820.40</span>
                <span className="chev">›</span>
              </div>
              <div className="row">
                <span className="dot gbp">£</span>GBP<span className="amt">£3,540.00</span>
                <span className="chev">›</span>
              </div>
            </div>
          </div>

          {/* BUSINESS */}
          <div className="face f2">
            <div className="flabel">BUSINESS</div>
            <div className="panel">
              <div className="plabel">TEAM &amp; APPROVALS</div>
              <div className="stat">
                Team members<span className="n">7</span>
              </div>
              <div className="avatars">
                <span className="av" />
                <span className="av" />
                <span className="av" />
                <span className="av" />
                <span className="av" />
                <span className="more">+2</span>
              </div>
              <div className="rule" />
              <div className="stat">
                Pending approvals<span className="n">2</span>
              </div>
              <div className="gold-amt">€4,250.00</div>
            </div>
          </div>

          {/* PAYMENTS */}
          <div className="face f3">
            <div className="flabel">PAYMENTS</div>
            <div className="panel">
              <div className="ok">
                <span className="tick">✓</span>Card payment received
              </div>
              <div className="sum">
                €125.00 from
                <br />
                Acme Cycling Ltd
              </div>
              <div className="rule" />
              <div className="sum" style={{ marginTop: 8 }}>
                Processing volume
                <br />
                <span style={{ color: 'rgba(238,232,222,.55)' }}>This month</span>
              </div>
              <div className="chart">
                <i style={{ height: '14%' }} />
                <i style={{ height: '22%' }} />
                <i style={{ height: '19%' }} />
                <i style={{ height: '34%' }} />
                <i style={{ height: '46%' }} />
                <i style={{ height: '41%' }} />
                <i style={{ height: '58%' }} />
                <i style={{ height: '72%' }} />
                <i style={{ height: '86%' }} />
                <i style={{ height: '100%' }} />
              </div>
            </div>
          </div>

          <div className="sheen" ref={sheenRef} />
        </div>
      </div>

      <div className="chrome">
        <nav className="nav">
          <div className="logo">
            <span className="u">UTEX</span>
            <span className="p">PAY</span>
          </div>
          <div className="links">
            <a href="#">Banking</a>
            <a href="#">Payments</a>
            <a href="#">Developers</a>
            <a href="#">Pricing</a>
          </div>
          <div className="navr">
            <a href="#">Log in</a>
            <a className="btn btn-gold" href="#">
              Sign up
            </a>
          </div>
        </nav>

        <div className="copy" ref={copyRef}>
          <div className="eyebrow">START WITH WHAT YOU NEED</div>
          <h1>
            Start with an account.
            <br />
            Grow into everything.
          </h1>
          <p className="sub">
            Add business banking and card payments when you're ready.
            <br />
            Your money stays in the same place.
          </p>
          <div className="cta">
            <a className="btn btn-gold" href="#">
              Open an account
            </a>
            <a className="btn btn-ghost" href="#">
              See how it works
            </a>
          </div>
          <div className="assur">
            <span>
              <i>✓</i>Licensed EMI
            </span>
            <span>
              <i>✓</i>Built for business
            </span>
            <span>
              <i>✓</i>Payments when you're ready
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
