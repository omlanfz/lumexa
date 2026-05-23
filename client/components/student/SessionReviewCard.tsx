'use client';

import { useState } from 'react';
import api from '@/lib/axios';

interface PendingReview {
  bookingId: string;
  classStart: string;
  teacherName: string;
  teacherAvatarUrl?: string | null;
}

interface SessionReviewCardProps {
  review: PendingReview;
  onSubmitted: () => void;
  isStudentMode?: boolean;
}

export default function SessionReviewCard({ review, onSubmitted, isStudentMode = false }: SessionReviewCardProps) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const initial = review.teacherName ? review.teacherName.charAt(0).toUpperCase() : 'T';
  const classDate = new Date(review.classStart).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const handleSubmit = async () => {
    if (rating < 1) return;
    setSubmitting(true);
    setError('');
    try {
      const endpoint = isStudentMode ? `/bookings/${review.bookingId}/student-review` : `/bookings/${review.bookingId}/review`;
      await api.post(endpoint, {
        rating,
        comment: comment.trim() || undefined,
      });
      onSubmitted();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string | string[] } } };
      const msg = e.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Failed to submit review.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-teal-900/20 border border-teal-800/40 rounded-xl p-6">
      <div className="flex items-center gap-3 mb-4">
        {review.teacherAvatarUrl ? (
          <img
            src={review.teacherAvatarUrl}
            alt={review.teacherName}
            className="w-10 h-10 rounded-full object-cover border border-teal-700/50 flex-shrink-0"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-teal-800/50 flex items-center justify-center text-teal-300 font-bold flex-shrink-0">
            {initial}
          </div>
        )}
        <div>
          <p className="text-xs text-teal-400 font-medium">Rate your session</p>
          <p className="text-white font-semibold text-sm">
            {review.teacherName} · {classDate}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4" role="radiogroup" aria-label="Star rating">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => setRating(star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            aria-label={`${star} star${star !== 1 ? 's' : ''}`}
            className="text-3xl transition-transform hover:scale-110"
          >
            <span className={star <= (hovered || rating) ? 'text-teal-400' : 'text-gray-600'}>
              ★
            </span>
          </button>
        ))}
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Share your thoughts… (optional)"
        rows={2}
        maxLength={500}
        className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2.5 resize-none placeholder:text-gray-500 focus:outline-none focus:border-teal-600 mb-3"
      />

      {error && <p className="text-red-400 text-xs mb-2">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={rating < 1 || submitting}
        className={`w-full py-2.5 rounded-lg font-semibold text-sm transition-colors ${
          rating < 1
            ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
            : 'bg-teal-500 hover:bg-teal-400 text-black'
        }`}
      >
        {submitting ? 'Submitting…' : 'Submit Review'}
      </button>

      {rating < 1 && (
        <p className="text-gray-500 text-xs text-center mt-2">Select a star rating to submit</p>
      )}
    </div>
  );
}
