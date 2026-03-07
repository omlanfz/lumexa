// FILE PATH: server/src/lumi/lumi.service.ts
//
// ─── Lumi Chatbot Service ─────────────────────────────────────────────────────
//
// FREE architecture — no paid APIs:
//
//   1. GUARDRAIL CHECK  — Block programming/homework questions immediately
//   2. FAQ RULE ENGINE  — Keyword match against the knowledge base (instant)
//   3. OLLAMA FALLBACK  — Open-source AI for platform-related questions only
//
// Install Ollama: https://ollama.ai
// Pull a model:  ollama pull llama3.2   (or mistral, phi3, gemma2:2b)
// Start server:  ollama serve            (runs on http://localhost:11434)
//
// Set in server/.env (optional override):
//   OLLAMA_URL=http://localhost:11434
//   OLLAMA_MODEL=llama3.2

import { Injectable, Logger } from '@nestjs/common';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface LumiResponse {
  reply: string;
  source: 'faq' | 'ollama' | 'guardrail' | 'fallback';
  matched?: string; // which FAQ key matched (for debugging)
}

// ── FAQ Knowledge Base ─────────────────────────────────────────────────────────
//
// Structure: { keywords: string[], response: string }
// Keywords are matched case-insensitively against the user's message.
// More specific entries should be placed BEFORE more general ones.

