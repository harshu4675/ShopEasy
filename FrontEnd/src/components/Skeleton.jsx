import React from "react";

/**
 * Skeleton primitives used for perceived-performance loading states.
 *
 * All variants reserve the exact final dimensions of the content they stand in
 * for, so swapping skeleton -> real content produces zero layout shift.
 * Colours match the existing `bg-gray-200 animate-pulse` placeholders already
 * used on the home grid, so nothing looks new.
 */

export const SkeletonBox = ({
  className = "",
  style,
  rounded = "rounded-xl",
}) => (
  <div
    className={`animate-pulse bg-gray-200 ${rounded} ${className}`}
    style={style}
    aria-hidden="true"
  />
);

export const SkeletonText = ({ width = "100%", className = "" }) => (
  <div
    className={`h-3 animate-pulse rounded bg-gray-200 ${className}`}
    style={{ width }}
    aria-hidden="true"
  />
);

/** Matches the 3:4 product tile used in the mobile home grid. */
export const ProductCardSkeleton = () => (
  <div className="overflow-hidden rounded-xl border border-gray-100 bg-white">
    <SkeletonBox className="aspect-square w-full" rounded="rounded-none" />
    <div className="space-y-2 p-2">
      <SkeletonText width="90%" />
      <SkeletonText width="60%" />
      <SkeletonText width="45%" className="h-4" />
    </div>
  </div>
);

/** Matches a row of horizontally scrolling product tiles. */
export const ProductRowSkeleton = ({ count = 6, width = 140 }) => (
  <div className="scrollbar-none flex gap-2 overflow-x-auto px-3 pb-2">
    {Array.from({ length: count }).map((_, i) => (
      <div
        key={i}
        className="shrink-0 overflow-hidden rounded-xl border border-gray-100 bg-white"
        style={{ width }}
      >
        <SkeletonBox className="aspect-square w-full" rounded="rounded-none" />
        <div className="space-y-1.5 p-2">
          <SkeletonText width="85%" />
          <SkeletonText width="50%" />
        </div>
      </div>
    ))}
  </div>
);

/**
 * Cart line-item skeleton.
 * Mirrors the real MobileCart row (88px image + two text lines + qty control)
 * so the transition to loaded data is invisible.
 */
export const CartItemSkeleton = () => (
  <div className="flex gap-3 border-b border-gray-100 bg-white p-3">
    <SkeletonBox className="h-[88px] w-[72px] shrink-0" rounded="rounded-lg" />
    <div className="flex-1 space-y-2 py-1">
      <SkeletonText width="80%" />
      <SkeletonText width="45%" />
      <SkeletonText width="30%" className="h-4" />
      <div className="flex items-center gap-2 pt-1">
        <SkeletonBox className="h-7 w-20" rounded="rounded-full" />
        <SkeletonBox className="h-7 w-16" rounded="rounded-full" />
      </div>
    </div>
  </div>
);

/**
 * Full mobile cart skeleton: free-shipping bar, item rows and the sticky
 * summary bar, laid out at the same heights as the loaded screen.
 */
export const MobileCartSkeleton = ({ items = 3 }) => (
  <div
    className="bg-gray-50 pb-[180px]"
    role="status"
    aria-live="polite"
    aria-busy="true"
  >
    <span className="sr-only">Loading your cart…</span>

    <div className="bg-white px-4 py-3">
      <SkeletonText width="70%" className="mb-2 h-3.5" />
      <SkeletonBox className="h-1.5 w-full" rounded="rounded-full" />
    </div>

    <div className="mt-2">
      {Array.from({ length: items }).map((_, i) => (
        <CartItemSkeleton key={i} />
      ))}
    </div>

    <div className="mt-2 space-y-3 bg-white p-4">
      <SkeletonBox className="h-11 w-full" rounded="rounded-xl" />
      <SkeletonText width="55%" />
      <SkeletonText width="40%" />
      <SkeletonText width="35%" className="h-4" />
    </div>

    <div className="fixed inset-x-0 bottom-16 border-t border-gray-100 bg-white p-3">
      <SkeletonBox className="h-12 w-full" rounded="rounded-xl" />
    </div>
  </div>
);

export default SkeletonBox;
