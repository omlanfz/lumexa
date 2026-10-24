// FILE PATH: server/src/assessments/bank/course-tests/build-your-professional-identity.ts
//
// Digital Independence Path → "Build Your Professional Identity" (8 lessons).
// Topics: 1 professional identity, claims vs evidence · 2 strengths & direction ·
// 3 the portfolio website · 4 bio & case-study writing · 5 a personal brand kit ·
// 6 turning projects into proof · 7 launching the site (Git, GitHub, hosting —
// as ideas) · 8 honest social proof.
//
// This pathway has no code to run; questions are scenarios and judgement calls.

import { ModuleExtras, bank, mcq, tf } from '../bank.helpers';

export const buildYourProfessionalIdentity = bank({
  id: 'course-test/build-your-professional-identity',
  title: 'Build Your Professional Identity — Course Test',
  type: 'COURSE_TEST',
  mcq: [
    // ── Lesson 1 · Professional identity ────────────────────────────────────
    mcq(
      1,
      'In this course, what is a "professional identity"?',
      'The intentional, evidence-backed picture of your skills and work that others can see',
      [
        'A formal job title you give yourself',
        'Your username on social media',
        'A résumé written in very formal language',
      ],
      'It is not about sounding corporate or adult. It is about being clear, and being able to back up what you say.',
    ),
    mcq(
      1,
      'Which of these is evidence rather than a claim?',
      'A link to a working project you coded in JavaScript',
      [
        '"I\'m good at JavaScript."',
        '"I\'m a fast learner."',
        '"I care about clean design."',
      ],
      'A claim is a statement about yourself; evidence is something other people can look at and verify.',
    ),
    mcq(
      1,
      'What is your "digital reputation"?',
      'Everything that exists about you online, whether you built it on purpose or not',
      [
        'Only the posts that you deliberately publish',
        'The number of followers you have',
        'Your private messages',
      ],
      'Some of it you control (a project page) and some of it just happened (an old comment, or nothing at all).',
    ),
    mcq(
      1,
      "How should a 16-year-old's professional identity sound?",
      'Like a 16-year-old who can back up what they say',
      [
        'Like a senior executive',
        'As impressive and vague as possible',
        "Exactly like everyone else's",
      ],
      'The aim is clear and true, not fake or corporate.',
    ),

    // ── Lesson 2 · Strengths and direction ──────────────────────────────────
    mcq(
      2,
      'Which kind of "good at" needs at least one finished, working artifact as evidence?',
      'A proven skill',
      ['An interest', 'A hope', 'A strength with no examples'],
      'An interest needs no evidence, a strength shows a pattern, and a proven skill points to something finished.',
    ),
    mcq(
      2,
      'Your CSS layouts come out cleaner than the other parts of your projects in at least two attempts. What is this?',
      'A strength',
      [
        'Only an interest',
        'A proven skill, without needing any finished work',
        'A weakness',
      ],
      'A strength is shown by a pattern across 2+ attempts or by solid feedback.',
    ),
    mcq(
      2,
      'How should a portfolio treat an interest that you have no evidence for yet?',
      'Mention it only as something you want to learn next, never as if it is already true',
      [
        'List it first, to make the portfolio look ambitious',
        'Claim it as a skill and hope nobody asks',
        'Remove every interest from the portfolio',
      ],
      'Lead with proven skills, back them up with strengths, and keep interests honest.',
    ),
    mcq(
      2,
      'What is a "strength cluster"?',
      'A group of two or more projects that all demonstrate the same underlying skill',
      [
        'A list of your favourite tools',
        'The number of projects you have finished',
        'A group of friends who work together',
      ],
      'Clustering your projects is how you find an honest direction for the portfolio.',
    ),

    // ── Lesson 3 · The portfolio website ────────────────────────────────────
    mcq(
      3,
      "Which contact method is safe to put on a student's portfolio?",
      'A school email address or a contact form',
      ['Your home address', 'Your phone number', 'Your daily school timetable'],
      'Never publish your home address or phone number on a public portfolio.',
    ),
    mcq(
      3,
      'Which section of the portfolio holds the cards for your case studies?',
      'Projects',
      ['Intro / Hero', 'Skills', 'Contact'],
      'The five sections are Intro, About, Skills, Projects and Contact.',
    ),
    mcq(
      3,
      'Why does the lesson use semantic HTML such as `<header>` and `<section>`?',
      'The tags describe meaning, rather than being only generic `<div>` boxes',
      [
        'They make pages load faster',
        'They add colour automatically',
        'They are required by every browser',
      ],
      'Semantic structure helps accessibility, search engines and anyone reading the code.',
    ),
    mcq(
      3,
      'Why is a live portfolio site better proof than a résumé line that says "I can build websites"?',
      'Someone can click through the site, which turns a claim into evidence',
      [
        'It uses fewer words',
        'Résumés cannot mention websites',
        'A site is always more colourful',
      ],
      'A live site is something a reader can check for themselves.',
    ),

    // ── Lesson 4 · Bio and case study ───────────────────────────────────────
    mcq(
      4,
      'Which list gives the four parts of a strong short bio?',
      'Who you are, what you build, what you are working toward, and one proof point',
      [
        'Your age, your school, your hobbies, and your favourite colour',
        'A quote, a joke, a goal, and a photo',
        'Your name, your address, your phone number, and your email',
      ],
      'A full bio hits all four. Shorter versions can leave some out.',
    ),
    mcq(
      4,
      'Which sentence is the strongest description of what you build?',
      'I build small web tools, mostly HTML and CSS sites and simple JavaScript apps.',
      [
        'I make cool stuff.',
        'I do lots of different things.',
        'I am passionate about technology!',
      ],
      'Name the actual kinds of things you make. Vague or buzzword-filled sentences prove nothing.',
    ),
    mcq(
      4,
      'In which order are the five parts of the case study formula?',
      'Project, Problem, My Approach, Result, What I Learned',
      [
        'Result, Project, What I Learned, Approach, Problem',
        'Problem, Result, Project, What I Learned, Approach',
        'What I Learned, Project, Result, Problem, Approach',
      ],
      'A case study is a short, structured, honest account, not a diary entry or a sales pitch.',
    ),
    mcq(
      4,
      'What is a "proof point"?',
      'A specific, checkable fact, such as a link, a named project or a named tool',
      [
        'A word that sounds impressive',
        'A point in a game',
        'A compliment from a stranger',
      ],
      'A proof point lets a reader check what you claim.',
    ),

    // ── Lesson 5 · Personal brand ───────────────────────────────────────────
    mcq(
      5,
      'How many colours does the lesson recommend for a brand palette?',
      'Two or three: a dominant colour, an accent, and optionally a neutral',
      ['As many as possible', 'Exactly one', 'Seven or more'],
      'More than three starts to look cluttered and unplanned.',
    ),
    mcq(
      5,
      'How many fonts should a brand kit use?',
      'Two at most: one for headings and one for body text',
      [
        'One font for everything, always',
        'Five or six, for variety',
        'A new font for every page',
      ],
      'Pick two fonts that look different enough to give contrast, but not so different that they clash.',
    ),
    mcq(
      5,
      'The lesson says a brand is NOT a logo. What is it?',
      'A system of repeated choices — colours, fonts, voice — used consistently',
      [
        'A picture you draw once',
        'A name that nobody else uses',
        'A set of rules for other people to follow',
      ],
      'A simple mark such as your initials in a shape is just one small piece of it.',
    ),
    mcq(
      5,
      'Why does the lesson ask you to check colour contrast?',
      'So that text is readable for everyone, including people with low vision',
      [
        'So the colours match the logo exactly',
        'So the page uses fewer colours',
        'So the page prints more cheaply',
      ],
      'Accessibility is part of professional design.',
    ),

    // ── Lesson 6 · Turn projects into proof ─────────────────────────────────
    mcq(
      6,
      'Which three tests turn "a thing I made" into proof?',
      'Specificity, honesty and demonstrated skill',
      [
        'Length, colour and speed',
        'Popularity, price and age',
        'Luck, timing and style',
      ],
      'A strong case study is specific, never claims more than what happened, and shows a decision or a problem you solved.',
    ),
    mcq(
      6,
      'Which description is the most specific?',
      '"I built a weather app that pulls live data from a public API and caches results so it still works offline."',
      [
        '"I built a weather app."',
        '"I made something with code."',
        '"I learned a lot and it was fun."',
      ],
      'It names a real technical decision. "I built a weather app" is a thing you made, not proof.',
    ),
    mcq(
      6,
      'You worked on a team project. What does honesty require in your case study?',
      'Say what your own part was',
      [
        'Claim you did the whole thing',
        'Leave the project out',
        'Credit everyone equally, whatever they did',
      ],
      'Never claim more than what happened.',
    ),
    mcq(
      6,
      'Your project is not deployed anywhere. What should the case study say?',
      'What is true — for example, that it runs locally — without calling it "in production"',
      [
        'That it is in production',
        'Nothing about how far it got',
        'That thousands of people use it',
      ],
      'If a tutorial got you 80% of the way, say what the remaining 20% was. That is often the most impressive part.',
    ),

    // ── Lesson 7 · Launching the site ───────────────────────────────────────
    mcq(
      7,
      'In the moving-boxes analogy, what is GitHub?',
      'A warehouse where your labelled boxes are stored online',
      [
        'The labelling system for the boxes',
        'The shop window that displays the boxes',
        'Your own garage',
      ],
      'Git labels each saved version, GitHub stores them online, and Vercel displays them on a public address.',
    ),
    mcq(
      7,
      'What does Git let you do with your project?',
      'Save labelled versions (commits), so you can always go back to an earlier one',
      [
        'Make your site look better',
        'Give your site a public web address',
        'Write the content for you',
      ],
      'Nothing gets thrown away.',
    ),
    mcq(
      7,
      'What does a hosting service such as Vercel do?',
      'It keeps your site running at a public address, and updates it when you update the project',
      [
        'It designs the site for you',
        'It labels your files with versions',
        'It deletes old versions of the site',
      ],
      'Hosting keeps your site available without your own computer needing to be on.',
    ),
    mcq(
      7,
      'Why is sending a live link better than emailing a zip file of your site?',
      'A link opens in seconds on any device; a zip file only proves the site exists on your laptop',
      [
        'A link is shorter to type',
        'Zip files cannot contain websites',
        'Recruiters prefer large attachments',
      ],
      'Most people will never open a zip file from a stranger, but they will click a link.',
    ),

    // ── Lesson 8 · Social proof ─────────────────────────────────────────────
    mcq(
      8,
      'Which of these is real, ethical social proof?',
      'A short note from a teacher about a project they actually saw, which they approved before you posted it',
      [
        'A quote you wrote yourself, attributed to a teacher',
        'A testimonial with a stock photo and a made-up name',
        'Praise from strangers who never saw the work',
      ],
      'If the words did not come from a real person who actually saw the work, and they have not approved how you use them, they do not go on your site.',
    ),
    mcq(
      8,
      'You change a real quote so that it says more than the person meant. What is this?',
      'Fake, manufactured social proof — never do it',
      [
        'A normal way to improve a testimonial',
        'A good use of editing',
        'An acceptable shortcut if you are nervous',
      ],
      'An empty or "coming soon" section is always better than a fake one.',
    ),
  ],
  trueFalse: [
    tf(
      1,
      'A professional identity should be clear and backed up by real evidence.',
      true,
      'That is the point of the whole course: clear, honest and provable.',
    ),
    tf(
      2,
      'A strong portfolio direction is led by proven skills and backed by strengths.',
      true,
      'Interests can be mentioned only as things you want to learn next.',
    ),
    tf(
      3,
      'A responsive layout adapts to different screen sizes.',
      true,
      'That is why people can read a portfolio on a phone as well as a laptop.',
    ),
    tf(
      4,
      'A case study can honestly say that a project only partly worked.',
      true,
      'The Result section should say what actually happened, whether it was working or partly working.',
    ),
    tf(
      5,
      'Using more colours makes a portfolio look more professional.',
      false,
      'Two or three deliberate colours look more consistent and professional than many.',
    ),
    tf(
      6,
      'A list of the things you have built is already a portfolio.',
      false,
      'What turns a list into a portfolio is what you say about each project: specific, honest, skill-revealing case studies.',
    ),
    tf(
      7,
      'A zip file emailed to a recruiter is as easy for them to open as a link.',
      false,
      'A live link opens in seconds on any device; a zip file is rarely opened.',
    ),
    tf(
      8,
      'An empty "social proof" section, or one that says "coming soon", is better than a fake one.',
      true,
      'Honesty is worth more than the look of popularity.',
    ),
    tf(
      8,
      'A person should approve a quote before you publish it.',
      true,
      "Endorsements are given with permission, in the person's own words.",
    ),
    tf(
      8,
      'Writing a testimonial yourself is fine as long as you think it is true.',
      false,
      'Social proof has to come from a real person who saw the work, in their own words.',
    ),
  ],
});

