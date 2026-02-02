"use client";

import React, { useEffect, useState } from "react";
import { CheckIcon } from "@heroicons/react/24/solid";
import { useSwipeGesture } from "@/hooks/useSwipeGesture";

interface SwipeableArticleItemProps {
  children: React.ReactNode;
  onMarkRead: () => void;
  enabled?: boolean;
}

const SWIPE_THRESHOLD = 80;
const ICON_SHOW_THRESHOLD = 40; // Show checkmark at 50% of threshold

export function SwipeableArticleItem({
  children,
  onMarkRead,
  enabled = true,
}: SwipeableArticleItemProps) {
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);

  const {
    isSwiping,
    swipeOffset,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
  } = useSwipeGesture({
    threshold: SWIPE_THRESHOLD,
    onSwipeComplete: () => {
      setIsAnimatingOut(true);
    },
    enabled,
  });

  // Handle animation completion
  useEffect(() => {
    if (isAnimatingOut) {
      const timer = setTimeout(() => {
        onMarkRead();
      }, 200); // Match CSS transition duration
      return () => clearTimeout(timer);
    }
  }, [isAnimatingOut, onMarkRead]);

  const showCheckmark = swipeOffset >= ICON_SHOW_THRESHOLD || isAnimatingOut;
  const checkmarkOpacity = Math.min(1, (swipeOffset - ICON_SHOW_THRESHOLD / 2) / ICON_SHOW_THRESHOLD);

  return (
    <div
      className="relative overflow-hidden"
      style={{
        touchAction: "pan-y", // Allow vertical scroll, capture horizontal
      }}
    >
      {/* Background revealed during swipe */}
      <div
        className="absolute inset-0 bg-green-500 flex items-center pl-4"
        aria-hidden="true"
      >
        {showCheckmark && (
          <CheckIcon
            className="h-6 w-6 text-white transition-opacity duration-150"
            style={{ opacity: isAnimatingOut ? 1 : checkmarkOpacity }}
          />
        )}
      </div>

      {/* Swipeable content */}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onPointerLeave={onPointerCancel}
        className="relative bg-[var(--background)]"
        style={{
          transform: isAnimatingOut
            ? "translateX(100%)"
            : isSwiping
              ? `translateX(${swipeOffset}px)`
              : "translateX(0)",
          transition: isSwiping ? "none" : "transform 200ms ease-out",
        }}
      >
        {children}
      </div>
    </div>
  );
}

export default React.memo(SwipeableArticleItem);
