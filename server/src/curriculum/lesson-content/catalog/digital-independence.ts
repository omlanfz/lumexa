// FILE PATH: server/src/curriculum/lesson-content/catalog/digital-independence.ts
//
// Visuals for the Digital Independence pathway (lineage keys "<module-slug>/<position>").
// Formulas and examples follow each lesson's own text; nothing here changes its meaning.

import { registerVisualCatalog, type CatalogSource } from '../visual-catalog';
import { V, cards, checklist, flow, tree } from './helpers';

const source: CatalogSource = {
  // ── Build Your Professional Identity ─────────────────────────────────────
  'build-your-professional-identity/1': [
    flow('claim-to-trust', 'Claim vs. Evidence', 'A chain from a claim to evidence to trust: anyone can say "I can build websites", but a live site you deployed makes people believe you.', 'A claim is easy. Evidence is what builds trust.', ['Claim|"I can build websites."|warn', 'Evidence|a live site you deployed on Vercel|good', 'Trust|people believe you|accent']),
  ],
  'build-your-professional-identity/2': [
    flow('direction-steps', 'Step-by-Step Activity', 'The six steps from a list of projects to a direction statement: list projects, tag what each shows, rate your confidence honestly, cluster into a direction, write the statement, and park other interests.', 'From a pile of projects to one clear direction.', ['1. List every project', '2. Tag what each one shows', '3. Rate your confidence honestly', '4. Cluster into a direction', '5. Write your direction statement', '6. Park your other interests'], { perRow: 3 }),
  ],
  'build-your-professional-identity/3': [
    V('mockup', 'portfolio-wireframe', 'The 5 Sections Every Portfolio Needs', 'A wireframe of a portfolio home page with five sections: intro, about, skills, projects and contact, each with a note on what to put there.', 'The five sections of a portfolio, top to bottom.', {
      kind: 'portfolio',
      sections: [
        { label: 'Intro / Hero', text: 'Your name + a one-line tagline about your direction', callout: 'Say who you are and where you are heading.' },
        { label: 'About', text: 'A short paragraph', callout: 'Your real bio comes in Lesson 4.' },
        { label: 'Skills', text: 'A simple list or grid', callout: 'Things you can actually do.' },
        { label: 'Projects', text: 'Cards for your case studies', callout: 'Real content comes in Lessons 4 and 6.' },
        { label: 'Contact', text: 'School email or contact form', callout: 'Never your home address or phone number.' },
      ],
    }, { at: 'end' }),
  ],
  'build-your-professional-identity/4': [
    flow('bio-formula', 'The Bio Formula', 'The four parts of a strong short bio: who you are, what you build, what you are working toward, and one proof point a reader can check.', 'A full bio hits all four parts.', ['Who you are|name + one honest identifier', 'What you build|named specifically', "What you're working toward|a real current goal", 'One proof point|something a reader can check'], { perRow: 4 }),
    flow('case-study-formula', 'The Case Study Formula', 'The five parts of a case study in order: project, problem, my approach, result, and what I learned.', 'A short, structured, honest account — not a diary, not a sales pitch.', ['Project', 'Problem', 'My Approach', 'Result', 'What I Learned'], { perRow: 5, at: 'end' }),
  ],
  'build-your-professional-identity/5': [
    V('swatches', 'jordan-brand-kit', "Worked Example", 'A brand kit for the fictional example student Jordan R.: deep navy, warm amber and off-white colours, a bold heading font and a clean body font, with a tone of voice.', 'The fictional Jordan R.’s brand kit: dominant navy, amber only for small accents.', {
      colors: [{ name: 'Deep navy — dominant', hex: '#1B3A4B' }, { name: 'Warm amber — accent', hex: '#F2A93B' }, { name: 'Off-white — background', hex: '#F5F5F0' }],
      fonts: [{ label: 'Heading (bold, geometric sans-serif)', family: 'sans-serif', sample: 'Jordan R. — Game Designer' }, { label: 'Body (clean, readable sans-serif)', family: 'sans-serif', sample: 'Curious, precise, encouraging.' }],
      tagline: 'Tone of voice: curious, precise, encouraging.',
    }, { at: 'end' }),
  ],
  'build-your-professional-identity/6': [
    cards('three-proof-tests', 'Three Tests', 'Three cards for the three tests of proof: specificity, honesty, and demonstrated skill.', 'A strong case study passes all three.', [
      { title: '1. Specificity', tone: 'info', bullets: ['Name the real tool, the real constraint, the real number'] },
      { title: '2. Honesty', tone: 'good', bullets: ['Never claim more than what happened', 'Say your specific part of a team project'] },
      { title: '3. Demonstrated skill', tone: 'accent', bullets: ['Show why you built it that way, or how you got unstuck'] },
    ]),
  ],
  'build-your-professional-identity/7': [
    flow('git-github-vercel', 'Plain-Language Explanation', 'How a website goes live: your code on your computer is uploaded to a GitHub repository, Vercel connects to it and publishes it, and you get a live web address.', 'Code → GitHub → Vercel → a live address anyone can open.', ['Your code|files on your computer', 'GitHub repository|a copy stored online', 'Vercel|builds and publishes it', 'Live URL|anyone can visit'], { perRow: 4 }),
  ],
  'build-your-professional-identity/8': [
    checklist('real-proof-check', 'Real Social Proof vs. Fake Social Proof', 'A checklist for deciding whether a piece of social proof is real.', 'Tick every box before you use an endorsement. Saved on this device.', ['A real person said it, in their own words', 'They actually saw the work', 'They know it may be shared', 'There is something checkable behind it, such as a link or a date', 'Nothing was written or polished to sound better than the truth'], { title: 'Is this social proof real?' }),
  ],

  // ── Skills That Pay ──────────────────────────────────────────────────────
  'skills-that-pay/1': [
    flow('value-exchange', 'The Value-Exchange Chain', 'A chain from skill to service to payment: a skill is something you can do, a service is that skill made specific so a client can buy it, and payment is agreed before work starts.', 'Most people get stuck at step 1.', ['Skill|"I can edit video."', 'Service|a 3-minute highlight video, music and captions, in 5 days', 'Payment|agreed before the work starts'], { perRow: 3 }),
  ],
  'skills-that-pay/2': [
    flow('service-formula', 'The Skill', 'The service formula: a skill plus a specific output plus a specific audience plus a scope boundary makes a service.', 'SERVICE = SKILL + SPECIFIC OUTPUT + SPECIFIC AUDIENCE + SCOPE BOUNDARY', ['Skill|something you have evidence of', 'Specific output|what the client receives', 'Specific audience|who needs it', 'Scope boundary|a limit on size or time'], { perRow: 4 }),
  ],
  'skills-that-pay/3': [
    checklist('package-parts', 'The Parts of a Service Package', 'A checklist of the five parts every simple service package needs.', 'Is your package complete? Saved on this device.', ['Deliverable — exactly what the customer receives', "What's included — everything for the agreed price", "What's not included — what customers might wrongly assume", 'Turnaround time — how long, and starting from when', 'Revision policy — how many changes are included'], { title: 'Does my package have all five parts?' }),
  ],
  'skills-that-pay/4': [
    cards('flat-vs-hourly', 'Pricing, Explained Simply', 'Two cards comparing a flat rate, one total price for the whole job, with an hourly rate, a price for each hour worked.', 'Two ways to price work.', [
      { title: 'Flat rate', badge: 'One price', tone: 'good', bullets: ['One total price for the whole job, agreed before you start', 'Best for small jobs where you know what is involved'] },
      { title: 'Hourly rate', badge: 'Price per hour', tone: 'info', bullets: ['A price for each hour worked', 'Useful when the amount of work is hard to know in advance'] },
    ]),
  ],
  'skills-that-pay/5': [
    cards('warm-vs-cold', 'Warm Network vs. Cold Outreach', 'Two cards: a warm network is people you already know or are introduced to; cold outreach is contacting strangers, which is less safe and less likely to work.', 'Start warm: trust is already there and an adult is already involved.', [
      { title: 'Warm network', badge: 'Start here', tone: 'good', bullets: ['A club, a teacher, a neighbour, a family friend', 'Trust is already there', 'An adult is naturally involved'] },
      { title: 'Cold outreach', badge: 'Not for a first try', tone: 'warn', bullets: ['A stranger or business with no connection to you', 'No reason to trust a teen they have never met'] },
    ]),
  ],
  'skills-that-pay/6': [
    checklist('marketplace-rules', 'Case Study: Four Platforms', 'A checklist to work through before ever considering a freelance marketplace.', 'Rules change, so check the current ones yourself. Saved on this device.', ["Look up the platform's CURRENT age policy — it may have changed since this lesson", 'If an adult-owned account is required, ask a parent or guardian to own and manage it', 'If a platform does not allow your age at all, respect that and look elsewhere', 'Never use a false age or someone else’s account'], { title: 'Before you consider a marketplace', at: 'end' }),
  ],
  'skills-that-pay/7': [
    flow('proposal-parts', 'The Proposal Structure Formula', 'The five parts of a strong proposal in order: understanding of the need, my approach, what is included, price, and timeline, with an optional next-steps line.', 'The order builds trust before it asks for money.', ['1. Understanding of Need|1–2 sentences', '2. My Approach|2–3 sentences', "3. What's Included|exact bullet list", '4. Price|one clear number', '5. Timeline|a date or day-count'], { perRow: 5 }),
  ],
  'skills-that-pay/8': [
    flow('client-stages', 'Step-by-Step', 'The six stages of the client simulation: the inquiry email, the discovery call, the project requirements, the proposal and pricing, the client’s revision request, and the final handoff with a reflection.', 'Six stages from first email to handoff — all with a fictional client.', ['Inquiry email|how it starts', 'Discovery call|ask questions, take notes', 'Requirements|write down the need', 'Proposal & pricing|peer feedback, revise', 'Revision request|one requested change', 'Handoff & reflection|checklist + message'], { perRow: 3 }),
  ],

  // ── Professional Presence & Opportunity Building ─────────────────────────
  'professional-presence/1': [
    tree('which-path', 'Two Paths, One Goal', 'A decision tree: if you meet the current LinkedIn age or consent requirement, Path A is a LinkedIn profile kept alongside your portfolio; if you do not or prefer not to, Path B is a Presence page on your own portfolio site.', 'Two routes to the same goal; credibility is equal.', {
      label: 'Do you meet LinkedIn’s current age / consent requirement?', children: [
        { label: 'Yes → Path A', note: 'LinkedIn profile + your portfolio site', tone: 'info' },
        { label: 'No, or prefer not → Path B', note: 'A Presence page on your own site', tone: 'good' },
      ],
    }, { at: 'end' }),
  ],
  'professional-presence/2': [
    flow('about-formula', 'The About-Section Formula', 'The four short paragraphs of an About section in order: who you are, what you can actually do, what you are curious about or working toward, and how to connect.', 'Four short paragraphs, in this order.', ['1. Who you are|1–2 grounded sentences', '2. What you can actually do|real things, nothing invented', '3. Curious about / working toward|direction, no overclaiming', '4. How to connect|an invitation or a link'], { perRow: 4, at: 'end' }),
  ],
  'professional-presence/3': [
    flow('showcase-entry', 'How to Present a Project as a Showcase Entry', 'The three parts of every showcase entry: a title with a short type tag, a result-focused description, and a working link to real proof.', 'Skip any part and the entry gets weaker.', ['Title|project name + a 2–4 word type tag', 'Result-focused description|what happened because of it', 'Link|a public link to real proof'], { perRow: 3 }),
  ],
  'professional-presence/4': [
    flow('content-formula', 'The Content Formula', 'The three-part content formula: what I was doing, what I learned or noticed, and why it might help someone else.', 'Three parts make a complete piece.', ['What I was doing|1–2 sentences', 'What I learned or noticed|the heart: be concrete', 'Why it might help someone else|1 sentence'], { perRow: 3 }),
  ],
  'professional-presence/5': [
    tree('presence-channels', 'Presence Channels Beyond LinkedIn', 'A tree of presence channels: your own portfolio site with a content section, school-sanctioned showcases and competitions, and community project boards.', 'Several channels, one honest story.', {
      label: 'Your professional presence', children: [
        { label: 'Portfolio site', note: 'You own it — the most important', tone: 'accent', children: [{ label: 'Content / notes section', note: 'Growth over time' }] },
        { label: 'School showcases & competitions', note: 'Third-party recognition', tone: 'info' },
        { label: 'Community project boards', note: 'GitHub, Behance, a class page…', tone: 'good' },
      ],
    }, { at: 'end' }),
  ],
  'professional-presence/6': [
    flow('intro-message', 'The Introduction Message Formula', 'The four parts of a good introduction message: greeting and shared context, a genuine reason for reaching out, a small low-pressure ask, and a gracious close with your full name.', 'About 80–150 words, no hard sell.', ['Greeting + who you are|and how they know you', 'A genuine reason|why them, why now', 'A small, low-pressure ask|or none at all', 'Gracious close|with your full name'], { perRow: 4 }),
  ],
  'professional-presence/7': [
    flow('ninety-days', 'Breaking 90 Days Into 3 Monthly Blocks', 'A three-month plan: month one gets what is in progress moving, month two builds momentum, and month three finishes strong.', 'Each block needs content, networking and opportunity goals.', ['Month 1 · Days 1–30|get moving: finish something, first networking touchpoint', 'Month 2 · Days 31–60|build momentum: publish, reach out, act on an opportunity', 'Month 3 · Days 61–90|finish strong: wrap up, follow up, submit'], { perRow: 3 }),
  ],
  'professional-presence/8': [
    checklist('honest-progress', 'Honest Progress Measures vs. Vanity Metrics', 'A checklist of meaningful progress measures that only you control.', 'These count more than likes. Saved on this device.', ['I published all the content pieces I planned', 'My portfolio is live and I can send the link right now', 'I completed the full client simulation, start to finish', 'I sent every outreach message in my networking plan'], { title: 'My honest progress check', at: 'end' }),
  ],
};

registerVisualCatalog(source);
