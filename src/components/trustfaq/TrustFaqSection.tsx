import { useEffect, useId, useState } from 'react'
import '../section-heading.css'
import './trust-faq.css'

type Question = { question: string; answer: string }
// Product examples, not live account settings. Confirm regulatory and pricing copy before launch.
const QUESTIONS: Question[] = [
  { question: 'How do I keep control of my account?', answer: 'Use two-step verification for account access, manage your cards, and give each team member the permissions they need. Your security controls live alongside your everyday banking.' },
  { question: 'How is my money protected?', answer: 'For details about how customer funds are held and the protections that apply to your account, talk to our team. We can help you understand the arrangements before you get started.' },
  { question: 'Who is UTEX for?', answer: 'UTEX brings accounts and payment acceptance together for businesses and entrepreneurs. Whether you’re building a team or selling online, you can manage money in and money out in one place.' },
  { question: 'What do I need to get started?', answer: 'You’ll be asked for information about yourself and your business, along with documents to verify those details. The requirements depend on your business and where it is registered.' },
  { question: 'Can I bank and accept payments in one place?', answer: 'Yes. UTEX brings your business account and payment acceptance together. Customer payments settle into the account you use to run your business, so money in and money out stay in one place.' },
  { question: 'What will I pay?', answer: 'Pricing depends on the services your business needs. Talk to our team about your account, payment methods and expected volume for the fees that apply to your setup.' },
]

function SecurityMark() {
  return <svg viewBox="0 0 32 36" fill="none" aria-hidden="true">
    <path d="M16 2 29 7v10c0 8-6 13-13 17C9 30 3 25 3 17V7L16 2Z" />
    <path className="tf-mark-detail" d="m10 17 4 4 8-8" />
  </svg>
}

function FaqList({ id, showExample }: { id: string; showExample: boolean }) {
  const [open, setOpen] = useState<number | null>(0)
  return <div id={id} className="tf-panel">
    <div className="tf-questions">
      {QUESTIONS.map(({ question, answer }, index) => {
        const expanded = open === index
        const questionId = `${id}-q-${index}`
        const answerId = `${id}-a-${index}`
        return <article className="tf-question" key={question} data-open={expanded}>
          <h3><button type="button" id={questionId} aria-expanded={expanded} aria-controls={answerId}
            onClick={() => setOpen(expanded ? null : index)}>
            <span>{question}</span><svg className="tf-plus" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 12h12" /><path className="tf-plus-vertical" d="M12 6v12" /></svg>
          </button></h3>
          <div id={answerId} role="region" aria-labelledby={questionId} aria-hidden={!expanded} inert={!expanded} className="tf-answer-reveal">
            <div className="tf-answer"><div className="tf-answer-content"><p>{answer}</p></div></div>
          </div>
        </article>
      })}
    </div>
    {showExample && <figure className="tf-example">
      <div className="tf-example-card">
        <div className="tf-example-heading"><SecurityMark /><h3>Security, close at hand.</h3></div>
        <dl>{[['Two-step verification', 'On'], ['Card controls', 'Manage'], ['Team permissions', 'Review']].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
        <p>{'A little more certainty.\nEvery time you use your account.'}</p>
      </div>
      <figcaption>Illustrative account settings</figcaption>
    </figure>}
  </div>
}

export function TrustFaqSection() {
  const id = useId()
  const [version, setVersion] = useState<'cover' | 'split'>('cover')
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get('faq')
    if (requested === 'cover' || requested === 'split') setVersion(requested)
  }, [])
  function changeVersion(next: 'cover' | 'split') {
    setVersion(next)
    const url = new URL(window.location.href)
    url.searchParams.set('faq', next)
    window.history.replaceState(window.history.state, '', url)
  }
  const split = version === 'split'
  return <section id="questions" className="trust-faq" data-version={version} aria-labelledby={`${id}-title`}>
    <div className="tf-version-bar">
      <div className="tf-versions" role="group" aria-label="FAQ visual direction">
        {(['cover', 'split'] as const).map((value, index) => <button type="button" key={value}
          aria-label={`${value === 'cover' ? 'Cover' : 'Side by side'} — Version ${index + 1}`}
          aria-pressed={version === value} aria-controls={`${id}-content`} onClick={() => changeVersion(value)}>
          <span aria-hidden="true">0{index + 1}</span><span className="tf-version-name" aria-hidden="true">{value === 'cover' ? 'Cover' : 'Side by side'}</span>
        </button>)}
      </div>
    </div>
    <div className="tf-inner" id={`${id}-content`}>
      <header className="tf-header">
        {split ? <img className="tf-split-art" src="/trustfaq/one-home-1200.webp"
          srcSet="/trustfaq/one-home-640.webp 640w, /trustfaq/one-home-1200.webp 1200w"
          sizes="(max-width: 900px) calc(100vw - 56px), (max-width: 1496px) 56vw, 800px"
          width="1200" height="900" loading="lazy" decoding="async" alt="" aria-hidden="true" /> : <img className="tf-cover" src="/trustfaq/doorway-cover-1600.webp"
          srcSet="/trustfaq/doorway-cover-960.webp 960w, /trustfaq/doorway-cover-1600.webp 1600w, /trustfaq/doorway-cover-2126.webp 2126w"
          sizes="(max-width: 620px) 920px, (max-width: 900px) 1300px, (max-width: 1496px) calc(100vw - 96px), 1400px"
          width="2126" height="740" loading="lazy" decoding="async" alt="" aria-hidden="true" />}
        <div className="tf-cover-copy">
          <div className="tf-heading"><p className="section-heading__eyebrow">Your questions, answered</p>
            <h2 id={`${id}-title`} className="section-heading__title">Feel at home.<br />Before you move in.</h2></div>
          <div className="tf-intro"><p>How your money works. How access is protected. What happens next.</p></div>
        </div>
      </header>
      <div className="tf-content">
      {split && <p className="section-heading__eyebrow tf-content-label">A few things to know</p>}
      <FaqList id={`${id}-answers`} showExample={!split} />
      </div>
    </div>
  </section>
}
