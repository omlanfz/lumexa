// FILE PATH: server/src/assessments/bank/course-tests/index.ts
//
// Every authored Course Test bank, keyed by the slug of the module it closes
// (CourseModule.slug) — one bank per module, shared by every pathway that
// reuses the module. `moduleExtras` holds each module's share of the Final
// Tests and Odyssey stage tests that span it (see composeBank).

import { ModuleExtras } from '../bank.helpers';
import { TestBank } from '../bank.types';
import {
  advancedGameDesign,
  advancedGameDesignExtras,
} from './advanced-game-design';
import { aiForKids, aiForKidsExtras } from './ai-for-kids';
import {
  buildYourProfessionalIdentity,
  buildYourProfessionalIdentityExtras,
} from './build-your-professional-identity';
import { computerVision, computerVisionExtras } from './computer-vision';
import {
  dataVisualisation,
  dataVisualisationExtras,
} from './data-visualisation';
import { htmlCssMastery, htmlCssMasteryExtras } from './html-css-mastery';
import {
  javascriptInteractivity,
  javascriptInteractivityExtras,
} from './javascript-interactivity';
import { languageModels, languageModelsExtras } from './language-models';
import {
  machineLearningProjects,
  machineLearningProjectsExtras,
} from './machine-learning-projects';
import {
  professionalPresence,
  professionalPresenceExtras,
} from './professional-presence';
import {
  pythonAiFoundations,
  pythonAiFoundationsExtras,
} from './python-ai-foundations';
import {
  pythonArcadeGames,
  pythonArcadeGamesExtras,
} from './python-arcade-games';
import {
  reactFullstackWeb,
  reactFullstackWebExtras,
} from './react-fullstack-web';
import {
  robloxWorldBuilder,
  robloxWorldBuilderExtras,
} from './roblox-world-builder';
import {
  scratchAdventures,
  scratchAdventuresExtras,
} from './scratch-adventures';
import { skillsThatPay, skillsThatPayExtras } from './skills-that-pay';
import { pythonForData, pythonForDataExtras } from './python-for-data';
import {
  pythonForYoungBuilders,
  pythonForYoungBuildersExtras,
} from './python-for-young-builders';

export const courseTestBanks: Record<string, TestBank> = {
  'python-ai-foundations': pythonAiFoundations,
  'computer-vision': computerVision,
  'language-models': languageModels,
  'python-for-data': pythonForData,
  'data-visualisation': dataVisualisation,
  'machine-learning-projects': machineLearningProjects,
  'roblox-world-builder': robloxWorldBuilder,
  'python-arcade-games': pythonArcadeGames,
  'advanced-game-design': advancedGameDesign,
  'scratch-adventures': scratchAdventures,
  'python-for-young-builders': pythonForYoungBuilders,
  'ai-for-kids': aiForKids,
  'html-css-mastery': htmlCssMastery,
  'javascript-interactivity': javascriptInteractivity,
  'react-fullstack-web': reactFullstackWeb,
  'build-your-professional-identity': buildYourProfessionalIdentity,
  'skills-that-pay': skillsThatPay,
  'professional-presence': professionalPresence,
};

export const moduleExtras: Record<string, ModuleExtras> = {
  'python-ai-foundations': pythonAiFoundationsExtras,
  'computer-vision': computerVisionExtras,
  'language-models': languageModelsExtras,
  'python-for-data': pythonForDataExtras,
  'data-visualisation': dataVisualisationExtras,
  'machine-learning-projects': machineLearningProjectsExtras,
  'roblox-world-builder': robloxWorldBuilderExtras,
  'python-arcade-games': pythonArcadeGamesExtras,
  'advanced-game-design': advancedGameDesignExtras,
  'scratch-adventures': scratchAdventuresExtras,
  'python-for-young-builders': pythonForYoungBuildersExtras,
  'ai-for-kids': aiForKidsExtras,
  'html-css-mastery': htmlCssMasteryExtras,
  'javascript-interactivity': javascriptInteractivityExtras,
  'react-fullstack-web': reactFullstackWebExtras,
  'build-your-professional-identity': buildYourProfessionalIdentityExtras,
  'skills-that-pay': skillsThatPayExtras,
  'professional-presence': professionalPresenceExtras,
};
