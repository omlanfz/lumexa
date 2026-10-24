// FILE PATH: server/src/assessments/bank/stage-tests/index.ts
//
// Every authored Odyssey stage test, keyed by stage number (1–3).

import { TestBank } from '../bank.types';
import {
  odysseyStage1Test,
  odysseyStage2Test,
  odysseyStage3Test,
} from './odyssey-stage-tests';

export const stageTestBanks: Record<number, TestBank> = {
  1: odysseyStage1Test,
  2: odysseyStage2Test,
  3: odysseyStage3Test,
};
