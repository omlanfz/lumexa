import type { ProgramContent } from '../types';
import { PERK_TESTED, standardAssessments, withTest } from './shared';
import { moduleLessons } from './data';

export const DIGITAL_INDEPENDENCE: ProgramContent = {
  slug: 'digital-independence',
  fileName: 'digital-independence-path-curriculum.pdf',
  attachToCertificateEmail: true,
  themeKey: 'digital',
  shortName: 'Digital Independence',
  eyebrow: 'CURRICULUM OVERVIEW',
  heroTitle: 'Digital Independence Path',
  heroSubtitle: 'Identity to Opportunity',
  intro:
    'Build the portfolio, professional skills, digital reputation and business knowledge needed to turn your abilities into legitimate opportunities. The progression is Identity → Services → Clients → Professional Presence → Opportunities — not Fiverr → Upwork → LinkedIn.',
  strip: [
    {
      big: '3',
      label: 'Capstone deliverables',
      sub: 'A live portfolio, a service, a presence',
    },
    {
      big: '4',
      label: 'Tests along the way',
      sub: '3 course tests + 1 final test',
    },
  ],
  stats: [
    { value: '3', label: 'Courses' },
    { value: '24', label: 'Lessons' },
    { value: '28', label: 'Sessions in total' },
  ],
  courses: [
    withTest({
      title: 'Build Your Professional Identity',
      subtitle:
        'Turn your Lumexa projects into credible, honest proof of your skills',
      tools: ['HTML / CSS', 'Vercel', 'Canva', 'GitHub', 'Google Docs'],
      overview:
        'Before you can pursue any opportunity, you need a credible online presence. Students learn to present themselves professionally, define a realistic area of focus, and turn real Lumexa projects into honest, demonstrated evidence of their skills.',
      projects: [
        'Live portfolio website',
        'Personal brand kit',
        '2–3 project case studies',
        'Professional introduction / bio',
      ],
      why: 'Long before a client, mentor or employer ever talks to you, they’ll look you up. This course makes sure what they find is real, honest and impressive — the credibility layer every later course in this path builds on.',
      lessons: moduleLessons(
        'digital-independence-path',
        'build-your-professional-identity',
      ),
      snapshots: [
        {
          id: 'freelance-brand-kit',
          title: 'Brand Kit & Portfolio',
          tech: 'HTML · CSS · Canva',
        },
      ],
      snapshotNote:
        'A personal brand kit and portfolio page: logo, colours, fonts and a clear introduction — honest proof of real skills.',
      teaser: 'A live portfolio, brand kit and honest project case studies.',
    }),
    withTest({
      title: 'Skills That Pay',
      subtitle:
        'Turn a real skill into a professional service — safely and age-appropriately',
      tools: ['Google Docs', 'Canva', 'Notion', 'Email', 'Spreadsheets'],
      overview:
        'Students learn how skills become services and services become professional opportunities — without assuming every teenager can independently use adult marketplaces. Real platforms are taught as case studies, with their actual age and account rules, never a workaround.',
      projects: [
        'Professional service package',
        'Pricing worksheet',
        'Proposal + client/project brief',
        'Full simulated client project',
      ],
      why: 'Real opportunities require real professional skills — scoping, pricing, proposing, delivering. A complete simulated client project builds and proves every one of those skills, safely, before a student ever needs an adult marketplace account.',
      lessons: [
        'How the freelance economy works',
        'Turn a skill into a service',
        'Build a service package',
        'Pricing, scope and agreements',
        'Finding your first opportunities',
        'Marketplace models: what changes at different ages?',
        'Proposals, communication and delivery',
        'The client simulation',
      ],
      snapshots: [
        {
          id: 'tutoring-service',
          title: 'CodeBuddy Tutoring',
          tech: 'Service package · Pricing · Booking',
        },
      ],
      snapshotNote:
        'A packaged service with clear tiers, a price list and a booking page — the shape of a real, scoped offer.',
      teaser: 'Package a skill into a priced, scoped service.',
    }),
    withTest({
      title: 'Professional Presence & Opportunity Building',
      subtitle:
        'Build reputation, communicate professionally, and grow real opportunities over time',
      tools: [
        'LinkedIn (16+)',
        'Canva',
        'Google Docs',
        'Content Planning Tools',
      ],
      overview:
        'Students build reputation and communicate professionally using LinkedIn where they’re age-eligible (16+, subject to local law), and an equally credible portfolio-first path where they’re not — so every student leaves discoverable and prepared.',
      projects: [
        'Professional profile / presence',
        '5 pieces of professional content',
        'Networking plan',
        '90-day growth plan',
      ],
      why: 'A portfolio and a finished project get discovered only if someone is looking. Consistent, honest, credible visibility compounds over time — turning one finished project into an ongoing stream of opportunities.',
      lessons: [
        'Your professional presence',
        'Build your professional profile',
        'Showcase your work',
        'Share what you know',
        'Build a professional presence beyond LinkedIn',
        'Networking & professional communication',
        'Build your 90-day opportunity plan',
        'Measure, reflect & improve',
      ],
      snapshots: [
        {
          id: 'content-portfolio',
          title: 'Content Plan',
          tech: 'Content calendar · Profile',
        },
      ],
      snapshotNote:
        'A month of professional content planned on one page: ideas, formats and dates for steady, honest visibility.',
      teaser: 'A discoverable presence and a 90-day opportunity plan.',
    }),
  ],
  highlights: [
    {
      title: 'Built on evidence, not hype',
      body: 'Every lesson turns into something real — a live site, a case study, a proposal, a piece of content — not a private exercise.',
    },
    {
      title: 'A foundation for real opportunities',
      body: 'Students finish able to safely and age-appropriately pursue freelance work, internships, competitions and future employment.',
    },
    PERK_TESTED,
  ],
  assessments: standardAssessments({
    intro:
      'Professional skills deserve proof. Course tests check that students understand identity, pricing, agreements and professional communication — and a final test closes the path.',
    finalBlurb:
      'One final test across identity, services and professional presence: questions plus a small practical project.',
    sample: {
      mcq: {
        question: 'What makes a portfolio piece credible?',
        options: [
          'A long list of buzzwords',
          'Real work, shown with honest context',
          'A stock photo',
          'Copying a friend’s project',
        ],
        answer: 1,
      },
      trueFalse: {
        statement:
          'A platform’s age rules should be followed, never worked around.',
        answer: true,
      },
    },
  }),
  journeyIntro:
    'Across 3 courses, 24 lessons and 4 tests, students progress from Identity → Services → Clients → Professional Presence → Opportunities — walking away with three real, credible deliverables built the honest, age-appropriate way.',
  outcomes: [
    'Present a professional identity backed by a live portfolio and real project case studies.',
    'Package a real skill into a priced, scoped service and complete a full simulated client project.',
    'Build a discoverable, credible professional presence and a 90-day plan for opportunities.',
  ],
  journeyProjects: [
    ['Live portfolio website', 'Personal brand kit', 'Project case studies'],
    ['Service package', 'Pricing worksheet', 'Simulated client project'],
    ['Professional profile', '5 pieces of content', 'Networking + 90-day plan'],
  ],
  ctaLine: 'Ready to start building?',
};