const FAQ_ENTRIES: Array<{ keywords: string[]; response: string }> = [
  // ── GREETING / HELLO ────────────────────────────────────────────────────────
  {
    keywords: [
      'hello',
      'hi',
      'hey',
      'hiya',
      'howdy',
      'greetings',
      'sup',
      "what's up",
      'good morning',
      'good afternoon',
    ],
    response:
      "Hiiii! 🐱✨ I'm Lumi, your space guide on Lumexa!\nI can help you find your way around — booking classes, setting up your profile, or anything Lumexa-related.\nWhat can I help you with today?",
  },

  // ── WHO ARE YOU / WHAT ARE YOU ───────────────────────────────────────────────
  {
    keywords: [
      'who are you',
      'what are you',
      'what is lumi',
      'tell me about yourself',
      'about lumi',
      'lumi?',
    ],
    response:
      "I'm Lumi 🐱✨ — Lumexa's space cat guide!\nI live in the stars and help students, parents, and teachers navigate the Lumexa platform.\nI can help with booking classes, account setup, finding teachers, and anything Lumexa-related. What do you need?",
  },

  // ── BOOKING A CLASS ──────────────────────────────────────────────────────────
  {
    keywords: [
      'book',
      'booking',
      'schedule',
      'reserve',
      'class',
      'lesson',
      'session',
      'how do i book',
      'book a class',
      'book a lesson',
    ],
    response:
      "Booking a class is easy! Here's how 🚀\n\n1. Go to **Browse Teachers** (or Marketplace) from your dashboard\n2. Browse available teachers and filter by subject or grade\n3. Click on a teacher you like\n4. Choose an available time slot\n5. Confirm and pay — done!\n\nYour upcoming class will appear in your dashboard under *My Lessons*.",
  },

  // ── VIEW LESSONS / MY LESSONS ────────────────────────────────────────────────
  {
    keywords: [
      'my lessons',
      'view lessons',
      'see lessons',
      'upcoming lessons',
      'scheduled lessons',
      'upcoming classes',
      'where are my lessons',
      'find my class',
    ],
    response:
      "Your lessons are right here! 📅\n\nHead to your **Student Dashboard** and look for *My Lessons* or *Schedule*.\nYou'll see:\n• Upcoming classes with dates and times\n• A **Join Now** button when class is about to start\n• Completed class history\n\nNeed help finding the dashboard? Just ask!",
  },

  // ── JOIN CLASS / STAR LAB ────────────────────────────────────────────────────
  {
    keywords: [
      'join class',
      'join lesson',
      'join now',
      'star lab',
      'video call',
      'live class',
      'classroom',
      'how do i join',
      'enter class',
    ],
    response:
      "Joining your live class is simple! 🌟\n\n1. Go to your **Student Dashboard → My Lessons**\n2. Find your upcoming class\n3. When it's time, click the green **Join Class** button\n4. You'll enter the **Star Lab** — our live video classroom!\n\nTip: Make sure your camera and microphone are allowed in your browser before joining 🎙️",
  },

  // ── RECORDINGS ──────────────────────────────────────────────────────────────
  {
    keywords: [
      'recording',
      'recordings',
      'replay',
      'watch again',
      'rewatch',
      'class recording',
      'missed class',
      'where are recordings',
    ],
    response:
      "Want to rewatch a class? 🎬\n\nGo to your **Student Dashboard → Recordings**.\nCompleted classes that were recorded will appear there.\n\nNote: Recording availability depends on your teacher's setup — if you don't see one, you can ask your teacher directly! 📩",
  },

  // ── CONTACT TEACHER ──────────────────────────────────────────────────────────
  {
    keywords: [
      'contact teacher',
      'message teacher',
      'reach teacher',
      'talk to teacher',
      'email teacher',
      'communicate',
    ],
    response:
      "To connect with your teacher 📩\n\nRight now, the best ways to reach your teacher are:\n• During the live **Star Lab** session\n• Through the **My Teachers** section in your student dashboard\n\nWe're working on a direct messaging feature — stay tuned! 🛸",
  },

  // ── FIND / BROWSE TEACHERS ──────────────────────────────────────────────────
  {
    keywords: [
      'find teacher',
      'browse teacher',
      'search teacher',
      'marketplace',
      'available teachers',
      'which teacher',
      'good teacher',
      'best teacher',
    ],
    response:
      "Finding the perfect teacher is an adventure! 🔭\n\nFrom your **Parent Dashboard**, click **Find a Teacher** or **Browse Teachers**.\nYou can filter by:\n• Subject (Math, Science, Coding, English...)\n• Grade level\n• Availability\n• Rating\n\nEach teacher has a profile with their bio, hourly rate, and rating. Click **Book Lesson** when you're ready!",
  },

  // ── TEACHER PROFILE SETUP ────────────────────────────────────────────────────
  {
    keywords: [
      'teacher profile',
      'complete profile',
      'setup profile',
      'profile setup',
      'how do i set up',
      'profile verification',
      'become teacher',
      'pilot profile',
    ],
    response:
      "Setting up your teacher profile? Great choice, Pilot! 🚀\n\nHere's how:\n1. Log in and go to **Teacher Dashboard → Profile**\n2. Add your **bio, subjects, and hourly rate**\n3. Upload your **verification documents** (if prompted)\n4. Set your **availability** in the Calendar section\n5. You'll appear in the marketplace once verified!\n\nNeed help with a specific step? Just ask!",
  },

  // ── CREATE AVAILABILITY / CALENDAR ──────────────────────────────────────────
  {
    keywords: [
      'availability',
      'create slot',
      'add availability',
      'calendar',
      'schedule time',
      'set hours',
      'open slot',
      'time slot',
      'shifts',
    ],
    response:
      'Setting your availability as a teacher 📅\n\n1. Go to **Teacher Dashboard → Calendar**\n2. Click on an empty time slot\n3. Set the start and end time for your availability\n4. Save — that slot is now bookable by students!\n\nImportant: You must add availability at least **24 hours in advance**, and slots must be at least **30 minutes** long.',
  },

  // ── UPLOAD DOCUMENTS ─────────────────────────────────────────────────────────
  {
    keywords: [
      'upload document',
      'upload docs',
      'verify',
      'verification',
      'id document',
      'qualification',
      'certificate',
      'how do i upload',
    ],
    response:
      'Uploading your teacher documents is simple! 📄\n\n1. Go to **Teacher Dashboard → Profile**\n2. Look for the **Documents** or **Verification** section\n3. Click **Upload** and select your file (PDF, JPG, PNG)\n4. Submit and wait for admin review\n\nOnce verified, your profile will go live in the marketplace! ✨',
  },

  // ── EARNINGS ────────────────────────────────────────────────────────────────
  {
    keywords: [
      'earning',
      'earnings',
      'money',
      'pay',
      'payment',
      'payout',
      'how much',
      'salary',
      'income',
      'revenue',
      'reward',
      'how do i get paid',
    ],
    response:
      "Here's how earnings work for teachers 💰\n\n• You earn **75%** of each class fee\n• Lumexa retains a **25%** platform fee\n• Payment is released after the class ends\n\nYou can view your full earnings history in **Teacher Dashboard → Earnings**.\n\nStrikes? Each strike beyond the quota deducts $5 from your next payout. Keep a clean record! ⭐",
  },

  // ── STRIKES / CONDUCT ────────────────────────────────────────────────────────
  {
    keywords: [
      'strike',
      'strikes',
      'suspend',
      'suspended',
      'account suspended',
      'conduct',
      'guidelines',
      'rules',
      'penalty',
    ],
    response:
      "About Lumexa's strike system ⚡\n\n• **Strike 1–2**: Warning + earnings penalty\n• **Strike 3**: Account suspended, pending admin review\n\nStrikes happen for: no-shows, late cancellations (< 2hr notice), or misconduct.\n\nFor the full policy, go to **Teacher Dashboard → Pilot Guidelines**.\n\nYour record auto-clears after 90 days of clean conduct 🌟",
  },

  // ── LEADERBOARD / RANK ───────────────────────────────────────────────────────
  {
    keywords: [
      'leaderboard',
      'rank',
      'ranking',
      'tier',
      'points',
      'badge',
      'level up',
      'galaxy rank',
      'starchild',
      'cosmonaut',
      'captain',
    ],
    response:
      'The Lumexa leaderboard ranks both teachers and students! 🏆\n\n**Teacher ranks** are based on points from completed classes and ratings.\n**Student ranks** (Galaxy Tiers) are based on classes attended:\n🌟 Starchild → 🔭 Explorer → 🛸 Cosmonaut → 🧭 Navigator → 🎖️ Captain → 🌌 Galaxy\n\nCheck your rank in the **Leaderboard** section of your dashboard!',
  },

  // ── PASSWORD / LOGIN ─────────────────────────────────────────────────────────
  {
    keywords: [
      'password',
      'forgot password',
      'reset password',
      'login',
      'log in',
      "can't login",
      'account',
      'sign in',
      'access',
      'locked out',
    ],
    response:
      "Login trouble? Let me help! 🔑\n\nIf you can't log in:\n1. Make sure you're using the right **email address**\n2. Try the **Create Account** option if you haven't registered yet\n3. Check your email for any confirmation links\n\nIf you're still stuck, contact Lumexa support at **support@lumexa.app** and we'll get you sorted! 🐱",
  },

  // ── REGISTER / CREATE ACCOUNT ────────────────────────────────────────────────
  {
    keywords: [
      'register',
      'create account',
      'sign up',
      'how do i register',
      'how to join',
      'new account',
      'get started',
    ],
    response:
      "Welcome to Lumexa! Here's how to get started 🚀\n\n1. Go to the **Register** page\n2. Choose your role: **Parent** or **Teacher**\n3. Enter your name, email, and password\n4. Hit **Create Account**!\n\n**Parents** manage student accounts and book classes.\n**Teachers** set availability and earn per class.\n\nAlready have an account? Just **Log In** instead!",
  },

  // ── ADD STUDENT ──────────────────────────────────────────────────────────────
  {
    keywords: [
      'add student',
      'create student',
      'new student',
      'enroll student',
      'my child',
      'student account',
      'cadet',
    ],
    response:
      "Adding a student is quick! 👨‍🚀\n\n1. Log in as a **Parent**\n2. Go to your **Parent Dashboard**\n3. Click **+ Add Student**\n4. Enter your child's name and age\n5. Done — your student is enrolled as a Cadet!\n\nYou can then open their **Student Dashboard** to book classes and track progress.",
  },

  // ── STUDENT DASHBOARD ────────────────────────────────────────────────────────
  {
    keywords: [
      'student dashboard',
      'dashboard',
      'where is',
      'navigate',
      'menu',
      'find',
      'how do i get to',
      'open dashboard',
    ],
    response:
      "Here's how to get around Lumexa! 🗺️\n\n**As a Parent:**\n• Dashboard → see your students\n• Click **Open Dashboard** on any student to see their progress\n\n**As a Teacher:**\n• Teacher Dashboard → manage everything\n• Calendar → set availability\n• Students → see your cadets\n• Earnings → track your rewards\n\nNeed help finding something specific? Tell me what you're looking for!",
  },

  // ── REVIEW / RATING ──────────────────────────────────────────────────────────
  {
    keywords: [
      'review',
      'rating',
      'rate',
      'feedback',
      'stars',
      'leave review',
      'how to review',
    ],
    response:
      'Leaving a review helps teachers grow! ⭐\n\n1. Go to **Student Dashboard → My Lessons**\n2. Find a **completed** class\n3. Click the **⭐ Rate** button\n4. Choose a star rating (1–5) and leave an optional comment\n5. Submit!\n\nYour review helps other families find great teachers 🌟',
  },

  // ── PAYMENT / STRIPE ─────────────────────────────────────────────────────────
  {
    keywords: [
      'payment',
      'pay',
      'stripe',
      'credit card',
      'charge',
      'billing',
      'invoice',
      'refund',
      'cancel booking',
    ],
    response:
      'About payments on Lumexa 💳\n\n• Classes are paid when you book\n• We use **Stripe** — a secure, trusted payment platform\n• Your card details are never stored on Lumexa\n\nFor refunds or billing issues, contact **support@lumexa.app** with your booking ID.\n\nNote: Refunded classes will show as *Cancelled* in your lesson history.',
  },

  // ── TECHNICAL ISSUES ─────────────────────────────────────────────────────────
  {
    keywords: [
      'technical',
      'not working',
      'broken',
      'bug',
      'error',
      'issue',
      'problem',
      'glitch',
      'crash',
      'slow',
      'fix',
    ],
    response:
      "Uh oh, something's not working? Let me help! 🛠️\n\nTry these quick fixes first:\n1. **Refresh the page** (Ctrl+R or Cmd+R)\n2. **Clear your browser cache** (Ctrl+Shift+Delete)\n3. **Try a different browser** (Chrome works best)\n4. **Check your internet connection**\n\nIf it's still broken, please email **support@lumexa.app** with:\n• What you were doing\n• A screenshot if possible\n• Your device and browser",
  },

  // ── CAMERA / MICROPHONE ──────────────────────────────────────────────────────
  {
    keywords: [
      'camera',
      'microphone',
      'mic',
      'audio',
      'video',
      'permission',
      'browser permission',
      'can t hear',
      'can t see',
    ],
    response:
      "Camera or mic issues during class? 🎙️\n\nHere's how to fix it:\n1. Look for a **camera icon** in your browser's address bar — click it and **Allow**\n2. If denied, go to **Browser Settings → Privacy → Camera/Microphone** and allow Lumexa\n3. Reload the page after allowing\n4. Make sure no other app is using your camera (Zoom, Teams, etc.)\n\nStill having trouble? Email us at **support@lumexa.app** 📧",
  },

  // ── SUBJECTS ─────────────────────────────────────────────────────────────────
  {
    keywords: [
      'subjects',
      'what subjects',
      'what can i learn',
      'courses',
      'topics',
      'math',
      'science',
      'english',
      'art',
      'music',
      'history',
    ],
    response:
      'Lumexa offers one-on-one tutoring in loads of subjects! 📚\n\nYou can find teachers for:\n• **Math** (from basic arithmetic to calculus)\n• **Science** (physics, chemistry, biology)\n• **English & Writing**\n• **Coding & Programming** ← *taught by real teachers!*\n• **History & Social Studies**\n• **Art & Music**\n• And more!\n\nBrowse the **Marketplace** to filter by subject and find your perfect teacher 🔭',
  },

  // ── PRICE / HOW MUCH ─────────────────────────────────────────────────────────
  {
    keywords: [
      'price',
      'how much',
      'cost',
      'fee',
      'hourly rate',
      'expensive',
      'cheap',
      'affordable',
    ],
    response:
      "Pricing on Lumexa varies by teacher! 💰\n\nEach teacher sets their own **hourly rate**.\nYou can see the price clearly on each teacher's profile card in the **Marketplace** before booking.\n\nTip: Filter by price in the marketplace to find teachers that fit your budget! Every cadet deserves a great pilot 🚀",
  },

  // ── HELP / SUPPORT ───────────────────────────────────────────────────────────
  {
    keywords: [
      'help',
      'support',
      'contact',
      'assistance',
      'i need help',
      'human',
      'real person',
      'agent',
    ],
    response:
      "Need real support? I've got you! 🐱\n\nFor urgent issues, reach our team:\n📧 **support@lumexa.app**\n\nI can also help with:\n• Finding your way around the platform\n• Booking and scheduling\n• Account and profile setup\n• Understanding how Lumexa works\n\nWhat do you need help with?",
  },

  // ── GOODBYE ──────────────────────────────────────────────────────────────────
  {
    keywords: [
      'bye',
      'goodbye',
      'see you',
      'later',
      'thanks',
      'thank you',
      'cheers',
      "that's all",
      'done',
      'all good',
    ],
    response:
      "Happy exploring, Cadet! 🐱✨\nIf you need me again, just tap the Lumi button — I'll be floating nearby in the galaxy 🌌\nBlast off! 🚀",
  },
];

