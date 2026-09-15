/** The idle cue that says the bronze panels are live controls.
 *
 * Games light an interactive object rather than miming a cursor on it, so this plays over one
 * control at a time and nothing moves, so it never reads as a phantom hover. Two layers, either
 * alone or together (see `panels.css`):
 *
 * - **Shimmer** — a reflection crosses the face: a wide warm halo carrying a narrow near-white
 *   core, with a dimmer streak trailing it. Left to right, following the scene's key light.
 * - **Glow** — a warm rim and a pool of light inside the key, breathing up and back down.
 *
 * Nothing is on a metronome. The control, the gap to the next one, the length of each pass and
 * its peak are drawn from ranges, and one hint may still be finishing as the next begins. The
 * same control never lights twice running while another is free, so attention travels across all
 * three panels. Run together — the default — the two share one clock: the rim lifts as the
 * reflection crosses, so the control appears to catch the light rather than wear a stripe.
 *
 * It waits for the intro to land and the panels to be handed over, starts nothing while the tab
 * is hidden, and stops for good the first time the visitor hovers, presses or focuses a control:
 * by then they know. A pass already under way is always allowed to finish, so nothing ever snaps
 * back to dark under the cursor. Reduced motion never starts it.
 *
 * The whole cue is CSS on the live HTML layer, so it costs no WebGL frames, and `data-hint` sits
 * outside the reflection painter's attribute filter, so it never repaints the floor reflection.
 */
export type HintStyle = 'shimmer' | 'glow' | 'both' | 'off'
export type HintSettings = { hintStyle: HintStyle; hintStrength: number; hintInterval: number; hintLift: boolean }

/** Seconds. Each pass, and how far a gap may drift from the chosen interval. */
const BREATH = [1.5, 2.4] as const
const SWEEP = [1.1, 1.7] as const
const GAP_SPREAD = [.55, 1.45] as const
const PEAK_SPREAD = [.7, 1] as const
const FIRST_GAP = [.9, 1.8] as const
const RETRY = .3
const CONTROLS = '.ah-key, .ah-segments, .ah-back'
const SET = ['--hint-time', '--hint-peak', '--shimmer-time', '--shimmer-peak', '--shimmer-delay']

const between = ([minimum, maximum]: readonly [number, number]) => minimum + Math.random() * (maximum - minimum)

export function startIdleNudge(root: HTMLElement, canvas: HTMLCanvasElement, ready: () => boolean, initial: HintSettings) {
  let settings = initial
  let timer = 0, stopped = false, previous: HTMLElement | null = null
  const running = new Map<HTMLElement, number>()
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')

  const darken = (key: HTMLElement) => {
    clearTimeout(running.get(key))
    running.delete(key)
    key.removeAttribute('data-hint')
    for (const property of SET) key.style.removeProperty(property)
  }
  const darkenAll = () => { for (const key of [...running.keys()]) darken(key) }

  /** Anything the visitor is already touching, or has already chosen, is left alone. */
  const available = () => [...root.querySelectorAll<HTMLElement>('.ah-key')].filter((key) =>
    !key.closest('[inert]') && key.getAttribute('aria-pressed') !== 'true'
    && !running.has(key) && !key.matches(':hover, :focus-visible'))

  const schedule = (seconds: number) => { timer = window.setTimeout(tick, seconds * 1000) }

  function tick() {
    timer = 0
    if (stopped) return
    if (settings.hintStyle === 'off' || document.hidden || !ready() || canvas.dataset.intro === 'playing') return schedule(RETRY)
    const keys = available()
    if (!keys.length) return schedule(RETRY)
    // Spread the attention around: repeat a control only when it is the last one left.
    const fresh = keys.length > 1 ? keys.filter((key) => key !== previous) : keys
    const key = fresh[Math.floor(Math.random() * fresh.length)]
    const glow = settings.hintStyle === 'glow' || settings.hintStyle === 'both'
    const shimmer = settings.hintStyle === 'shimmer' || settings.hintStyle === 'both'
    const peak = (scale = 1) => (settings.hintStrength * between(PEAK_SPREAD) * scale).toFixed(3)
    let length = 0
    // Together they are one event: the rim lifts on the sweep's own clock, so the control reads
    // as catching the light. The glow alone keeps its slower, independent breath.
    const sweep = between(SWEEP)
    if (glow) {
      const breath = shimmer ? sweep : between(BREATH)
      key.style.setProperty('--hint-time', `${breath.toFixed(2)}s`)
      // Paired, the rim only warms the control; the reflection stays the brighter event.
      key.style.setProperty('--hint-peak', peak(shimmer ? .7 : 1))
      length = breath
    }
    if (shimmer) {
      key.style.setProperty('--shimmer-time', `${sweep.toFixed(2)}s`)
      key.style.setProperty('--shimmer-peak', peak())
      key.style.setProperty('--shimmer-delay', '0s')
      length = Math.max(length, sweep)
    }
    key.setAttribute('data-hint', [glow && 'glow', shimmer && 'shimmer', settings.hintLift && 'lift'].filter(Boolean).join(' '))
    previous = key
    running.set(key, window.setTimeout(() => darken(key), length * 1000))
    schedule(settings.hintInterval * between(GAP_SPREAD))
  }

  const onInteract = (event: Event) => { if ((event.target as Element).closest?.(CONTROLS)) stop() }
  const onReduced = () => { if (reduced.matches) stop() }
  root.addEventListener('pointerover', onInteract)
  root.addEventListener('pointerdown', onInteract)
  root.addEventListener('focusin', onInteract)
  reduced.addEventListener('change', onReduced)

  /** Stopping only stops scheduling. A pass already under way finishes and fades out on its own,
      so the first hover never snaps a lit control back to nothing. Unmounting clears it. */
  function stop(immediate = false) {
    if (stopped) return
    stopped = true
    clearTimeout(timer)
    timer = 0
    if (immediate) darkenAll()
    root.removeEventListener('pointerover', onInteract)
    root.removeEventListener('pointerdown', onInteract)
    root.removeEventListener('focusin', onInteract)
    reduced.removeEventListener('change', onReduced)
  }

  if (reduced.matches) stop(true)
  else schedule(between(FIRST_GAP))

  return {
    stop: () => stop(true),
    update(next: HintSettings) {
      const wasOff = settings.hintStyle === 'off'
      settings = next
      // Switching off lets the current pass finish too; only the schedule changes.
      if (next.hintStyle !== 'off' && wasOff && !stopped && !timer) schedule(between(FIRST_GAP))
    },
  }
}