// Position 1 of the Digital Independence Final Test, position 2 of Odyssey
// Stage 2 and position 5 of the Odyssey Final Test.
export const buildYourProfessionalIdentityExtras: ModuleExtras = {
  final: {
    mcq: [
      mcq(
        1,
        'Which comparison does the lesson use to explain professional identity?',
        'A game profile: your rank and match history show what you can do, not what you claim you can do',
        [
          'A passport: it proves who you are by law',
          'A diary: it records everything you feel',
          'A trophy cabinet: it holds all the prizes you have won',
        ],
        'Your "stats" are your real projects.',
      ),
      mcq(
        2,
        'Why does the activity ask you to give each project an honest confidence rating (High / Medium / Low)?',
        'To be honest about how solid the evidence is for each project',
        [
          "To rank your friends' projects",
          'To decide how many colours to use',
          'To hide the weaker projects',
        ],
        'The rating helps you choose a direction that you can back up with strong evidence.',
      ),
      mcq(
        3,
        'What is the purpose of previewing the portfolio on a local server before it goes live?',
        'To see how the site looks and works on your own computer first',
        [
          'To publish the site to the world',
          'To collect testimonials',
          'To change the domain name',
        ],
        'A preview lets you fix mistakes before anyone else sees them.',
      ),
      mcq(
        4,
        'Which sentence is full of buzzwords, rather than specific?',
        '"I am a passionate, detail-oriented team player."',
        [
          '"I built a habit tracker that saves its data in the browser."',
          '"I redesigned my robotics club\'s sign-up page."',
          '"I used CSS Grid to lay out my portfolio."',
        ],
        'Buzzwords sound impressive but carry no checkable information.',
      ),
      mcq(
        5,
        'Which of these is a good "simple mark" for a personal brand?',
        'Your initials inside a simple shape',
        [
          'A complicated illustration with ten colours',
          "A copy of a famous company's logo",
          'A different symbol on every page',
        ],
        'A mark is one small repeatable visual: one shape, and one or two colours.',
      ),
      mcq(
        6,
        'Why should a case study explain why you built something a certain way, or how you got unstuck?',
        'It makes your skill visible: the invisible decisions behind the project',
        [
          'It makes the case study longer',
          'It hides the final result',
          'It saves you from writing a bio',
        ],
        'Demonstrated skill is more than what you built; it is the thinking behind it.',
      ),
      mcq(
        7,
        'What does it mean to "deploy" a website?',
        'To make it live and viewable as a real website on the internet',
        ['To delete the old version', 'To print it', 'To rename the files'],
        'Deployment takes the site from files on one computer to a public address.',
      ),
      mcq(
        7,
        'Your project is connected to a hosting service. You update your files in the GitHub project. What happens to the live site?',
        'It updates automatically',
        [
          'Nothing, until you email the hosting service',
          'The live site is deleted',
          'The site stays the same forever',
        ],
        'Every time you update the boxes in the warehouse, the shop window updates too.',
      ),
      mcq(
        8,
        'How should you ask someone for an endorsement of your work?',
        'Ask for one honest sentence or two about work they actually saw, and show them how it will appear',
        [
          'Write it for them and ask them to say yes',
          'Ask a stranger who has never seen the work',
          'Post it first and tell them afterwards',
        ],
        'Honest, specific and approved: that is real social proof.',
      ),
    ],
    trueFalse: [
      tf(
        1,
        'Credibility is how much someone can trust that what you say about yourself is true.',
        true,
        'Real, checkable evidence builds it.',
      ),
      tf(
        5,
        'A brand is just another word for a logo.',
        false,
        'A brand is a consistent system of visual and verbal choices. The logo (or mark) is one small part.',
      ),
    ],
  },
  stage: {
    mcq: [
      mcq(
        1,
        'Which of these is a claim, not evidence?',
        '"I care about clean design."',
        [
          'A link to a live site you deployed',
          'A project with a working demo',
          "A reviewer's approved comment about your work",
        ],
        'A claim is a statement about yourself that someone has to take on trust.',
      ),
      mcq(
        1,
        'What is a "personal brand"?',
        'The consistent way you present your identity — your voice, visuals and the story your evidence tells',
        [
          'A logo you buy',
          "A famous person's name",
          'A secret password for your profile',
        ],
        'Consistency across everything you share is what makes it recognisable.',
      ),
      mcq(
        2,
        'What does a "confidence level" mean in the activity?',
        'Your honest rating of how solid your evidence is for a project',
        [
          'How famous the project is',
          'How confident you feel on stage',
          'How many people have seen it',
        ],
        'It is High, Medium or Low, and it should be honest.',
      ),
      mcq(
        3,
        'Which portfolio section holds your name and a one-line tagline about your direction?',
        'Intro / Hero',
        ['Contact', 'Skills', 'Footer notes'],
        'It is the first thing a visitor sees.',
      ),
      mcq(
        4,
        'What voice does the lesson recommend for a bio?',
        'Clear and true — not stiff and corporate, and not hollow cheerleading',
        [
          'As formal as possible',
          'As excited as possible, with lots of exclamation marks',
          'As short as possible, with no details',
        ],
        'Say what you build in plain language.',
      ),
      mcq(
        5,
        'What is a hex code, such as `#1B3A4B`?',
        'A six-character code that names an exact colour so it looks the same everywhere',
        [
          'A password for your site',
          'A kind of font',
          'A short name for your project',
        ],
        'Hex codes keep a palette consistent across every place you use it.',
      ),
      mcq(
        5,
        'The "tone of voice" in a brand kit is…',
        'Three adjectives describing how you sound when you write',
        [
          'The volume of your voice',
          'The colour of your headings',
          'A recording of you reading your bio',
        ],
        'Check that your bio actually sounds like the words you chose.',
      ),
      mcq(
        6,
        'Which statement about a team project is honest?',
        '"I designed the layout; a teammate wrote the scoring code."',
        [
          '"I built the whole game by myself."',
          '"We did everything together equally."',
          '"The project made itself."',
        ],
        'Say your specific part. Never claim more than what happened.',
      ),
      mcq(
        7,
        'What is a "commit" in Git?',
        'A saved, labelled snapshot of your project at one point in time',
        [
          'A message sent to a client',
          'A kind of web address',
          'A promise to finish a project',
        ],
        'Each commit is a box you seal and label.',
      ),
      mcq(
        8,
        'What is the best thing to put in a social-proof section when you have no endorsements yet?',
        'Leave it out, or say "coming soon"',
        [
          'A made-up quote',
          'A quote from a celebrity',
          'A rating you gave yourself',
        ],
        'An honest empty section is better than a fake one.',
      ),
    ],
    trueFalse: [
      tf(
        7,
        'A repository holds all of the files for one project, together with its history.',
        true,
        'It is the online "folder" for a project on GitHub.',
      ),
      tf(
        7,
        'A commit uploads your files to the internet by itself.',
        false,
        'A commit only saves a snapshot. Pushing uploads commits to GitHub, and a hosting service makes the site live.',
      ),
      tf(
        3,
        'A working, publicly viewable link is a key part of showing a project as proof.',
        true,
        'A reader should be able to check the work for themselves.',
      ),
    ],
  },
  odyssey: {
    mcq: [
      mcq(
        3,
        'What is a "portfolio"?',
        'A collection of your real projects, organised to show your skills clearly',
        [
          'A list of your favourite websites',
          'A folder of photos of you',
          'A private diary of ideas',
        ],
        'A portfolio is proof you can point to.',
      ),
      mcq(
        8,
        'Why is one honest sentence from a teacher who saw your work better than ten fake five-star reviews?',
        'It is real, specific and checkable',
        ['It is longer', 'It costs less', 'It uses fewer words'],
        'Credibility comes from real people, about real work, that anyone could go and check.',
      ),
    ],
    trueFalse: [],
  },
};
