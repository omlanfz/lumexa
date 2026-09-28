// Predefined quick-feedback phrases a teacher can pick when a submission
// needs changes. Keep this in sync with SUBMISSION_FEEDBACK_TAGS in
// server/src/submissions/submission-feedback-tags.ts.
export const SUBMISSION_FEEDBACK_TAGS = [
  'Please fix the errors and resubmit.',
  'Good attempt, but a few parts need correction.',
  'Please review the lesson material and try again.',
  'Your project is incomplete. Please finish the missing parts.',
  'Please improve the logic/functionality.',
] as const;
