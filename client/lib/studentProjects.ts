// Portfolio projects shown in the homepage showcase.
//
// NOTE: these are illustrative sample projects. Screenshots live in
// client/public/student-projects/<id>.webp and are generated from the HTML
// sources in client/scripts/project-screenshots/ (see build.mjs there).
// Swap in real student work (and real names, with parental consent) when it
// is available. Students are shown by first name + last initial only.

export type Interest = "games" | "ai" | "web" | "data" | "young" | "career";

export interface StudentProject {
  id: string; // also the screenshot filename and the demo registry key
  interest: Interest;
  emoji: string;
  title: string;
  student: string; // first name + last initial
  age: number;
  program: string; // Lumexa program the project belongs to
  tech: string[];
  desc: string;
  skill: string; // skill demonstrated
}

export const INTEREST_META: Record<Interest, { label: string; emoji: string }> = {
  games: { label: "Games", emoji: "🎮" },
  ai: { label: "AI & Robots", emoji: "🤖" },
  web: { label: "Websites", emoji: "🌐" },
  data: { label: "Data & Science", emoji: "📊" },
  young: { label: "Young Learners", emoji: "🌟" },
  career: { label: "Future Career", emoji: "💼" },
};

export const projectImage = (id: string) => `/student-projects/${id}.webp`;

