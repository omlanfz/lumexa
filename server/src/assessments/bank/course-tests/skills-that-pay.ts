// FILE PATH: server/src/assessments/bank/course-tests/skills-that-pay.ts
//
// Digital Independence Path → "Skills That Pay" (8 lessons).
// Topics: 1 how the freelance economy works · 2 turning a skill into a service ·
// 3 service packages · 4 pricing, scope & agreements · 5 finding first
// opportunities safely · 6 marketplace age rules · 7 proposals & communication ·
// 8 the client simulation.
//
// Everything here is about safe, honest practice for under-18s: a parent or
// guardian is involved in real paid work, age rules are never worked around, and
// a written agreement is not automatically a legal contract.

import { ModuleExtras, bank, mcq, tf } from '../bank.helpers';

export const skillsThatPay = bank({
  id: 'course-test/skills-that-pay',
  title: 'Skills That Pay — Course Test',
  type: 'COURSE_TEST',
  mcq: [
    // ── Lesson 1 · The freelance economy ────────────────────────────────────
    mcq(
      1,
      'What is the "value-exchange chain" at the heart of the freelance economy?',
      'Skill → Service → Payment',
      [
        'Payment → Skill → Service',
        'Service → Payment → Skill',
        'Skill → Payment → Service',
      ],
      'A skill only turns into income once it becomes a specific service that someone pays for.',
    ),
    mcq(
      1,
      'Which of these turns the skill "I can edit video" into a service?',
      '"I will edit a 3-minute highlight video from your raw footage, with music and captions, within 5 days."',
      [
        '"I am great at video."',
        '"Hire me for anything video."',
        '"I have edited videos before."',
      ],
      'A service is specific enough that a client can say yes to it.',
    ),
    mcq(
      1,
      'Which statement about freelance work is true?',
      'You usually work for different clients, project by project, and are paid per project at a price agreed in advance',
      [
        'You work for one employer all year and get a regular paycheck',
        'Your tools are usually provided by a company',
        'You are paid after the work, at whatever price the client chooses',
      ],
      'Neither employment nor freelancing is "better" — they are different systems with different rules.',
    ),
    mcq(
      1,
      'For someone under 18, what does paid freelance work almost always require?',
      'A parent or guardian involved in the account and the payments',
      [
        'Nothing special',
        'A fake age on the account',
        "A signed contract in the teen's name alone",
      ],
      'Employment can come with direct legal protections for minors, but freelance and service work needs an adult involved.',
    ),

    // ── Lesson 2 · From a skill to a service ────────────────────────────────
    mcq(
      2,
      'Which formula describes a service?',
      'Service = skill + specific output + specific audience + scope boundary',
      [
        'Service = skill + price + discount',
        'Service = interest + hope + luck',
        'Service = audience + logo + website',
      ],
      'All four parts make the service something a client can understand and say yes to.',
    ),
    mcq(
      2,
      'Which of these is a niche?',
      'Social media graphics for student clubs',
      ['Design', 'Everything creative', 'Being good with computers'],
      'A niche is a focused slice of a broader skill area.',
    ),
    mcq(
      2,
      'Why does nobody hire "a person who knows HTML"?',
      'It is not a clear service, so a client cannot say yes to it',
      [
        'HTML is too easy to learn',
        'Clients only hire adults',
        'Clients prefer to build their own websites',
      ],
      'They hire someone who says: "I\'ll build you a 4-page website for your tutoring business by next Friday."',
    ),
    mcq(
      2,
      'What is a "target client"?',
      'The specific type of person or group your service is built for, not "everyone"',
      [
        'The client who pays the most',
        'A client you have not met yet',
        'Any client who finds you online',
      ],
      'Naming a group you understand makes the service clearer and easier to explain.',
    ),

    // ── Lesson 3 · Service packages ─────────────────────────────────────────
    mcq(
      3,
      'Which list gives the five parts of a service package?',
      "Deliverable, what's included, what's not included, turnaround time, revision policy",
      [
        'Price, discount, logo, slogan, website',
        'Name, age, school, hobbies, goals',
        'Deadline, budget, payment method, invoice, receipt',
      ],
      'Together they spell out what the customer gets, and what they do not.',
    ),
    mcq(
      3,
      'Why does a package list what is NOT included?',
      'It protects both sides: nobody is surprised, and you are not pressured into free extra work',
      [
        'It makes the package look longer',
        'It lowers the price',
        'It is only needed for large jobs',
      ],
      'It is not rude — it is protective, and it is agreed before any money or work changes hands.',
    ),
    mcq(
      3,
      'Which deliverable is specific enough?',
      '"1 logo design, delivered as a PNG file and a PDF file, by email."',
      ['"A logo."', '"Some design work."', '"Whatever you need."'],
      'Vague deliverables cause more disagreements than almost anything else.',
    ),
    mcq(
      3,
      'In the painting analogy, the closet was not painted because "you didn\'t say the closet". What problem does a service package solve?',
      'Things that were assumed but never agreed in writing',
      [
        'Pricing that is too high',
        'Customers who pay late',
        'Painters who work too slowly',
      ],
      'Almost every argument between a freelancer and a customer comes down to something assumed but never agreed.',
    ),

    // ── Lesson 4 · Pricing, scope and agreements ────────────────────────────
    mcq(
      4,
      'Priya estimates 1 hour for each of 3 graphics at a reference rate of $12 per hour. What does the hourly maths give before she rounds the price?',
      '$36',
      ['$12', '$24', '$48'],
      '3 graphics × 1 hour = 3 hours, and 3 hours × $12 = $36. She rounds this to a clean flat rate of $35.',
    ),
    mcq(
      4,
      'What is "scope creep"?',
      'When a job grows beyond what was agreed, without the price or timeline changing',
      [
        'When a freelancer lowers their price',
        'When a client pays early',
        'When a deadline is extended by mutual agreement',
      ],
      'A clear scope (for example, "one logo design, two revision rounds, delivered as PNG and JPG within 5 days") protects both sides.',
    ),
    mcq(
      4,
      'A student and a client write down and sign a simple agreement. What does the lesson say about it?',
      'It is useful for clarity, but it is not automatically a legally binding contract',
      [
        'It is always a legal contract, because it is signed',
        'It has no value at all',
        'It makes the student legally responsible for everything',
      ],
      'Legal contracts depend on things such as capacity to contract (which can be affected by age) and other local requirements.',
    ),
    mcq(
      4,
      'If a student does real client work for real money, who should be involved?',
      'A parent or guardian should know and be involved',
      [
        'Nobody, because the work is private',
        'Only the client',
        "Only the student's friends",
      ],
      'A parent or guardian helps with payments and communication, and makes sure the arrangement is safe and suitable.',
    ),

    // ── Lesson 5 · Finding first opportunities ──────────────────────────────
    mcq(
      5,
      'What is your "warm network"?',
      'People and organisations you or your family already have a real relationship with',
      [
        'Strangers who like your posts',
        'Every contact in your phone',
        'Anyone who has replied to your message',
      ],
      'Examples are a club, a family friend, a teacher, a neighbour, or a local shop your family visits.',
    ),
    mcq(
      5,
      'Why is looking in your warm network first safer and more realistic?',
      'Trust is already there, and a trusted adult is naturally involved',
      [
        'Strangers never need services',
        'It is cheaper than advertising',
        'Warm contacts always pay more',
      ],
      'It is also how most people, at any age, land their first paying work: through referrals.',
    ),
    mcq(
      5,
      'Which of these is cold outreach?',
      'Messaging a stranger online who has no connection to you',
      [
        'Asking your club leader if the club needs flyers',
        'Asking a teacher who has seen your work',
        'Asking a family friend who owns a shop',
      ],
      'Cold outreach is reaching out to someone you have no connection to at all.',
    ),
    mcq(
      5,
      'What is a "referral"?',
      'A person or organisation pointing you toward someone who needs help',
      [
        'A discount you offer',
        'A review you write yourself',
        'A message sent to many people at once',
      ],
      "A referral does not make the work less real. A club project or a family friend's job is a completely real client.",
    ),

    // ── Lesson 6 · Marketplace models ───────────────────────────────────────
    mcq(
      6,
      'Which three real reasons does the lesson give for marketplace age rules?',
      'Contracts and the law, money and payments, and safety',
      [
        'Advertising, competition, and taxes on companies',
        'Design, speed, and storage space',
        'Fun, fashion, and fairness',
      ],
      'Terms of Service are a real contract, payments involve banking and tax rules, and messaging between strangers needs extra protection.',
    ),
    mcq(
      6,
      'According to the case studies, which platform does not allow anyone under 18 (or the local age of majority)?',
      'Upwork',
      ['Fiverr', 'Etsy', 'Every platform'],
      'Fiverr and Etsy have a path for 13–17-year-olds through a parent- or guardian-owned account, and Gumroad depends on where you live.',
    ),
    mcq(
      6,
      'How can a 13–17-year-old use Fiverr, according to the lesson?',
      'Through an account that is owned and managed by a parent or legal guardian',
      [
        'By giving an older age',
        "By using a friend's account",
        'By asking the platform to ignore the age rule',
      ],
      "The platform builds its path for younger teens through a guardian's account.",
    ),
    mcq(
      6,
      'A platform requires an age you do not meet. What is the responsible path?',
      'Wait, involve a parent or guardian where the platform allows it, or choose a different route — never lie about your age',
      [
        'Enter a different birth date',
        "Borrow a friend's login",
        'Ignore the rule until someone notices',
      ],
      'Misrepresenting your age can get an account (and the money in it) permanently banned and can create real legal problems.',
    ),

    // ── Lesson 7 · Proposals, communication and delivery ────────────────────
    mcq(
      7,
      'What are the five parts of a proposal, in order?',
      'Understanding of the need, my approach, what is included, price, timeline',
      [
        'Price, timeline, my approach, what is included, understanding of the need',
        'My approach, price, understanding of the need, timeline, what is included',
        'Timeline, what is included, price, my approach, understanding of the need',
      ],
      'The order builds trust before it asks for money.',
    ),
    mcq(
      7,
      'Why does "understanding of the need" come first in a proposal?',
      "It shows you read the client's message, and lets them correct you before anything is built",
      [
        'It makes the proposal longer',
        'It lets you ask for more money',
        'It hides the price',
      ],
      'A copy-and-paste pitch shows you did not read the request.',
    ),
    mcq(
      7,
      'Which message has the right professional tone?',
      '"Hi Alex — happy to help with this! Here\'s how I\'d approach it, plus pricing and timeline below."',
      [
        '"Per your request, please find enclosed my proposed terms of engagement."',
        '"heyyy so basically i can do this np just venmo me whenever lol"',
        '"Send me the details and I\'ll figure it out."',
      ],
      'Clear, warm and concise: not too stiff and not too casual.',
    ),
    mcq(
      7,
      'What does being professional about response time mean?',
      'Being predictable: tell clients early when they can expect replies',
      [
        'Always replying within one minute',
        'Never replying at weekends',
        'Replying only when the client complains',
      ],
      'A client who knows what to expect will not worry when they do not hear back in ten minutes.',
    ),

    // ── Lesson 8 · The client simulation ────────────────────────────────────
    mcq(
      8,
      'Which is the correct order of a client engagement?',
      'Inquiry → discovery → proposal → delivery → feedback → revision → handoff',
      [
        'Proposal → inquiry → handoff → discovery → delivery → feedback → revision',
        'Delivery → proposal → inquiry → feedback → discovery → handoff → revision',
        'Handoff → inquiry → discovery → delivery → proposal → revision → feedback',
      ],
      'Every service you will ever offer follows this same shape.',
    ),
    mcq(
      8,
      'What is "discovery"?',
      "Asking questions to understand a client's real need before proposing anything",
      [
        'Finding new clients online',
        'Choosing a price',
        'Delivering the finished work',
      ],
      'Good discovery questions prevent building the wrong thing.',
    ),
  ],
  trueFalse: [
    tf(
      1,
      'Most people get stuck at the first step of the chain: they never turn a skill into a clear service.',
      true,
      'Turning a skill into a specific service is the skill this whole course builds.',
    ),
    tf(
      2,
      'A clear service should be built to suit everyone.',
      false,
      'A service is clearer when it is built for a specific audience.',
    ),
    tf(
      3,
      'Saying "that is not part of this package" is rude and should be avoided.',
      false,
      'You already listed what is included. Saying so is clear, not difficult.',
    ),
    tf(
      4,
      'A flat rate is one total price for the whole job, agreed before you start.',
      true,
      'An hourly rate charges for each hour worked instead.',
    ),
    tf(
      5,
      'Posting "DM me" publicly is the safest way to find a first client.',
      false,
      'The warm network is safer and more realistic, and a trusted adult is naturally involved.',
    ),
    tf(
      6,
      "A platform's Terms of Service are a real contract, which is why its age and contract rules matter.",
      true,
      'In most places, people under 18 have limited legal ability to enter into contracts on their own.',
    ),
    tf(
      7,
      'If something is not on the "what is included" list of a proposal, it is not part of the job.',
      true,
      'This is the main tool for preventing arguments about scope after you have started.',
    ),
    tf(
      8,
      'In the client simulation, the client, the emails and the payments are fictional, and no real contract is created.',
      true,
      'What is real is the skill you practise.',
    ),
    tf(
      8,
      'A handoff means delivering the finished work with clear instructions and formally closing out the job.',
      true,
      'It is the last stage of the engagement.',
    ),
    tf(
      8,
      'You should start building before asking any discovery questions, to save time.',
      false,
      "Discovery comes first. Building the wrong thing wastes everyone's time.",
    ),
  ],
});

