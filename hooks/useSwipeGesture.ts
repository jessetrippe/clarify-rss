"use client";

import { useCallback, useRef, useState } from "react";

interface SwipeState {
  isSwiping: boolean;
  swipeOffset: number;
}

interface SwipeHandlers {
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
  onPointerCancel: (e: React.PointerEvent) => void;
}

interface UseSwipeGestureOptions {
  threshold?: number; // Distance in px to trigger action (default: 80)
  onSwipeComplete?: () => void;
  enabled?: boolean;
}

interface UseSwipeGestureReturn extends SwipeState, SwipeHandlers {
  resetSwipe: () => void;
}

const DEFAULT_THRESHOLD = 80;
const DIRECTION_LOCK_THRESHOLD = 10; // px before we decide horizontal vs vertical

export function useSwipeGesture({
  threshold = DEFAULT_THRESHOLD,
  onSwipeComplete,
  enabled = true,
}: UseSwipeGestureOptions = {}): UseSwipeGestureReturn {
  const [state, setState] = useState<SwipeState>({
    isSwiping: false,
    swipeOffset: 0,
  });

  // Track gesture state without causing re-renders
  const gestureRef = useRef({
    startX: 0,
    startY: 0,
    isTracking: false,
    directionLocked: false,
    isHorizontal: false,
    pointerId: -1,
  });

  const resetSwipe = useCallback(() => {
    gestureRef.current = {
      startX: 0,
      startY: 0,
      isTracking: false,
      directionLocked: false,
      isHorizontal: false,
      pointerId: -1,
    };
    setState({ isSwiping: false, swipeOffset: 0 });
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!enabled) return;
      // Only track primary pointer (touch or left mouse)
      if (!e.isPrimary) return;

      gestureRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        isTracking: true,
        directionLocked: false,
        isHorizontal: false,
        pointerId: e.pointerId,
      };
    },
    [enabled]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const gesture = gestureRef.current;
      if (!gesture.isTracking || e.pointerId !== gesture.pointerId) return;

      const deltaX = e.clientX - gesture.startX;
      const deltaY = e.clientY - gesture.startY;

      // Determine direction if not yet locked
      if (!gesture.directionLocked) {
        const absX = Math.abs(deltaX);
        const absY = Math.abs(deltaY);

        // Wait until we have enough movement to determine direction
        if (absX < DIRECTION_LOCK_THRESHOLD && absY < DIRECTION_LOCK_THRESHOLD) {
          return;
        }

        gesture.directionLocked = true;
        gesture.isHorizontal = absX > absY;

        // If vertical scroll, stop tracking
        if (!gesture.isHorizontal) {
          gesture.isTracking = false;
          return;
        }

        // Capture pointer for horizontal swipe
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
      }

      // Only handle horizontal swipes
      if (!gesture.isHorizontal) return;

      // Only allow right swipe (positive deltaX)
      const offset = Math.max(0, deltaX);

      setState({
        isSwiping: true,
        swipeOffset: offset,
      });
    },
    []
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      const gesture = gestureRef.current;
      if (e.pointerId !== gesture.pointerId) return;

      const currentOffset = e.clientX - gesture.startX;
      const didComplete = currentOffset >= threshold;

      if (gesture.isHorizontal && didComplete && onSwipeComplete) {
        onSwipeComplete();
      }

      resetSwipe();
    },
    [threshold, onSwipeComplete, resetSwipe]
  );

  const onPointerCancel = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerId !== gestureRef.current.pointerId) return;
      resetSwipe();
    },
    [resetSwipe]
  );

  return {
    ...state,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    resetSwipe,
  };
}