// ── Blocked Topics — Programming / Homework ────────────────────────────────────
//
// Any message matching these keywords triggers an immediate refusal.
// This protects Lumexa's business model (teachers earn money by teaching).

const BLOCKED_KEYWORDS: string[] = [
  // Programming languages
  'python',
  'javascript',
  'java',
  'c++',
  'c#',
  'ruby',
  'rust',
  'golang',
  'php',
  'typescript',
  'swift',
  'kotlin',
  'scala',
  'perl',
  'haskell',
  'r language',
  // Programming concepts
  'recursion',
  'algorithm',
  'data structure',
  'linked list',
  'binary tree',
  'sorting',
  'bubble sort',
  'merge sort',
  'quicksort',
  'hash map',
  'hash table',
  'pointer',
  'memory allocation',
  'stack overflow',
  'big o',
  'complexity',
  'object oriented',
  'functional programming',
  'inheritance',
  'polymorphism',
  // Coding activities
  'debug',
  'debugging',
  'compile',
  'syntax error',
  'runtime error',
  'write code',
  'write a function',
  'write a program',
  'fix my code',
  'explain my code',
  'code review',
  'my code',
  'this code',
  'snippet',
  // Homework subjects
  'solve this',
  'solve for',
  'what is the answer',
  'homework',
  'assignment',
  'my homework',
  'do my homework',
  'answer this question',
  'help me solve',
  'calculus',
  'derivative',
  'integral',
  'differential equation',
  'physics problem',
  'chemistry equation',
  'balance equation',
  // Math homework
  'solve the equation',
  'find x',
  'calculate',
  'what is 2+2',
  'what is math',
  // Essay help
  'write my essay',
  'write an essay',
  'write a paragraph',
  'proofread',
  'grammar check',
  'fix my essay',
  'write this for me',
];

