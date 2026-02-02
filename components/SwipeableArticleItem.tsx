"use client";

import React, { useEffect, useRef, useState } from "react";
import { CheckIcon, ArrowUturnLeftIcon } from "@heroicons/react/24/solid";
import { useSwipeGesture } from "@/hooks/useSwipeGesture";

interface SwipeableArticleItemProps {
  children: React.ReactNode;
  onToggleRead: () => void;
  isRead: boolean;
  enabled?: boolean;
}

const SWIPE_THRESHOLD = 80;
const ICON_SHOW_THRESHOLD = 40; // Show checkmark at 50% of threshold

export function SwipeableArticleItem({
  children,
  onToggleRead,
  isRead,
  enabled = true,
}: SwipeableArticleItemProps) {
  const [isCompleting, setIsCompleting] = useState(false);
  const completeTimerRef = useRef<number | null>(null);

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
      setIsCompleting(true);
    },
    enabled,
  });

  // Handle completion + reset
  useEffect(() => {
    if (!isCompleting) return;
    completeTimerRef.current = window.setTimeout(() => {
      onToggleRead();
      setIsCompleting(false);
    }, 200); // Match CSS transition duration

    return () => {
      if (completeTimerRef.current !== null) {
        window.clearTimeout(completeTimerRef.current);
        completeTimerRef.current = null;
      }
    };
  }, [isCompleting, onToggleRead]);

  const isMarkUnread = isRead;
  const showIcon = swipeOffset >= ICON_SHOW_THRESHOLD || isCompleting;
  const iconOpacity = Math.min(1, (swipeOffset - ICON_SHOW_THRESHOLD / 2) / ICON_SHOW_THRESHOLD);
  const backgroundClass = isMarkUnread ? "bg-amber-500" : "bg-green-500";

  return (
    <div
      className="relative overflow-hidden"
      style={{
        touchAction: "pan-y", // Allow vertical scroll, capture horizontal
      }}
    >
      {/* Background revealed during swipe */}
      <div
        className={`absolute inset-0 ${backgroundClass} flex items-center pl-4`}
        aria-hidden="true"
      >
        {showIcon && (
          isMarkUnread ? (
            <ArrowUturnLeftIcon
              className="h-6 w-6 text-white transition-opacity duration-150"
              style={{ opacity: isCompleting ? 1 : iconOpacity }}
            />
          ) : (
            <CheckIcon
              className="h-6 w-6 text-white transition-opacity duration-150"
              style={{ opacity: isCompleting ? 1 : iconOpacity }}
            />
          )
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
          transform: isSwiping ? `translateX(${swipeOffset}px)` : "translateX(0)",
          transition: isSwiping ? "none" : "transform 200ms ease-out",
        }}
      >
        {children}
      </div>
    </div>
  );
}

export default React.memo(SwipeableArticleItem);