// Position 2 of the Digital Independence Final Test (Skills That Pay is not part
// of the Odyssey, so it has no stage or Odyssey share).
export const skillsThatPayExtras: ModuleExtras = {
  final: {
    mcq: [
      mcq(
        1,
        'In a freelance job, when should the payment be agreed?',
        'Before the work starts',
        [
          'After the client has seen the work',
          'Only if there is a problem',
          'Never, because it is obvious',
        ],
        'The price is agreed up front, per project or task.',
      ),
      mcq(
        2,
        'Which is a clear scope boundary for a website service?',
        '"A 3-page website, delivered within 5 days."',
        [
          '"A website that is as big as you need."',
          '"As many pages as you like."',
          '"A website, eventually."',
        ],
        'A scope boundary is a limit on how many pages or items, how long it takes, or what is excluded.',
      ),
      mcq(
        3,
        'Which revision policy is clear?',
        '"Two rounds of changes are included."',
        [
          '"Unlimited changes until you are happy."',
          '"Changes if I have time."',
          '"We will talk about it later."',
        ],
        'A defined number of revisions prevents scope creep.',
      ),
      mcq(
        4,
        'When is an hourly rate the best choice?',
        'When the amount of work is uncertain',
        [
          'When the job is small and exactly defined',
          'When the client wants a fixed price',
          'When there is no scope at all',
        ],
        'A flat rate suits small jobs where you know exactly what is involved.',
      ),
      mcq(
        5,
        'What is the best first step in finding a first opportunity?',
        'Map out the people and organisations you already know (your warm network)',
        [
          'Message strangers online',
          'Post your phone number',
          'Wait for a client to find you',
        ],
        'It is safer, more realistic, and a trusted adult is naturally involved.',
      ),
      mcq(
        6,
        'Why does the lesson study Fiverr, Upwork, Etsy and Gumroad as case studies?',
        'To understand how age and payment rules are built, not to sign up for them',
        [
          'To recommend one platform to every student',
          'To find ways around their rules',
          'To compare their logos',
        ],
        'The lesson is about understanding systems, not about joining one.',
      ),
      mcq(
        7,
        'A client asks for extra work outside the agreed scope. What is the most professional reply?',
        'Politely explain that it is outside the current package, and offer to quote for it separately',
        [
          'Do it for free so they stay happy',
          'Ignore the request',
          'Refuse to work with them again',
        ],
        'You can say no or negotiate the scope politely, without being difficult.',
      ),
      mcq(
        8,
        'Why is the client simulation fictional?',
        'So that you can practise the whole client process safely, with no real money or contracts',
        [
          'Because real clients are not allowed',
          'Because it is only a game',
          'Because the lessons are too short',
        ],
        'The skill you practise is real, even though the client is not.',
      ),
    ],
    trueFalse: [
      tf(
        7,
        'A good proposal states one clear price and a specific timeline.',
        true,
        'A single number and a date or day-count let the client decide easily.',
      ),
      tf(
        7,
        'A proposal should open with your price, so the client sees it first.',
        false,
        'It should start by showing you understand the need. The price comes after the approach and what is included.',
      ),
    ],
  },
};