const BLOCKED_RESPONSES = [
  "Oh wow, that sounds like a fantastic topic! 🐱✨\nBut Lumi is just your Lumexa platform guide — not a tutor.\nOur amazing teachers would *love* to help you with that!\n👉 Try **booking a class** in the Marketplace — they're experts at this stuff! 🚀",
  "Great question — but that's way beyond what Lumi knows! 🌟\nLumi helps you navigate Lumexa, not solve problems.\nThere are brilliant teachers on the platform who can walk you through this step by step!\n👉 Head to **Browse Teachers** to find the right one 🔭",
  "Ooh, that's exactly the kind of question our teachers LOVE! 🐱\nLumi's job is to help you use Lumexa — the real learning happens with your teacher.\nBook a session and you'll get a proper explanation!\n👉 **Browse Teachers** → pick a subject → book a class 📚",
];

// ── Lumi Service ───────────────────────────────────────────────────────────────

@Injectable()
export class LumiService {
  private readonly logger = new Logger(LumiService.name);

  private readonly ollamaUrl: string;
  private readonly ollamaModel: string;

  constructor() {
    this.ollamaUrl = process.env.OLLAMA_URL ?? 'http://localhost:11434';
    this.ollamaModel = process.env.OLLAMA_MODEL ?? 'llama3.2';
  }

