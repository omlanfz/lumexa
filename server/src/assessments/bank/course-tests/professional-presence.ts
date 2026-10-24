// FILE PATH: server/src/assessments/bank/course-tests/professional-presence.ts
//
// Digital Independence Path → "Professional Presence & Opportunity Building"
// (8 lessons).
// Topics: 1 professional presence & the two equal paths · 2 headline and About
// section · 3 showcasing work · 4 sharing what you know · 5 presence beyond
// LinkedIn · 6 safe networking · 7 a 90-day opportunity plan · 8 honest
// measures vs vanity metrics.
//
// The age rule is stated as the lesson states it (LinkedIn: 16+, and some regions
// require more), and the questions never suggest working around an age check.

import { ModuleExtras, bank, mcq, tf } from '../bank.helpers';

export const professionalPresence = bank({
  id: 'course-test/professional-presence',
  title: 'Professional Presence & Opportunity Building — Course Test',
  type: 'COURSE_TEST',
  mcq: [
    // ── Lesson 1 · Professional presence ────────────────────────────────────
    mcq(
      1,
      'What is a "professional presence"?',
      'The discoverable picture of your skills, projects and reliability that exists when someone looks you up online',
      [
        'A job title that you choose',
        'The number of followers you have',
        'A photo of you in smart clothes',
      ],
      'Opportunities such as mentorships, competitions and first jobs increasingly start with someone searching your name or clicking a link you shared.',
    ),
    mcq(
      1,
      'What minimum age does the lesson give for a LinkedIn account?',
      "16 (and some regions require more, or a parent's consent as well)",
      ['10', '13', '18 everywhere'],
      'The rule can change, which is why the instructor checks the current rule before the lesson.',
    ),
    mcq(
      1,
      "A student does not meet LinkedIn's age or consent requirement. What does the course tell them to do?",
      'Use the portfolio-first path — a presence page on their own portfolio site — and not create an account or work around the age check',
      [
        'Create an account with a different birth date',
        'Skip the course',
        "Use a friend's account",
      ],
      'The portfolio-first path shows the same substance without needing any third-party account.',
    ),
    mcq(
      1,
      'How does the course treat the LinkedIn path and the portfolio-first path?',
      'As fully equal ways to show who you are and what you can do',
      [
        'LinkedIn is the real path and portfolio-first is a backup',
        'Portfolio-first is only for beginners',
        'Only LinkedIn counts as professional',
      ],
      'A live project that someone can try tells an evaluator more than a network profile ever could.',
    ),

    // ── Lesson 2 · Headline and About ───────────────────────────────────────
    mcq(
      2,
      'Which formula does the lesson give for a headline?',
      'What you do or are learning + a specific tool, skill or focus + what you are curious about or working toward',
      [
        'Your age + your school + your grade',
        'A famous quote + your name',
        'Your hobbies + your favourite colour',
      ],
      'The same formula works for a LinkedIn headline and for the top line of a portfolio page.',
    ),
    mcq(
      2,
      'Which headline is the strongest?',
      'Aspiring web developer building projects in JavaScript — currently exploring how design and code work together',
      [
        '10th grade student',
        'Passionate hard worker looking for opportunities',
        'Student',
      ],
      'The strong version names a real skill and a real direction, so it does not rely on your grade or title.',
    ),
    mcq(
      2,
      'In which order are the four paragraphs of an About section?',
      'Who you are; what you can actually do; what you are curious about or working toward; how to connect',
      [
        'How to connect; who you are; what you are working toward; what you can actually do',
        'What you are working toward; how to connect; who you are; what you can actually do',
        'What you can actually do; how to connect; what you are working toward; who you are',
      ],
      'Each paragraph has a job, and the last one is an invitation or a link to your portfolio.',
    ),
    mcq(
      2,
      'What is the one rule for both the LinkedIn and portfolio-first paths?',
      'Everything you write has to be true',
      [
        'Everything has to sound impressive',
        'Everything has to be short',
        'Everything has to include a quote',
      ],
      'No invented job titles, no made-up experience, and no skills you cannot demonstrate. Specific and true beats impressive and vague.',
    ),

    // ── Lesson 3 · Showcasing work ──────────────────────────────────────────
    mcq(
      3,
      'Which three parts does every showcase entry have?',
      'A title, a result-focused description, and a link',
      [
        'A photo, a price, and a quote',
        'A title, a date, and a rating',
        'A name, a logo, and a slogan',
      ],
      'Skipping any one of them weakens the whole entry.',
    ),
    mcq(
      3,
      'Which description is result-focused?',
      '"Designed a budgeting app prototype that 8 beta testers used for two weeks; 6 said it helped them track spending more consistently."',
      [
        '"I made a budgeting app using Canva for my class project."',
        '"A budgeting app."',
        '"My project was really fun to make."',
      ],
      'A result-focused description answers "so what?" with a real number or outcome.',
    ),
    mcq(
      3,
      'How many projects does the lesson ask you to feature?',
      'Your 2–3 strongest',
      ['Every project you have ever made', 'Exactly one', 'At least ten'],
      'A Featured section is for a few hand-picked pieces, not a full archive.',
    ),
    mcq(
      3,
      'What kind of link should a showcase entry have?',
      'A working, publicly viewable link to real proof, such as a case study, a deck or a live project',
      [
        'A link to a private folder only you can open',
        'A link to your homepage only',
        'A link that is added later',
      ],
      'A reader should be able to check the work for themselves.',
    ),

    // ── Lesson 4 · Sharing what you know ────────────────────────────────────
    mcq(
      4,
      'Which three parts does the content formula have?',
      'What I was doing, what I learned or noticed, and why it might help someone else',
      [
        'A joke, a photo, and a hashtag',
        'A greeting, a list of skills, and a goodbye',
        'A title, a price, and a deadline',
      ],
      'If all three parts are there, you have a complete content piece.',
    ),
    mcq(
      4,
      'What is the one rule for all five content pieces?',
      'Teach something small and specific — do not try to sound like an expert on everything',
      [
        'Write at least 2,000 words',
        'Cover as many topics as possible',
        'Copy a popular post',
      ],
      'Specific, honest content is more convincing, more useful and easier to write.',
    ),
    mcq(
      4,
      'What is a "hook"?',
      'The opening line or title that makes a reader want to keep reading — usually the most specific part, stated up front',
      [
        'A link to your portfolio',
        'The final line that sums up the piece',
        'A tag that makes a post go viral',
      ],
      'The closing line that sums up the point is the takeaway.',
    ),
    mcq(
      4,
      'Which sentence would convince a reader the most?',
      '"I kept getting an error when someone typed a city name with a space in it, and here\'s the one-line fix that solved it."',
      [
        '"I\'m skilled in Python and problem-solving."',
        '"I am a hard worker."',
        '"I know a lot about coding."',
      ],
      'Almost nobody trusts a vague skill claim, but almost everybody trusts a specific story.',
    ),

    // ── Lesson 5 · Presence beyond LinkedIn ─────────────────────────────────
    mcq(
      5,
      'Which channel does the lesson call the single most important one you own?',
      'Your portfolio site',
      [
        'A profile on a platform that has an age limit',
        'An anonymous account',
        'A group chat',
      ],
      'You fully control it, and it shows your projects, skills and how to reach you.',
    ),
    mcq(
      5,
      'What does a school-sanctioned competition or showcase add to your presence?',
      'Third-party recognition: someone outside you has vouched for the work',
      ['More followers', 'A new logo', 'A faster website'],
      'Outside recognition adds credibility that your own claims cannot.',
    ),
    mcq(
      5,
      'How many channels do you need?',
      'A primary channel (usually your portfolio) plus one or two supporting channels',
      [
        'Every platform that exists',
        'Exactly one, and no others',
        'At least ten',
      ],
      'You need the right proof in the right place, not every channel.',
    ),
    mcq(
      5,
      'What does "discoverability" mean?',
      'How easy it is for the right person to find your work, through a clear link, a searchable name or a listed project',
      [
        'How many people like your posts',
        'How fast your website loads',
        'How many photos you have posted',
      ],
      'Discoverability does not depend on which platform hosts your work.',
    ),

    // ── Lesson 6 · Networking ───────────────────────────────────────────────
    mcq(
      6,
      'At your age, what does "real networking" mean?',
      'Staying in touch, clearly and respectfully, with people who already know you',
      [
        'Messaging strangers who have jobs you want',
        'Sending the same message to fifty people',
        'Asking new contacts for a big favour',
      ],
      'Your network already includes former teachers, coaches, family friends and instructors.',
    ),
    mcq(
      6,
      'Who should know about an outreach message?',
      'A trusted adult — a parent, guardian or instructor — before or as you send it',
      [
        'Nobody, because it is private',
        'Only the person you are writing to',
        'Only your friends',
      ],
      'It is a normal professional habit: even adults loop in a mentor before an important email.',
    ),
    mcq(
      6,
      'A written introduction leads to a suggestion to meet in person. What is the rule?',
      'Never meet alone — a trusted adult must be involved in the plan',
      [
        'Go if the person seems friendly',
        'Go, but tell no one',
        'Go if it is during the day',
      ],
      'You never meet someone from an online or written introduction in person alone.',
    ),
    mcq(
      6,
      'What must you never include in an outreach message?',
      'Your address, school schedule, passwords or financial information',
      ['Your full name', 'A thank-you', 'The reason you are writing'],
      'Keep personal and financial details out of any message, whoever it is to.',
    ),

    // ── Lesson 7 · The 90-day plan ──────────────────────────────────────────
    mcq(
      7,
      'How many content pieces does the 90-day plan aim for?',
      'Five, about one every 2–3 weeks',
      ['One', 'Twenty', 'One every day'],
      'Small, consistent actions beat sporadic bursts.',
    ),
    mcq(
      7,
      'Which three kinds of goals does each monthly block need?',
      'Content goals, networking goals and opportunity goals',
      [
        'Money goals, fame goals and speed goals',
        'Photo goals, colour goals and font goals',
        'Reading goals, sleeping goals and gaming goals',
      ],
      'Each goal also needs a "how I\'ll know".',
    ),
    mcq(
      7,
      'What is the "how I\'ll know" for a goal?',
      'A real piece of evidence that you did it, such as a published link or a sent message',
      [
        'A feeling that it went well',
        'The number of likes you got',
        'A promise to your friends',
      ],
      'Evidence makes the plan checkable.',
    ),
    mcq(
      7,
      'Why does the lesson call the plan "a default, not a cage"?',
      'You can change it if something better comes along; it just means you are not starting from zero each week',
      [
        'Because it can never be changed',
        'Because nobody follows plans',
        'Because it only lasts a week',
      ],
      'A good plan is paced and specific, and allows a better opportunity to replace part of it.',
    ),

    // ── Lesson 8 · Measuring and reflecting ─────────────────────────────────
    mcq(
      8,
      'Which of these is a vanity metric?',
      '"I have 200 followers."',
      [
        '"I published all 5 content pieces I planned."',
        '"My portfolio is live and I can send the link right now."',
        '"I sent every outreach message in my plan."',
      ],
      'Vanity metrics measure how other people reacted. Meaningful metrics measure what you actually did.',
    ),
    mcq(
      8,
      'Why are meaningful metrics better to focus on early in building a presence?',
      'They measure what you actually did, which you fully control',
      [
        'Likes are always wrong',
        'Followers never matter at any stage',
        'They are easier to fake',
      ],
      'The habit that matters most early on is following through, not going viral.',
    ),
  ],
  trueFalse: [
    tf(
      1,
      "A professional presence compounds: each addition makes the next person's impression faster and stronger.",
      true,
      'It is built lesson by lesson and project by project.',
    ),
    tf(
      2,
      'It is fine to invent a job title if it makes your profile sound better.',
      false,
      'Everything you write has to be true. Specific and true beats impressive and vague.',
    ),
    tf(
      3,
      'A showcase entry should include a working link so that a viewer can check the work.',
      true,
      'The link sends the viewer to real proof.',
    ),
    tf(
      4,
      'A content piece has to be a long, formal essay.',
      false,
      'It is a short, honest post or note that teaches one small, specific thing.',
    ),
    tf(
      5,
      'A primary channel plus one or two supporting channels is enough for a credible presence.',
      true,
      'You do not need an account on every platform.',
    ),
    tf(
      6,
      'If a reply feels pushy or strange, you should keep replying so that you do not seem rude.',
      false,
      'Stop responding and tell a trusted adult right away. That is always the right move.',
    ),
    tf(
      7,
      'Trying to make all five content pieces in a single weekend is the best way to finish the plan.',
      false,
      'Bursts tend to burn people out. A steady pace works better.',
    ),
    tf(
      8,
      'Likes and views are shaped by algorithms, timing and luck as much as by your effort.',
      true,
      'That is why they are vanity metrics.',
    ),
    tf(
      8,
      'Reflection turns "things I did" into "things I learned".',
      true,
      'Looking back deliberately is how the experience sticks.',
    ),
    tf(
      8,
      'A big follower count is the best sign of real skill.',
      false,
      'Followers say little about what you can do. Finished, checkable work says much more.',
    ),
  ],
});

