// Predefined quick-feedback phrases a teacher can pick when a submission
// needs changes. Keep this in sync with SUBMISSION_FEEDBACK_TAGS in
// client/lib/submissionFeedbackTags.ts — same fixed set, shown as
// selectable chips on the review form.
export const SUBMISSION_FEEDBACK_TAGS = [
  'Please fix the errors and resubmit.',
  'Good attempt, but a few parts need correction.',
  'Please review the lesson material and try again.',
  'Your project is incomplete. Please finish the missing parts.',
  'Please improve the logic/functionality.',
] as const;

export type SubmissionFeedbackTag = (typeof SUBMISSION_FEEDBACK_TAGS)[number];