  // ── Public entry point ──────────────────────────────────────────────────────

  async chat(
    message: string,
    history: ChatMessage[] = [],
    variant: 'teacher' | 'student' | 'parent' = 'student',
  ): Promise<LumiResponse> {
    const clean = message.trim();
    if (!clean) {
      return {
        reply: "Meow? I didn't catch that 🐱 — could you try again?",
        source: 'fallback',
      };
    }

    // 1. Guardrail check — block programming/homework questions
    const blocked = this.isBlockedTopic(clean);
    if (blocked) {
      const r =
        BLOCKED_RESPONSES[Math.floor(Math.random() * BLOCKED_RESPONSES.length)];
      return { reply: r, source: 'guardrail' };
    }

    // 2. FAQ rule-based match
    const faqMatch = this.matchFAQ(clean);
    if (faqMatch) {
      return {
        reply: faqMatch.response,
        source: 'faq',
        matched: faqMatch.matched,
      };
    }

    // 3. Ollama AI fallback (platform context only)
    try {
      const ollamaReply = await this.askOllama(clean, history, variant);
      return { reply: ollamaReply, source: 'ollama' };
    } catch (err) {
      this.logger.warn(
        'Ollama unavailable, using static fallback',
        err instanceof Error ? err.message : String(err),
      );
      return {
        reply: this.staticFallback(clean),
        source: 'fallback',
      };
    }
  }

