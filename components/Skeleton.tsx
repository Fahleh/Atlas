import styles from "./Skeleton.module.css";

type SkeletonProps = {
  width?: string;
  height?: string;
  borderRadius?: string;
};

/**
 * Animated shimmer placeholder for loading states.
 * Renders a single rectangle with configurable dimensions and shape.
 *
 * @param width - CSS width value (default "100%")
 * @param height - CSS height value (default "1rem")
 * @param borderRadius - CSS border-radius value (default "var(--radius-sm)")
 *
 * @returns - A React component that renders a skeleton loader.
 */

export function Skeleton({
  width = "100%",
  height = "1rem",
  borderRadius = "var(--radius-sm)",
}: SkeletonProps) {
  return (
    <div
      className={styles.skeleton}
      aria-busy={true}
      style={
        {
          "--skeleton-width": width,
          "--skeleton-height": height,
          "--skeleton-radius": borderRadius,
        } as React.CSSProperties
      }
    />
  );
}
