'use client';

import React from 'react';

interface RatingStarsProps {
  score: number; // 0-5, decimals supported
  size?: 'sm' | 'md';
  showNumber?: boolean;
}

export function RatingStars({ score, size = 'md', showNumber = true }: RatingStarsProps) {
  const starSize = size === 'sm' ? 'text-xs' : 'text-sm';
  const numSize = size === 'sm' ? 'text-xs' : 'text-sm';

  return (
    <span className={`inline-flex items-center gap-0.5 ${starSize}`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={i <= Math.round(score) ? 'text-yellow-400' : 'text-gray-300'}
        >
          ★
        </span>
      ))}
      {showNumber && score > 0 && (
        <span className={`ml-1 text-gray-500 font-medium ${numSize}`}>
          {score.toFixed(1)}
        </span>
      )}
    </span>
  );
}
