import React, { useState } from "react";

interface StarRatingInputProps {
  value: number; // 0.00–5.00; increments of 0.25
  onChange: (value: number) => void;
  inputId: string;
  disabled: boolean;
  size?: number;
}

export function StarRatingInput({
  value,
  onChange,
  inputId,
  disabled,
  size = 28,
}: StarRatingInputProps) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);
  const displayValue = hoverValue ?? value;

  return (
    <div className="flex gap-1">
      {Array.from({ length: 5 }, (_, i) => {
        const fillLevel = Math.min(Math.max(displayValue - i, 0), 1);

        return (
          <div
            key={i}
            className="relative"
            style={{ width: size, height: size }}
            onMouseLeave={() => setHoverValue(null)}
          >
            {/* Clickable regions */}
            <div className="absolute inset-0 grid grid-cols-4">
              {[0.25, 0.5, 0.75, 1].map((fraction, idx) => {
                const stepValue = i + fraction;

                return (
                  <div
                    key={idx}
                    className="cursor-pointer"
                    onMouseEnter={() => {
                      if (disabled) return;
                      setHoverValue(stepValue);
                    }}
                    onClick={() => {
                      if (disabled) return;
                      onChange(stepValue);
                    }}
                  />
                );
              })}
            </div>

            {/* Star with unique gradient ID */}
            <svg
              viewBox="0 0 24 24"
              width={size}
              height={size}
              className="text-yellow-400 pointer-events-none"
            >
              <defs>
                <linearGradient id={`star-quarter-${inputId}-${i}`}>
                  <stop
                    offset={`${fillLevel * 100}%`}
                    stopColor="currentColor"
                  />
                  <stop
                    offset={`${fillLevel * 100}%`}
                    stopColor="transparent"
                  />
                </linearGradient>
              </defs>

              <path
                fill={`url(#star-quarter-${inputId}-${i})`}
                stroke="currentColor"
                strokeWidth="1.5"
                d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 
                  9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
              />
            </svg>
          </div>
        );
      })}
    </div>
  );
}
