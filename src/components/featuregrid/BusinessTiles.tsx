import { useEffect, useId, useRef, useState } from 'react'

/** Figma `BusinessTiles` 4855:22868 — two still tiles. The left one (`Article` 4855:22869,
    521.51 × 600.28) holds the Members card, cut off by the tile and faded at the bottom; the right
    one (`Article` 4855:22955, 860.49 × 600.28) offers alternate business artwork for review,
    with the same live copy. The scene selection is mirrored in the URL. Motion is ambient (see "Motion" in
    the README): a new member arrives once the tile has entered, the emblem turns, and the feature
    rows take turns on the photo. The one pointer response is on those rows: hovering one makes it
    current and holds the turn, and the loop carries on from it once the pointer leaves. */

const MEMBERS = [
  { initials: 'MD', name: 'Marc Dubois', detail: 'marc@arcadia.eu', access: 'Admin', tone: 'blue' },
  { initials: 'ED', name: 'Elena Duarte', detail: 'elena@arcadia.eu', access: 'Finance', tone: 'green' },
  { initials: 'ST', name: 'Support Team', detail: 'support@arcadia.eu', access: 'No access', tone: 'grey' },
  { initials: 'LF', name: 'Lena Fischer', detail: 'lena@arcadia.eu', access: 'No access', tone: 'tan' },
  { initials: 'TB', name: 'Tom Bauer', detail: 'invited 2 days ago', access: 'Finance', tone: 'grey', pending: true },
] as const

/* The row that arrives after the tile enters. It lands above Marc, so the list starts exactly as the
   design draws it and the last visible row slides into the blur band. */
const ARRIVING = { initials: 'NK', name: 'Nina Kovač', detail: 'invited just now', access: 'Finance', tone: 'grey', pending: true } as const

type Member = (typeof MEMBERS)[number] | typeof ARRIVING

function MemberRow({ member }: { member: Member }) {
  const pending = 'pending' in member
  return <div className={`fg-member${pending ? ' fg-member--pending' : ''}`}>
    <span className="fg-member-identity">
      <span className={`fg-member-avatar fg-member-avatar--${member.tone}`}>{member.initials}</span>
      <span className="fg-member-text">
        <span className="fg-member-name">{member.name}{pending && <span className="fg-member-badge"><span /><span>Pending</span></span>}</span>
        <span className="fg-member-detail">{member.detail}</span>
      </span>
    </span>
    <span className={`fg-member-access${member.access === 'No access' ? ' fg-member-access--none' : ''}`}><span /><span>{member.access}</span></span>
    <img className="fg-member-chevron" src="/featuregrid/chevron-right.svg" width="16" height="16" alt="" draggable="false" />
  </div>
}

/* The design puts a progressive blur on the card — sharp at the top, blurring towards the bottom
   under the fade (the Figma render's third row is soft; its SVG export flattens this to one
   gaussian). CSS has no progressive blur, so the list is drawn twice: the crisp copy masked out
   and a 2px-blurred copy masked in over the same 70px band. Both copies share the chapter's
   `has-entered` class, so the arriving row grows in the two of them in step. */
function MembersList({ blurred = false }: { blurred?: boolean }) {
  return <div className={`fg-members-list${blurred ? ' fg-members-list--blur' : ''}`} aria-hidden={blurred || undefined}>
    <div className="fg-members-columns"><span>MEMBER</span><span>ACCESS</span><span /></div>
    <div className="fg-member-arrival"><div><MemberRow member={ARRIVING} /></div></div>
    {MEMBERS.map((member) => <MemberRow member={member} key={member.initials} />)}
  </div>
}

/* Gold line icons in frosted squircles on the photo tile, in the Feather idiom the app's icon set
   already uses. Each has one gesture on its row's turn: the card's lines draw in, the slider knobs
   move (the track holes are masked so they travel with the knobs), the check draws, the arrow
   nudges forward. Four rows: issue → limit → approve → pay. */
const FEATURES = [
  {
    label: 'Issue team cards',
    icon: () => <>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path className="fg-draw" pathLength={1} d="M2 10h20" />
      <path className="fg-draw fg-draw--late" pathLength={1} d="M6 15h3" />
    </>,
  },
  {
    label: 'Set spending limits',
    icon: (maskId: string) => <>
      <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24">
        <rect width="24" height="24" fill="#fff" />
        <circle className="fg-knob fg-knob--a" cx="8" cy="8" r="3.75" fill="#000" />
        <circle className="fg-knob fg-knob--b" cx="14" cy="16" r="3.75" fill="#000" />
      </mask>
      <path mask={`url(#${maskId})`} d="M2 8h20M2 16h20" />
      <circle className="fg-knob fg-knob--a" cx="8" cy="8" r="2.25" />
      <circle className="fg-knob fg-knob--b" cx="14" cy="16" r="2.25" />
    </>,
  },
  { label: 'Approve payments', icon: () => <><circle cx="12" cy="12" r="9" /><path className="fg-draw" pathLength={1} d="M8 12.5l2.5 2.5L16 9.5" /></> },
  { label: 'Pay suppliers', icon: () => <g className="fg-arrow"><path d="M4 12h16M13 5l7 7-7 7" /></g> },
]

