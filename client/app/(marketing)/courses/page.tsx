"use client";

import { useState } from "react";
import Link from "next/link";

const pathways = [
  {
    id: "game",
    emoji: "🎮",
    title: "Game Creator Path",
    tagline: "Build 3 Real Games",
    ages: "Ages 10–18",
    color: "from-red-600 to-orange-600",
    border: "border-red-700/40",
    badge: "bg-red-900/30 text-red-300",
    accent: "text-red-400",
    courses: [
      {
        number: "01",
        title: "Roblox World Builder",
        lessons: 8,
        outcome: "Build and publish a multiplayer Roblox game from scratch",
        description: "Your child goes from zero to a working multiplayer Roblox game. They design the world, write the Lua code, set up game logic, and publish it so friends can actually play it.",
        projects: ["Obstacle course with scoring", "Multiplayer arena with teams", "Custom game world with NPCs"],
        tools: ["Roblox Studio", "Lua scripting", "Roblox DevHub"],
        lessonBreakdown: [
          "Roblox Studio setup and first build",
          "Scripting basics in Lua",
          "Player mechanics and movement",
          "Game logic and scoring systems",
          "Multiplayer networking basics",
          "World design and aesthetics",
          "Testing, debugging, polishing",
          "Publishing and sharing with friends",
        ],
      },
      {
        number: "02",
        title: "Python Arcade Games",
        lessons: 8,
        outcome: "Build 2D games using Python and Pygame",
        description: "After Roblox, your child levels up to Python — the real language used by professional game developers and AI engineers. They build 2D arcade games from scratch.",
        projects: ["Space shooter with enemies", "Maze runner with timer", "Brick-breaker clone"],
        tools: ["Python 3", "Pygame", "VS Code"],
        lessonBreakdown: [
          "Python basics for game development",
          "Pygame setup and game loop",
          "Sprites, images, and movement",
          "Collision detection",
          "Enemies, AI behavior, and scoring",
          "Sound effects and music",
          "Game states (menu, play, game over)",
          "Packaging and sharing your game",
        ],
      },
      {
        number: "03",
        title: "Advanced Game Design",
        lessons: 8,
        outcome: "Design, polish, and publish a complete game with professional quality",
        description: "The capstone course. Your child applies everything they know to design and ship a complete game — with proper level design, a polished UI, and real playtesters giving feedback.",
        projects: ["RPG adventure with storyline", "Physics-based puzzle game", "Published portfolio game"],
        tools: ["Python / Pygame", "Unity Basics", "Game Design frameworks"],
        lessonBreakdown: [
          "Game design fundamentals (loops, balance, flow)",
          "Level design theory and practice",
          "Advanced Python: classes and game architecture",
          "Unity introduction and first scene",
          "UI design and player experience",
          "Playtesting and iteration",
          "Performance optimization",
          "Final polish and portfolio submission",
        ],
      },
    ],
  },
  {
    id: "ai",
    emoji: "🤖",
    title: "AI Builder Path",
    tagline: "Build 3 Real AI Projects",
    ages: "Ages 12–18",
    color: "from-purple-600 to-blue-600",
    border: "border-purple-700/40",
    badge: "bg-purple-900/30 text-purple-300",
    accent: "text-purple-400",
    featured: true,
    courses: [
      {
        number: "04",
        title: "Python and AI Foundations",
        lessons: 8,
        outcome: "Write Python scripts and understand how machine learning really works",
        description: "The foundation of everything. Your child learns Python from scratch — variables, loops, functions, data — then builds their first machine learning model. No fluff, just real code.",
        projects: ["Number prediction model", "Simple image classifier", "Data pattern finder"],
        tools: ["Python 3", "Jupyter Notebooks", "scikit-learn", "NumPy"],
        lessonBreakdown: [
          "Python setup and first program",
          "Variables, data types, and logic",
          "Loops, functions, and modules",
          "Working with data and lists",
          "Introduction to machine learning concepts",
          "Building a first prediction model",
          "Training, testing, and evaluating models",
          "Presenting results to non-technical audiences",
        ],
      },
      {
        number: "05",
        title: "Computer Vision Projects",
        lessons: 8,
        outcome: "Build apps that see, detect, and recognize the real world",
        description: "Your child builds apps that use a camera to detect faces, recognize objects, and read emotions — the same technology used in self-driving cars and medical diagnostics.",
        projects: ["Real-time emotion detector", "Object recognition app", "Motion-activated security cam"],
        tools: ["Python", "OpenCV", "TensorFlow / Keras", "Webcam API"],
        lessonBreakdown: [
          "How computers see images (pixels and arrays)",
          "OpenCV setup and first image processing",
          "Face detection with pre-trained models",
          "Emotion recognition and classification",
          "Object detection with YOLO",
          "Real-time webcam processing",
          "Building a full computer vision app",
          "Deploying and demoing your project",
        ],
      },
      {
        number: "06",
        title: "Language Models and Chatbots",
        lessons: 8,
        outcome: "Build conversational AI apps using real LLM APIs",
        description: "Your child learns how ChatGPT actually works, then builds their own chatbot applications using the OpenAI API — complete with memory, personality, and real-world purpose.",
        projects: ["Recipe chatbot with memory", "Study assistant bot", "Creative story generator"],
        tools: ["Python", "OpenAI API", "LangChain", "Streamlit"],
        lessonBreakdown: [
          "How language models work (transformers simplified)",
          "OpenAI API setup and first call",
          "Prompt engineering fundamentals",
          "Building conversational memory",
          "Giving your bot a personality and purpose",
          "Connecting to external data sources",
          "Building a UI with Streamlit",
          "Deployment and sharing",
        ],
      },
    ],
  },
  {
    id: "web",
    emoji: "🌐",
    title: "Web Developer Path",
    tagline: "Build 3 Live Websites",
    ages: "Ages 12–18",
    color: "from-blue-600 to-cyan-600",
    border: "border-blue-700/40",
    badge: "bg-blue-900/30 text-blue-300",
    accent: "text-blue-400",
    courses: [
      {
        number: "07",
        title: "HTML and CSS Mastery",
        lessons: 8,
        outcome: "Build beautiful, responsive websites that look great on any device",
        description: "Your child learns the fundamentals of the web — HTML structure and CSS styling — and builds their first real, deployed website that anyone can visit.",
        projects: ["Personal landing page", "Responsive portfolio layout", "Product showcase site"],
        tools: ["HTML5", "CSS3", "Flexbox", "CSS Grid", "Vercel"],
        lessonBreakdown: [
          "How the web works (browsers, servers, HTML)",
          "HTML structure and semantic elements",
          "CSS basics: colors, fonts, spacing",
          "Flexbox for modern layouts",
          "CSS Grid for complex designs",
          "Responsive design and mobile-first",
          "Animations and hover effects",
          "Deploying to Vercel and sharing",
        ],
      },
      {
        number: "08",
        title: "JavaScript and Interactivity",
        lessons: 8,
        outcome: "Add dynamic, interactive behavior to any webpage",
        description: "Static websites are just the beginning. Your child learns JavaScript to make pages that react to clicks, fetch live data, and behave like real apps.",
        projects: ["Interactive to-do app", "Live weather dashboard", "Memory card game"],
        tools: ["JavaScript (ES6+)", "DOM API", "Fetch API", "Local Storage"],
        lessonBreakdown: [
          "JavaScript fundamentals (variables, functions, loops)",
          "DOM manipulation: selecting and changing elements",
          "Event listeners: responding to user actions",
          "Fetch API: pulling live data from the web",
          "Async/await and working with APIs",
          "Local Storage for saving user data",
          "Building a complete interactive app",
          "Debugging and polishing",
        ],
      },
      {
        number: "09",
        title: "React and Full-Stack Web",
        lessons: 8,
        outcome: "Build and deploy modern React applications used in real companies",
        description: "React is the most in-demand frontend framework in the world. Your child builds reusable components, manages state, fetches data from APIs, and deploys a full React app live on the internet.",
        projects: ["E-commerce product page", "Social media feed clone", "Full portfolio React app"],
        tools: ["React 18", "Next.js", "Vercel", "REST APIs"],
        lessonBreakdown: [
          "Why React exists and how components work",
          "JSX, props, and component trees",
          "State with useState and event handling",
          "Fetching data with useEffect",
          "React Router and multi-page apps",
          "Next.js and server-side rendering",
          "Styling with Tailwind CSS",
          "Deploying to Vercel and final project",
        ],
      },
    ],
  },
  {
    id: "little",
    emoji: "🌟",
    title: "Little Coders Path",
    tagline: "First 3 Real Projects",
    ages: "Ages 6–11",
    color: "from-yellow-500 to-orange-500",
    border: "border-yellow-700/40",
    badge: "bg-yellow-900/30 text-yellow-300",
    accent: "text-yellow-400",
    courses: [
      {
        number: "10",
        title: "Scratch Adventures",
        lessons: 8,
        outcome: "Create animated stories, games, and interactive projects visually",
        description: "The perfect first step for young learners. Scratch uses visual blocks instead of text — so your child focuses on logic and creativity, not syntax. By the end, they have real animated projects to show off.",
        projects: ["Animated animal story", "Interactive quiz game", "Creative music maker"],
        tools: ["Scratch (MIT)", "Scratch Editor", "Scratch community"],
        lessonBreakdown: [
          "What is coding and why does it matter",
          "Scratch setup and first sprite",
          "Motion, looks, and sounds blocks",
          "Events and broadcasting",
          "Loops and repetition",
          "Conditionals and decisions",
          "Building an interactive story",
          "Final project: our own game",
        ],
      },
      {
        number: "11",
        title: "Python for Young Builders",
        lessons: 8,
        outcome: "Write first real Python programs — the same language used by NASA and Google",
        description: "The bridge from visual to text-based coding. Your child writes their first Python programs: variables, loops, and their very own mini projects. Taught slowly, with patience, and lots of fun.",
        projects: ["Personal quiz app", "Simple calculator", "Word guessing game"],
        tools: ["Python 3", "Thonny IDE", "Repl.it"],
        lessonBreakdown: [
          "From Scratch blocks to Python text",
          "Variables and user input",
          "Printing and string formatting",
          "If/else decisions",
          "While loops and for loops",
          "Lists and simple data",
          "Building a mini quiz app",
          "Final project: our own mini game",
        ],
      },
    ],
  },
  {
    id: "data",
    emoji: "📊",
    title: "Data Scientist Path",
    tagline: "Build 3 Data Projects",
    ages: "Ages 13–18",
    color: "from-teal-600 to-green-600",
    border: "border-teal-700/40",
    badge: "bg-teal-900/30 text-teal-300",
    accent: "text-teal-400",
    courses: [
      {
        number: "12",
        title: "Python for Data",
        lessons: 8,
        outcome: "Load, clean, and analyze real-world datasets using Python",
        description: "Every data project starts with messy, real-world data. Your child learns to wrangle it into something useful — finding patterns, calculating stats, and drawing conclusions.",
        projects: ["Sports performance analysis", "School grade analysis", "City population trends"],
        tools: ["Python 3", "Pandas", "NumPy", "Jupyter Notebooks"],
        lessonBreakdown: [
          "Why data science matters (real examples)",
          "Python refresher and Jupyter setup",
          "Loading data from CSV and Excel",
          "Pandas: selecting, filtering, sorting",
          "Cleaning data: nulls, duplicates, types",
          "Aggregations: group by, pivot tables",
          "Statistical summaries and correlation",
          "Full analysis project with a real dataset",
        ],
      },
      {
        number: "13",
        title: "Data Visualization",
        lessons: 8,
        outcome: "Turn raw data into compelling, interactive charts and dashboards",
        description: "Data without visuals is just numbers. Your child learns to create charts that tell stories — the kind that make people say 'I never knew that' when they look at the data.",
        projects: ["Climate change dashboard", "Market trends chart", "Sports comparison visualizer"],
        tools: ["Python", "Matplotlib", "Seaborn", "Plotly", "Dash"],
        lessonBreakdown: [
          "The science of good data visualization",
          "Matplotlib: line, bar, scatter plots",
          "Seaborn: statistical visualizations",
          "Choosing the right chart for your data",
          "Color, labels, and storytelling",
          "Interactive charts with Plotly",
          "Building a Dash dashboard",
          "Final: your own interactive dashboard",
        ],
      },
      {
        number: "14",
        title: "Machine Learning Projects",
        lessons: 8,
        outcome: "Build predictive models that make real decisions from real data",
        description: "The pinnacle of data science: teaching a computer to predict outcomes. Your child builds real machine learning models — the same technology behind Netflix recommendations and fraud detection.",
        projects: ["House price predictor", "Customer churn predictor", "Movie recommendation engine"],
        tools: ["Python", "scikit-learn", "XGBoost", "Joblib"],
        lessonBreakdown: [
          "How machine learning works (no maths jargon)",
          "Types of ML: regression vs classification",
          "Train/test splits and model evaluation",
          "Linear regression from scratch",
          "Decision trees and random forests",
          "Feature engineering and selection",
          "Model tuning and improving accuracy",
          "Deploying a prediction model as an API",
        ],
      },
    ],
  },
  {
    id: "digital",
    emoji: "💼",
    title: "Digital Independence Path",
    tagline: "Earn Online as a Teen",
    ages: "Ages 15–18",
    color: "from-green-600 to-emerald-600",
    border: "border-green-700/40",
    badge: "bg-green-900/30 text-green-300",
    accent: "text-green-400",
    courses: [
      {
        number: "15",
        title: "Build Your Digital Identity",
        lessons: 8,
        outcome: "A live portfolio website and polished personal brand ready to attract clients",
        description: "Before you can earn online, you need to exist online. Your teen builds a professional portfolio website from scratch, defines their niche, and creates a brand identity that positions them as a credible service provider.",
        projects: ["Live portfolio website", "Personal brand kit (logo, colors, bio)", "Service offerings page"],
        tools: ["HTML / CSS", "Vercel", "Canva", "GitHub"],
        lessonBreakdown: [
          "What digital identity means and why it matters",
          "Defining your niche and target clients",
          "Building a portfolio website from scratch",
          "Writing a compelling bio and value proposition",
          "Creating a professional logo with Canva",
          "Showcasing projects and work samples",
          "Setting up a custom domain",
          "Deploying live and sharing with the world",
        ],
      },
      {
        number: "16",
        title: "Freelancing Fundamentals",
        lessons: 8,
        outcome: "Active Fiverr and Upwork profiles with a real gig and first client strategy",
        description: "Freelancing is the fastest path to earning online as a teen. Your child learns to package their skills as a service, create compelling gig listings, write winning proposals, and land their first client.",
        projects: ["Fiverr gig setup and optimization", "Upwork profile and first proposal", "Service package + pricing strategy"],
        tools: ["Fiverr", "Upwork", "Canva", "Google Docs"],
        lessonBreakdown: [
          "The freelance economy: how teens can compete",
          "Choosing a service based on your skills",
          "Creating a Fiverr account and first gig",
          "Gig titles, descriptions, and SEO",
          "Upwork profile setup and portfolio",
          "Writing proposals that win clients",
          "Client communication and managing expectations",
          "Delivering work and getting 5-star reviews",
        ],
      },
      {
        number: "17",
        title: "LinkedIn and Professional Presence",
        lessons: 8,
        outcome: "An optimized LinkedIn profile and a published content strategy that builds credibility",
        description: "LinkedIn is where opportunities find you. Your teen builds a professional LinkedIn presence that showcases their skills, attracts potential clients, and positions them as a young expert in their field.",
        projects: ["Complete LinkedIn profile", "5 published LinkedIn posts", "90-day content calendar"],
        tools: ["LinkedIn", "Canva", "ChatGPT for content ideation", "Buffer"],
        lessonBreakdown: [
          "Why LinkedIn matters for teens and young professionals",
          "Profile setup: headline, summary, experience",
          "Showcasing skills and certifications",
          "The anatomy of a LinkedIn post that gets seen",
          "Writing content about your work and learning",
          "Engaging with your network authentically",
          "Building a simple content calendar",
          "Tracking growth and iterating",
        ],
      },
    ],
  },
];

