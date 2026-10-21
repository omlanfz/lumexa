import type { DemoSpec } from "./types";
import { ARCADE_CODE, ArcadeOutput, RPG_CODE, RpgOutput, SHOOTER_CODE, ShooterOutput } from "./demos/games";
import { CHEF_CODE, ChefOutput, MOOD_CODE, MoodOutput, PLANNER_CODE, PlannerOutput } from "./demos/ai";
import { EVENTS_CODE, EventsOutput, PHOTO_CODE, PhotoOutput, STORE_CODE, StoreOutput } from "./demos/web";
import { CLIMATE_CODE, ClimateOutput, MARKET_CODE, MarketOutput, SPORTS_CODE, SportsOutput } from "./demos/data";
import { MATHS_CODE, MathsOutput, ROBOT_CODE, RobotOutput, SAFARI_CODE, SafariOutput } from "./demos/young";
import { BRAND_CODE, BrandOutput, CONTENT_CODE, ContentOutput, TUTOR_CODE, TutorOutput } from "./demos/career";

/** One interactive "Try it" demo per showcase project, keyed by StudentProject.id. */
export const DEMOS: Record<string, DemoSpec> = {
  "galactic-shooter": { file: "shooter.lua", lang: "lua", code: SHOOTER_CODE, hint: "Drag, tap the arrows or use ← → to move. Your ship fires on its own.", Output: ShooterOutput },
  "python-arcade": { file: "arcade.py", lang: "py", code: ARCADE_CODE, hint: "Tap the game or press Space to jump over enemies and grab coins.", Output: ArcadeOutput },
  "rpg-quest-world": { file: "QuestManager.cs", lang: "cs", code: RPG_CODE, hint: "Walk into the Elder, find 3 gems, then open the chest.", Output: RpgOutput },
  "mood-detector": { file: "emotion_ai.py", lang: "py", code: MOOD_CODE, hint: "Pick a face and watch the AI guess the emotion.", Output: MoodOutput },
  "recipe-chatbot": { file: "chef_bot.py", lang: "py", code: CHEF_CODE, hint: "Choose ingredients, then ask Chef Bot what to cook.", Output: ChefOutput },
  "study-planner": { file: "planner.py", lang: "py", code: PLANNER_CODE, hint: "Pick weak topics and hours, then tick off sessions as you finish them.", Output: PlannerOutput },
  "photography-portfolio": { file: "gallery.js", lang: "js", code: PHOTO_CODE, hint: "Filter the gallery, open a photo and give it a heart.", Output: PhotoOutput },
  "ecommerce-store": { file: "Store.jsx", lang: "js", code: STORE_CODE, hint: "Add items to the cart, change quantities and check out.", Output: StoreOutput },
  "school-events-app": { file: "events.jsx", lang: "js", code: EVENTS_CODE, hint: "Register for events and watch the counts update.", Output: EventsOutput },
  "climate-dashboard": { file: "dashboard.py", lang: "py", code: CLIMATE_CODE, hint: "Drag the year slider, toggle regions or touch the chart.", Output: ClimateOutput },
  "sports-stats": { file: "compare.py", lang: "py", code: SPORTS_CODE, hint: "Pick two players and the metrics you care about.", Output: SportsOutput },
  "market-trends": { file: "predict.py", lang: "py", code: MARKET_CODE, hint: "Change how many days to predict, or switch to another stock.", Output: MarketOutput },
  "safari-adventure": { file: "Lion sprite", lang: "blocks", code: SAFARI_CODE, hint: "Tap the bushes and rocks to find all 5 hidden animals.", Output: SafariOutput },
  "space-maths-quiz": { file: "Asteroid sprite", lang: "blocks", code: MATHS_CODE, hint: "Answer the sum to blast the asteroid before it lands.", Output: MathsOutput },
  "drawing-robot": { file: "robot.py", lang: "py", code: ROBOT_CODE, hint: "Drive the robot with the buttons, or pick a shape to draw.", Output: RobotOutput },
  "freelance-brand-kit": { file: "brand.css", lang: "css", code: BRAND_CODE, hint: "Type a business name and pick colours, a font and a logo.", Output: BrandOutput },
  "content-portfolio": { file: "calendar.js", lang: "js", code: CONTENT_CODE, hint: "Tap days to plan reels, posts, stories and tips.", Output: ContentOutput },
  "tutoring-service": { file: "bookings.py", lang: "py", code: TUTOR_CODE, hint: "Choose a package, pick open time slots and confirm.", Output: TutorOutput },
};