const TURN_MS = 4000

export const BUSINESS_SCENES = [
  { id: 'cards', label: 'Team cards', src: '/featuregrid/business-team-cards-1720.webp', small: '/featuregrid/business-team-cards-860.webp' },
  { id: 'laptop', label: 'Workspace', src: '/featuregrid/business-laptop-1720.webp', small: '/featuregrid/business-laptop-860.webp' },
  { id: 'human', label: 'Working moment', src: '/featuregrid/business-human-1720.webp', small: '/featuregrid/business-human-860.webp' },
  { id: 'daylight', label: 'Daylight', src: '/featuregrid/business-daylight-1720.webp', small: '/featuregrid/business-daylight-860.webp' },
  { id: 'graphic', label: 'Graphic', src: '/featuregrid/business-graphic-1720.webp', small: '/featuregrid/business-graphic-860.webp' },
  { id: 'handover', label: 'Team handover', src: '/featuregrid/business-handover-1720.webp', small: '/featuregrid/business-handover-860.webp' },
] as const

/* Which row is current. A timer hands the turn to the next row every 4s while the list is on
   screen (so nothing ticks off-screen, like the chapter's `is-in`); the pointer over the list holds
   the timer and the hovered row takes the turn; on leave the timer restarts from that row, so the
   loop continues from wherever the reader left it. Reduced motion stops the timer — the rows then
   sit still (hover still switches, instantly) — and the CSS handles the rest off `is-current`. */
function useFeatureTurns(count: number) {
  const list = useRef<HTMLUListElement>(null)
  const [current, setCurrent] = useState(0)
  const [held, setHeld] = useState(false)
  const [inView, setInView] = useState(false)
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    const el = list.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: .2 })
    observer.observe(el)
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReduced(media.matches)
    sync()
    media.addEventListener('change', sync)
    return () => { observer.disconnect(); media.removeEventListener('change', sync) }
  }, [])

  useEffect(() => {
    if (held || !inView || reduced) return
    const id = setInterval(() => setCurrent((i) => (i + 1) % count), TURN_MS)
    return () => clearInterval(id)
  }, [held, inView, reduced, count])

  return {
    list, current,
    hold: () => setHeld(true),
    release: () => setHeld(false),
    take: (i: number) => setCurrent(i),
  }
}

export function BusinessTiles({ scene, sceneId }: { scene: string; sceneId: string }) {
  const maskId = `fg-track-${useId().replace(/\W/g, '')}` // a plain id, safe inside url(#…)
  const turns = useFeatureTurns(FEATURES.length)
  return <div className="fg-row fg-row--business">
    <article className="fg-tile fg-accounts">
      <div className="fg-tile-heading"><h4>Separate accounts.<br />One login.</h4><p>Switch between your everyday<br />and your business.</p></div>
      <div className="fg-members" role="img" aria-label="Team members panel: Nina Kovač just invited, Marc Dubois as admin, Elena Duarte in finance, the support team and Lena Fischer without access, and Tom Bauer invited two days ago.">
        <div className="fg-members-header">
          <span className="fg-members-emblem" aria-hidden="true"><span className="fg-members-emblem-disc" /><img src="/featuregrid/users.svg" width="30" height="30" alt="" draggable="false" /></span>
          <div className="fg-members-title"><span>TEAM</span><strong>Members</strong></div>
        </div>
        <MembersList />
        <MembersList blurred />
      </div>
      <div className="fg-members-fade" aria-hidden="true" />
    </article>
    <article className="fg-tile fg-workspace" data-scene={scene}>
      <div id={sceneId} className="fg-workspace-art" aria-hidden="true">
        {BUSINESS_SCENES.map((item) => <img key={item.id}
          className={`fg-workspace-scene fg-workspace-scene--${item.id}${scene === item.id ? ' is-selected' : ''}`} src={item.src}
          srcSet={`${item.small} 860w, ${item.src} 1720w`} sizes="(max-width: 900px) 100vw, 860px"
          width="1720" height="1200" loading="lazy" decoding="async" draggable="false" alt="" />)}
      </div>
      <div className="fg-workspace-copy">
        <div>
          <h4>Keep your<br />business moving.</h4>
          <p>Manage company money, team cards and supplier payments.</p>
          <ul className="fg-workspace-features" ref={turns.list} onPointerEnter={turns.hold} onPointerLeave={turns.release}>
            {FEATURES.map(({ label, icon }, i) => <li key={label} className={i === turns.current ? 'is-current' : undefined} onPointerEnter={() => turns.take(i)}>
              <span className="fg-feature-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">{icon(`${maskId}-${i}`)}</svg></span>{label}
            </li>)}
          </ul>
        </div>
      </div>
    </article>
  </div>
}
