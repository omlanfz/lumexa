import { canonicalCourseSlug, legacyCourseSlug } from './course-slug';
import {
  findCurriculumInfo,
  getNextRecommendedCurriculum,
} from '../certificates/curriculum-progression';
import { PATHWAY_SLUGS } from './curriculum-source';
import { CATALOG_COURSE_SLUGS } from '../assessments/bank/bank.registry';

describe('course slugs', () => {
  it('drops the retired "-path" suffix and nothing else', () => {
    expect(canonicalCourseSlug('ai-builder-path')).toBe('ai-builder');
    expect(canonicalCourseSlug('ai-builder')).toBe('ai-builder');
    expect(canonicalCourseSlug('lumexa-odyssey')).toBe('lumexa-odyssey');
    expect(canonicalCourseSlug('pathfinder')).toBe('pathfinder');
    expect(legacyCourseSlug('ai-builder')).toBe('ai-builder-path');
    expect(legacyCourseSlug('ai-builder-path')).toBe('ai-builder-path');
  });

  it('knows every default program under its new slug, and the old one', () => {
    for (const slug of Object.keys(PATHWAY_SLUGS)) {
      expect(CATALOG_COURSE_SLUGS).toContain(slug);
      expect(findCurriculumInfo(slug)?.slug).toBe(slug);
      expect(findCurriculumInfo(legacyCourseSlug(slug))?.slug).toBe(slug);
    }
  });

  it('recommends the next program for new and old slugs alike', () => {
    expect(
      getNextRecommendedCurriculum('little-coders', ['little-coders'])?.slug,
    ).toBe('game-creator');
    expect(
      getNextRecommendedCurriculum('little-coders-path', [
        'little-coders-path',
      ])?.slug,
    ).toBe('game-creator');
    expect(
      getNextRecommendedCurriculum('game-creator', [
        'little-coders-path',
        'game-creator',
      ])?.slug,
    ).toBe('web-developer');
  });
});
