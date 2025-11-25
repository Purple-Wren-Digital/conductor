// components/RatingStars.tsx
import React from "react";

interface StarRatingProps {
  rating: number; // any decimal from 0.00 to 5.00
  size?: number;
  outOf?: number;
  strokeColor?: string;
  fillColor?: string;
}

export function StarRating({
  rating,
  size = 24,
  outOf = 5,
  strokeColor = "#FACC15",
  fillColor = "#FACC15",
}: StarRatingProps) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: outOf }).map((_, i) => {
        const fillLevel = Math.min(Math.max(rating - i, 0), 1); // Fraction of the star filled (0.00–1.00)
        const gradId = `starGrad-${i}-${rating}`;

        return (
          <svg
            key={`${i}-${rating}`}
            viewBox="0 0 24 24"
            width={size}
            height={size}
          >
            <defs>
              <linearGradient id={gradId}>
                <stop offset={`${fillLevel * 100}%`} stopColor={fillColor} />
                <stop offset={`${fillLevel * 100}%`} stopColor="transparent" />
              </linearGradient>
            </defs>

            <path
              fill={`url(#${gradId})`}
              stroke={strokeColor}
              strokeWidth="1.5"
              d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
            />
          </svg>
        );
      })}
    </div>
  );
}
