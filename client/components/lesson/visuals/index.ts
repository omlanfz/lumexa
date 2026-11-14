// FILE PATH: client/components/lesson/visuals/index.ts
//
// Importing this module registers every visual renderer (each file calls
// registerVisuals as a side effect). The lesson view imports it once.

import './diagrams';
import './data';
import './code';
import './web';
import './vision';
import './media';
import './technical-structures';
import './technical-diagrams';
import './technical-logic';
import './code-lab';

export { VISUAL_RENDERERS } from './registry';