export const STUDENT_PROJECTS: StudentProject[] = [
  // ── Games ────────────────────────────────────────────────────────────────
  {
    id: "galactic-shooter",
    interest: "games",
    emoji: "🎮",
    title: "Galactic Shooter",
    student: "Rafi A.",
    age: 12,
    program: "Game Creator",
    tech: ["Roblox", "Lua"],
    desc: "A space shooter where players fly a ship, fire lasers and climb a live leaderboard.",
    skill: "Game loops and scoring",
  },
  {
    id: "python-arcade",
    interest: "games",
    emoji: "🕹️",
    title: "Python Arcade Game",
    student: "Nabil K.",
    age: 13,
    program: "Game Creator",
    tech: ["Python", "Pygame"],
    desc: "A side-scrolling arcade game with enemies, coins, power-ups and a high-score table.",
    skill: "Collision detection and game states",
  },
  {
    id: "rpg-quest-world",
    interest: "games",
    emoji: "🗡️",
    title: "RPG Quest World",
    student: "Kevin W.",
    age: 15,
    program: "Game Creator",
    tech: ["Unity", "C#"],
    desc: "A top-down adventure with quests, friendly characters and simple combat.",
    skill: "Game design and C# classes",
  },
  // ── AI & Robots ──────────────────────────────────────────────────────────
  {
    id: "mood-detector",
    interest: "ai",
    emoji: "🤖",
    title: "Mood Detector AI",
    student: "Tanvir H.",
    age: 16,
    program: "AI Builder",
    tech: ["Python", "TensorFlow", "OpenCV"],
    desc: "A webcam app that finds a face and guesses the emotion in real time.",
    skill: "Computer vision and model predictions",
  },
  {
    id: "recipe-chatbot",
    interest: "ai",
    emoji: "🍲",
    title: "Recipe Chatbot",
    student: "Ishrat J.",
    age: 15,
    program: "AI Builder",
    tech: ["Python", "OpenAI API", "Streamlit"],
    desc: "A chatbot that suggests recipes from the ingredients you already have at home.",
    skill: "Prompt design and working with APIs",
  },
  {
    id: "study-planner",
    interest: "ai",
    emoji: "🧠",
    title: "Smart Study Planner",
    student: "Sadman C.",
    age: 15,
    program: "AI Builder",
    tech: ["Python", "OpenAI API"],
    desc: "Turns a student's weak topics into a personal weekly study schedule.",
    skill: "Logic, data and planning algorithms",
  },
  // ── Websites ─────────────────────────────────────────────────────────────
  {
    id: "photography-portfolio",
    interest: "web",
    emoji: "📸",
    title: "Photography Portfolio",
    student: "Tasnia R.",
    age: 15,
    program: "Web Developer",
    tech: ["HTML", "CSS", "JavaScript"],
    desc: "A responsive photo gallery website, published live for anyone to visit.",
    skill: "Responsive layout and visual design",
  },
  {
    id: "ecommerce-store",
    interest: "web",
    emoji: "🛒",
    title: "E-Commerce Store",
    student: "Jamie C.",
    age: 16,
    program: "Web Developer",
    tech: ["React", "Node.js"],
    desc: "An online shop with product pages, a working cart and a checkout flow.",
    skill: "Components and state management",
  },
  {
    id: "school-events-app",
    interest: "web",
    emoji: "📅",
    title: "School Events App",
    student: "Mahiya I.",
    age: 14,
    program: "Web Developer",
    tech: ["React", "Next.js"],
    desc: "A web app where students browse school events, register and set reminders.",
    skill: "Building real web apps with data",
  },
  // ── Data & Science ───────────────────────────────────────────────────────
  {
    id: "climate-dashboard",
    interest: "data",
    emoji: "🌍",
    title: "Climate Data Dashboard",
    student: "Emma W.",
    age: 17,
    program: "Data Scientist",
    tech: ["Python", "Pandas", "Plotly"],
    desc: "An interactive dashboard showing how global temperatures changed over 30 years.",
    skill: "Data cleaning and visualisation",
  },
  {
    id: "sports-stats",
    interest: "data",
    emoji: "⚽",
    title: "Sports Stats Analyser",
    student: "Zayan K.",
    age: 15,
    program: "Data Scientist",
    tech: ["Python", "Pandas", "Matplotlib"],
    desc: "Compares football players with charts so a team can study its next opponent.",
    skill: "Data analysis and charts",
  },
  {
    id: "market-trends",
    interest: "data",
    emoji: "💹",
    title: "Market Trends Predictor",
    student: "Aisha S.",
    age: 16,
    program: "Data Scientist",
    tech: ["Python", "scikit-learn"],
    desc: "A simple machine learning model that forecasts a price trend from past data.",
    skill: "Machine learning basics",
  },
  // ── Young Learners ───────────────────────────────────────────────────────
  {
    id: "safari-adventure",
    interest: "young",
    emoji: "🦁",
    title: "Safari Adventure Game",
    student: "Lucas M.",
    age: 9,
    program: "Little Coders",
    tech: ["Scratch"],
    desc: "An animated game where you explore the savanna and find hidden animals.",
    skill: "Sequencing and events",
  },
  {
    id: "space-maths-quiz",
    interest: "young",
    emoji: "🚀",
    title: "Space Maths Quiz",
    student: "Anika T.",
    age: 8,
    program: "Little Coders",
    tech: ["Scratch"],
    desc: "Answer maths questions correctly to blast the asteroids before they land.",
    skill: "Loops, variables and logic",
  },
  {
    id: "drawing-robot",
    interest: "young",
    emoji: "🐢",
    title: "Python Drawing Robot",
    student: "Ayaan R.",
    age: 10,
    program: "Little Coders",
    tech: ["Python", "Turtle"],
    desc: "A robot that draws shapes and patterns from commands your child types.",
    skill: "Loops and first Python code",
  },
  // ── Future Career ────────────────────────────────────────────────────────
  {
    id: "freelance-brand-kit",
    interest: "career",
    emoji: "💼",
    title: "Freelance Brand Kit",
    student: "Nadia S.",
    age: 17,
    program: "Digital Independence",
    tech: ["Canva", "HTML", "CSS"],
    desc: "A complete personal brand: logo, colours, portfolio page and service package.",
    skill: "Branding and professional presentation",
  },
  {
    id: "content-portfolio",
    interest: "career",
    emoji: "🎬",
    title: "Content Creator Portfolio",
    student: "Mehrin Z.",
    age: 16,
    program: "Digital Independence",
    tech: ["Canva", "Notion"],
    desc: "A personal brand and a month-long content calendar, ready to publish.",
    skill: "Content planning and storytelling",
  },
  {
    id: "tutoring-service",
    interest: "career",
    emoji: "💡",
    title: "Tech Tutoring Service",
    student: "Tyler B.",
    age: 17,
    program: "Digital Independence",
    tech: ["Notion", "Google Sheets", "Canva"],
    desc: "A small service plan for coding tutoring: packages, a schedule and a booking sheet.",
    skill: "Planning, pricing and communication",
  },
];

// One standout project per interest, shown before a visitor picks anything.
export const FEATURED_IDS = [
  "galactic-shooter",
  "mood-detector",
  "photography-portfolio",
  "climate-dashboard",
  "safari-adventure",
  "freelance-brand-kit",
];
