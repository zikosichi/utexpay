/** Figma `BusinessTiles` 4855:22868 — two still tiles. The left one (`Article` 4855:22869,
    521.51 × 600.28) holds the Members card, cut off by the tile and faded at the bottom; the right
    one (`Article` 4855:22955, 860.49 × 600.28) is the cards-on-a-notebook photo with copy over a
    black gradient. Neither has a control in the design, so nothing here is interactive. */

const MEMBERS = [
  { initials: 'MD', name: 'Marc Dubois', detail: 'marc@arcadia.eu', access: 'Admin', tone: 'blue' },
  { initials: 'ED', name: 'Elena Duarte', detail: 'elena@arcadia.eu', access: 'Finance', tone: 'green' },
  { initials: 'ST', name: 'Support Team', detail: 'support@arcadia.eu', access: 'No access', tone: 'grey' },
  { initials: 'LF', name: 'Lena Fischer', detail: 'lena@arcadia.eu', access: 'No access', tone: 'tan' },
  { initials: 'TB', name: 'Tom Bauer', detail: 'invited 2 days ago', access: 'Finance', tone: 'grey', pending: true },
] as const

/* The design puts a progressive blur on the card — sharp at the top, blurring towards the bottom
   under the fade (the Figma render's third row is soft; its SVG export flattens this to one
   gaussian). CSS has no progressive blur, so the list is drawn twice: the crisp copy masked out
   and a 2px-blurred copy masked in over the same 70px band. */
function MembersList({ blurred = false }: { blurred?: boolean }) {
  return <div className={`fg-members-list${blurred ? ' fg-members-list--blur' : ''}`} aria-hidden={blurred || undefined}>
    <div className="fg-members-columns"><span>MEMBER</span><span>ACCESS</span><span /></div>
    {MEMBERS.map((member) => <div className={`fg-member${'pending' in member ? ' fg-member--pending' : ''}`} key={member.initials}>
      <span className="fg-member-identity">
        <span className={`fg-member-avatar fg-member-avatar--${member.tone}`}>{member.initials}</span>
        <span className="fg-member-text">
          <span className="fg-member-name">{member.name}{'pending' in member && <span className="fg-member-badge"><span /><span>Pending</span></span>}</span>
          <span className="fg-member-detail">{member.detail}</span>
        </span>
      </span>
      <span className={`fg-member-access${member.access === 'No access' ? ' fg-member-access--none' : ''}`}><span /><span>{member.access}</span></span>
      <img className="fg-member-chevron" src="/featuregrid/chevron-right.svg" width="16" height="16" alt="" draggable="false" />
    </div>)}
  </div>
}

/* Gold 32px line icons on the photo tile, in the Feather idiom the app's icon set already uses. */
const FEATURES = [
  { label: 'Issue team cards', icon: <><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20M6 15h3" /></> },
  { label: 'Set spending limits', icon: <><path d="M2 8h5M11 8h11M2 16h11M17 16h5" /><circle cx="8" cy="8" r="2.25" /><circle cx="14" cy="16" r="2.25" /></> },
  { label: 'Pay suppliers', icon: <><path d="M4 12h16M13 5l7 7-7 7" /></> },
]

export function BusinessTiles() {
  return <div className="fg-row fg-row--business">
    <article className="fg-tile fg-accounts">
      <div className="fg-tile-heading"><h4>Separate accounts.<br />One login.</h4><p>Switch between your everyday<br />and your business.</p></div>
      <div className="fg-members" role="img" aria-label="Team members panel listing Marc Dubois as admin, Elena Duarte in finance, the support team and Lena Fischer without access, and Tom Bauer invited two days ago.">
        <div className="fg-members-header">
          <span className="fg-members-emblem" aria-hidden="true"><span className="fg-members-emblem-disc" /><img src="/featuregrid/users.svg" width="30" height="30" alt="" draggable="false" /></span>
          <div className="fg-members-title"><span>TEAM</span><strong>Members</strong></div>
        </div>
        <MembersList />
        <MembersList blurred />
      </div>
      <div className="fg-members-fade" aria-hidden="true" />
    </article>
    <article className="fg-tile fg-workspace">
      <img className="fg-workspace-scene" src="/featuregrid/business-cards-scene-926.webp"
        srcSet="/featuregrid/business-cards-scene-926.webp 926w, /featuregrid/business-cards-scene-1536.webp 1536w"
        sizes="926px" width="1536" height="1024" loading="lazy" decoding="async" draggable="false" alt="" aria-hidden="true" />
      <div className="fg-workspace-copy">
        <div>
          <h4>Keep your<br />business moving.</h4>
          <p>Manage company money, team cards and supplier payments.</p>
          <ul className="fg-workspace-features">
            {FEATURES.map(({ label, icon }) => <li key={label}><svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{icon}</svg>{label}</li>)}
          </ul>
        </div>
      </div>
    </article>
  </div>
}