  // ── Guardrail: detect blocked topics ───────────────────────────────────────

  private isBlockedTopic(message: string): boolean {
    const lower = message.toLowerCase();
    return BLOCKED_KEYWORDS.some((kw) => lower.includes(kw));
  }

  // ── FAQ: keyword matching ───────────────────────────────────────────────────

  private matchFAQ(
    message: string,
  ): { response: string; matched: string } | null {
    const lower = message.toLowerCase();
    for (const entry of FAQ_ENTRIES) {
      const hit = entry.keywords.find((kw) => lower.includes(kw));
      if (hit) {
        return { response: entry.response, matched: hit };
      }
    }
    return null;
  }

  // ── Ollama: AI fallback for allowed platform questions ─────────────────────

  private async askOllama(
    message: string,
    history: ChatMessage[],
    variant: string,
  ): Promise<string> {
    const roleCtx: Record<string, string> = {
      teacher:
        'The user is a teacher (called a Pilot) who teaches live classes on Lumexa.',
      student: 'The user is a student (called a Cadet) learning on Lumexa.',
      parent:
        "The user is a parent (called a Commander) who manages their child's learning on Lumexa.",
    };

    const systemPrompt = `You are Lumi 🐱, a friendly space cat AI assistant for Lumexa — an online live tutoring platform.
${roleCtx[variant] ?? roleCtx.student}

Lumexa platform summary:
- Parents book one-on-one live classes for their children (ages 4-18)
- Teachers create time slots, conduct live video classes, and earn from the class fee
- Students attend classes in the "Star Lab" (LiveKit video room)
- The platform has a Marketplace to browse and book teachers
- There is a leaderboard system with rank tiers

Your role: ONLY help with Lumexa platform questions, navigation, onboarding, and support.

STRICT RULES:
1. NEVER solve homework, explain algorithms, write code, explain programming concepts, or answer academic subject questions
2. If asked about anything academic/homework, say you can't help with that and encourage booking a teacher
3. Keep responses SHORT (2-4 sentences max for simple questions)
4. Use a friendly, playful, slightly cat-like tone
5. Use 1-2 emojis max per response
6. If you don't know something specific about the platform, suggest emailing support@lumexa.app

Personality: Friendly, curious, encouraging, engaging. Like a helpful space cat companion.`;

    // Build conversation for Ollama
    const ollamaMessages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-10).map((m) => ({
        role: m.role,
        content: m.content,
      })),
      { role: 'user', content: message },
    ];

    const response = await fetch(`${this.ollamaUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.ollamaModel,
        messages: ollamaMessages,
        stream: false,
        options: {
          temperature: 0.7,
          num_predict: 200,
          stop: ['\n\n\n'], // prevent rambling
        },
      }),
      signal: AbortSignal.timeout(15000), // 15s timeout
    });

    if (!response.ok) {
      throw new Error(`Ollama returned ${response.status}`);
    }

    const data = (await response.json()) as {
      message?: { content?: string };
      error?: string;
    };

    if (data.error) throw new Error(data.error);

    const reply = data.message?.content?.trim();
    if (!reply) throw new Error('Empty response from Ollama');

    // Final guardrail pass on AI response
    if (this.isBlockedTopic(reply)) {
      return BLOCKED_RESPONSES[0];
    }

    return reply;
  }

  // ── Static fallback when Ollama is unavailable ─────────────────────────────

  private staticFallback(message: string): string {
    // One last attempt at generic helpful responses
    const lower = message.toLowerCase();

    if (lower.includes('?')) {
      return "Hmm, I'm not sure about that one! 🐱\nFor anything I can't answer, our support team is always ready:\n📧 **support@lumexa.app**\n\nOr try asking me about booking, lessons, or your profile!";
    }

    return "Interesting! 🌟 I'm still learning, so for complex questions, check with our team at **support@lumexa.app**.\nI'm best at helping with booking, navigation, and platform questions — ask me anything about those!";
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// OLLAMA SETUP GUIDE
// ─────────────────────────────────────────────────────────────────────────────
//
// Ollama is FREE and runs entirely on your machine or server.
// No API keys, no costs, no rate limits.
//
// 1. INSTALL OLLAMA
//    Mac/Linux: curl -fsSL https://ollama.ai/install.sh | sh
//    Windows:   Download from https://ollama.ai/download
//
// 2. PULL A MODEL (choose one based on your RAM):
//    ollama pull llama3.2       # Recommended — 2GB, fast and smart
//    ollama pull mistral        # 4GB, very capable
//    ollama pull phi3           # 2.2GB, Microsoft's efficient model
//    ollama pull gemma2:2b      # 1.6GB, Google's small model
//
// 3. START THE SERVER
//    ollama serve               # Starts on http://localhost:11434
//
// 4. ADD TO server/.env (optional)
//    OLLAMA_URL=http://localhost:11434
//    OLLAMA_MODEL=llama3.2
//
// 5. TEST IT
//    curl http://localhost:11434/api/chat -d '{
//      "model": "llama3.2",
//      "messages": [{"role":"user","content":"Hello!"}],
//      "stream": false
//    }'
//
// PRODUCTION NOTE:
//    For production, run Ollama on your server and set OLLAMA_URL accordingly.
//    Example: OLLAMA_URL=http://your-server:11434
//    The NestJS backend proxies all requests — Ollama is never exposed directly.
// ─────────────────────────────────────────────────────────────────────────────