// Position 3 of the Digital Independence Final Test (Professional Presence is not
// part of the Odyssey, so it has no stage or Odyssey share).
export const professionalPresenceExtras: ModuleExtras = {
  final: {
    mcq: [
      mcq(
        1,
        'In what sense does a professional presence "compound"?',
        "Each addition makes the next person's impression of you faster and stronger to form",
        [
          'It earns interest in a bank account',
          'It doubles every day automatically',
          'It resets each time you add something',
        ],
        'Reputation builds over time rather than starting over each time.',
      ),
      mcq(
        2,
        'On the portfolio-first path, where does your profile content go?',
        'On a presence page added to your existing portfolio site',
        [
          'On a new account on another platform',
          'In a private note on your phone',
          'In your school locker',
        ],
        'The presence page has the same substance as a LinkedIn profile.',
      ),
      mcq(
        3,
        'What is the Portfolio Review Checklist for?',
        'A final polish check of your profile or page before anyone else sees it',
        [
          'Counting how many views you have',
          'Choosing a password',
          'Deleting old projects',
        ],
        'Reviewers decide in the first few seconds, so your best work must be visible and explained.',
      ),
      mcq(
        4,
        'Where can a finished content piece be published?',
        'As a LinkedIn post (if you are old enough), a notes entry on your portfolio site, or a shared document',
        [
          'Only on a platform you are not old enough for',
          'Nowhere, since it is only practice',
          'Only by email to a stranger',
        ],
        'The format depends on your track.',
      ),
      mcq(
        5,
        'Which of these is a referral network?',
        'Teacher recommendations and school mentorship programmes',
        [
          'Anonymous comment sections',
          'Strangers who like your posts',
          'Chain messages',
        ],
        'A referral is personal vouching from someone with credibility of their own.',
      ),
      mcq(
        6,
        'Which message is better networking?',
        'A short, thoughtful message to a former teacher who knows you',
        [
          'The same generic message sent to fifty strangers',
          'A very long message with your life story',
          'A message asking a stranger for a big favour straight away',
        ],
        'Quality beats quantity, every time.',
      ),
      mcq(
        7,
        'What is a "milestone" in the 90-day plan?',
        'A specific, dated checkpoint that marks real progress, such as "piece #3 published by Day 70"',
        [
          'A big party at the end',
          'A vague hope for the future',
          'The number of followers you want',
        ],
        'Milestones turn a plan into something you can check.',
      ),
      mcq(
        8,
        'Why does the final lesson ask for a reflection on the whole path?',
        'So that what you learned sticks and travels with you into whatever comes next',
        [
          'So that you can post it publicly',
          'So that you can skip future courses',
          'So that you can compare yourself with others',
        ],
        'Reflection turns what you did into what you learned.',
      ),
    ],
    trueFalse: [
      tf(
        7,
        'An opportunity goal should be concrete and checkable, such as an application or a submission, rather than a hope like "get noticed".',
        true,
        'A vague hope cannot be ticked off, but a submission can.',
      ),
    ],
  },
};