export default function CoursesPage() {
  const [activePathway, setActivePathway] = useState<string>("all");
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);

  const visiblePathways =
    activePathway === "all"
      ? pathways
      : pathways.filter((p) => p.id === activePathway);

  return (
    <div className="bg-[#050D1A] text-white">
      {/* Hero */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-purple-700/8 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/3 w-80 h-80 bg-blue-700/6 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-purple-700/40 bg-purple-900/20 text-purple-300 text-xs font-medium mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            6 Pathways · 17 Courses · 136 Lessons
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white leading-tight mb-4">
            Full Curriculum Catalog
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-6">
            Every course is taught live, 1-on-1, by a verified expert teacher. Every lesson ends with something your child built. Every course ends with a real portfolio project.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/trial"
              className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-black rounded-xl shadow-xl shadow-purple-900/40 transition-all hover:scale-[1.02]"
            >
              Book Free Trial Class
              <span className="block text-xs font-normal opacity-70 mt-0.5">First class free, no card needed</span>
            </Link>
            <Link
              href="/pricing"
              className="px-8 py-4 text-sm font-semibold text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 rounded-xl transition-all"
            >
              View Pricing →
            </Link>
          </div>
        </div>
      </section>

      {/* Filter tabs */}
      <div className="sticky top-16 z-20 bg-[#050D1A]/95 backdrop-blur border-b border-gray-800/60 py-3 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <button
            onClick={() => setActivePathway("all")}
            className={`flex-shrink-0 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activePathway === "all"
                ? "bg-purple-600 text-white"
                : "bg-gray-800/60 text-gray-400 hover:text-white hover:bg-gray-800"
            }`}
          >
            All Pathways
          </button>
          {pathways.map((p) => (
            <button
              key={p.id}
              onClick={() => setActivePathway(p.id)}
              className={`flex-shrink-0 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activePathway === p.id
                  ? `bg-gradient-to-r ${p.color} text-white`
                  : "bg-gray-800/60 text-gray-400 hover:text-white hover:bg-gray-800"
              }`}
            >
              {p.emoji} {p.title.replace(" Path", "")}
            </button>
          ))}
        </div>
      </div>

      {/* Courses */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
        {visiblePathways.map((pathway) => (
          <div key={pathway.id}>
            {/* Pathway header */}
            <div className={`flex flex-col sm:flex-row sm:items-center gap-4 mb-8 pb-6 border-b ${pathway.border}`}>
              <div className="flex items-center gap-4 flex-1">
                <div className="text-5xl">{pathway.emoji}</div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-2xl font-black text-white">{pathway.title}</h2>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${pathway.badge}`}>
                      {pathway.ages}
                    </span>
                    {pathway.featured && (
                      <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-purple-900/40 text-purple-300">
                        Most Popular
                      </span>
                    )}
                  </div>
                  <p className={`font-bold text-sm ${pathway.accent}`}>{pathway.tagline}</p>
                  <p className="text-gray-500 text-xs mt-0.5">{pathway.courses.length} courses · {pathway.courses.reduce((a, c) => a + c.lessons, 0)} lessons total</p>
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Link
                  href="/trial"
                  className={`px-4 py-2 text-sm font-bold text-white rounded-xl bg-gradient-to-r ${pathway.color} hover:opacity-90 transition-all`}
                >
                  Free Trial
                </Link>
                <Link
                  href="/pricing"
                  className="px-4 py-2 text-sm font-semibold text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 rounded-xl transition-all"
                >
                  Buy Now
                </Link>
              </div>
            </div>

            {/* Course cards */}
            <div className="space-y-4">
              {pathway.courses.map((course) => {
                const courseKey = `${pathway.id}-${course.number}`;
                const isOpen = expandedCourse === courseKey;
                return (
                  <div
                    key={course.number}
                    className={`border rounded-2xl overflow-hidden transition-all ${pathway.border} bg-gray-900/40`}
                  >
                    <button
                      className="w-full flex items-start gap-4 p-5 sm:p-6 text-left hover:bg-gray-900/60 transition-colors"
                      onClick={() => setExpandedCourse(isOpen ? null : courseKey)}
                    >
                      <div className={`text-2xl font-black ${pathway.accent} flex-shrink-0 w-10 text-center`}>
                        {course.number}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="text-white font-bold text-base mb-1">{course.title}</h3>
                            <p className="text-gray-400 text-sm leading-relaxed">{course.outcome}</p>
                          </div>
                          <div className="flex flex-col items-end gap-2 flex-shrink-0">
                            <span className="text-xs px-2.5 py-1 rounded-lg bg-gray-800 text-gray-400 whitespace-nowrap">
                              {course.lessons} lessons
                            </span>
                            <span className={`text-xs transition-transform ${isOpen ? "rotate-180" : ""} text-gray-500`}>▾</span>
                          </div>
                        </div>

                        {/* Tools preview (always visible) */}
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {course.tools.map((t) => (
                            <span key={t} className="text-[10px] font-mono px-2 py-0.5 rounded border border-gray-700 text-gray-500">
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    </button>

                    {isOpen && (
                      <div className="px-5 sm:px-6 pb-6 border-t border-gray-800/60">
                        <div className="pt-5 grid grid-cols-1 lg:grid-cols-3 gap-6">
                          {/* Description + Projects */}
                          <div className="lg:col-span-2 space-y-5">
                            <div>
                              <p className="text-sm text-gray-400 leading-relaxed">{course.description}</p>
                            </div>

                            <div>
                              <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Portfolio Projects</p>
                              <ul className="space-y-1.5">
                                {course.projects.map((proj) => (
                                  <li key={proj} className="flex items-center gap-2 text-sm text-gray-300">
                                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 bg-gradient-to-r ${pathway.color}`} style={{background: "currentColor"}} />
                                    <span className={pathway.accent.replace("text-", "text-")}></span>
                                    {proj}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>

                          {/* Lesson breakdown */}
                          <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Lesson Breakdown</p>
                            <ol className="space-y-1.5">
                              {course.lessonBreakdown.map((lesson, i) => (
                                <li key={i} className="flex items-start gap-2 text-xs text-gray-400">
                                  <span className={`font-bold flex-shrink-0 ${pathway.accent}`}>{i + 1}.</span>
                                  <span>{lesson}</span>
                                </li>
                              ))}
                            </ol>
                          </div>
                        </div>

                        {/* CTA */}
                        <div className="flex gap-3 mt-6 pt-4 border-t border-gray-800/60">
                          <Link
                            href="/trial"
                            className={`px-5 py-2.5 text-sm font-bold text-white rounded-xl bg-gradient-to-r ${pathway.color} hover:opacity-90 transition-all`}
                          >
                            Book Free Trial
                          </Link>
                          <Link
                            href="/pricing"
                            className="px-5 py-2.5 text-sm font-semibold text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 rounded-xl transition-all"
                          >
                            Buy Now
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom CTA */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-[#07101F] to-[#050D1A]">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-black text-white mb-4">
            Not Sure Where to Start?
          </h2>
          <p className="text-gray-400 mb-8">
            Book a free trial and we'll recommend the perfect pathway for your child's age, interests, and goals.
          </p>
          <Link
            href="/trial"
            className="inline-block px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-black rounded-xl shadow-xl shadow-purple-900/40 transition-all hover:scale-[1.02]"
          >
            Book Free Trial Class
            <span className="block text-xs font-normal opacity-70 mt-0.5">We'll match your child with the perfect pathway</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
