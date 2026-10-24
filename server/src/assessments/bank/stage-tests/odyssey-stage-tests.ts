// FILE PATH: server/src/assessments/bank/stage-tests/odyssey-stage-tests.ts
//
// Lumexa Odyssey stage tests: one 30 MCQ + 10 True/False objective test after
// each stage, with 10 MCQ and 3–4 True/False from each of the stage's three
// modules (the same module order as ODYSSEY_STAGES in curriculum-catalog.seed.ts).
// The questions are not copies of the module Course Tests — the cross-bank
// check in bank.validate.ts keeps every question unique across the catalog.

import { composeBank } from '../bank.helpers';
import { buildYourProfessionalIdentityExtras } from '../course-tests/build-your-professional-identity';
import { htmlCssMasteryExtras } from '../course-tests/html-css-mastery';
import { javascriptInteractivityExtras } from '../course-tests/javascript-interactivity';
import { pythonAiFoundationsExtras } from '../course-tests/python-ai-foundations';
import { pythonArcadeGamesExtras } from '../course-tests/python-arcade-games';
import { pythonForDataExtras } from '../course-tests/python-for-data';
import { pythonForYoungBuildersExtras } from '../course-tests/python-for-young-builders';
import { robloxWorldBuilderExtras } from '../course-tests/roblox-world-builder';
import { scratchAdventuresExtras } from '../course-tests/scratch-adventures';
import { ModuleExtras } from '../bank.helpers';

/** A stage slice is required for every Odyssey module; fail loudly otherwise. */
function stageSlice(name: string, extras: ModuleExtras) {
  if (!extras.stage)
    throw new Error(
      `${name} is an Odyssey module and must define a stage slice`,
    );
  return extras.stage;
}

// Stage 1 — Foundation: Scratch Adventures, Python for Young Builders, Python Arcade Games.
export const odysseyStage1Test = composeBank({
  id: 'stage-test/odyssey-stage-1',
  title: 'Lumexa Odyssey — Stage 1 Test',
  type: 'STAGE_TEST',
  slices: [
    stageSlice('scratch-adventures', scratchAdventuresExtras),
    stageSlice('python-for-young-builders', pythonForYoungBuildersExtras),
    stageSlice('python-arcade-games', pythonArcadeGamesExtras),
  ],
});

// Stage 2 — Create & Apply: HTML and CSS Mastery, Build Your Professional Identity,
// JavaScript and Interactivity.
export const odysseyStage2Test = composeBank({
  id: 'stage-test/odyssey-stage-2',
  title: 'Lumexa Odyssey — Stage 2 Test',
  type: 'STAGE_TEST',
  slices: [
    stageSlice('html-css-mastery', htmlCssMasteryExtras),
    stageSlice(
      'build-your-professional-identity',
      buildYourProfessionalIdentityExtras,
    ),
    stageSlice('javascript-interactivity', javascriptInteractivityExtras),
  ],
});

// Stage 3 — Explore & Advance: Python for Data, Python and AI Foundations,
// Roblox World Builder.
export const odysseyStage3Test = composeBank({
  id: 'stage-test/odyssey-stage-3',
  title: 'Lumexa Odyssey — Stage 3 Test',
  type: 'STAGE_TEST',
  slices: [
    stageSlice('python-for-data', pythonForDataExtras),
    stageSlice('python-ai-foundations', pythonAiFoundationsExtras),
    stageSlice('roblox-world-builder', robloxWorldBuilderExtras),
  ],
});
