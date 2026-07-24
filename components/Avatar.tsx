import Image from "next/image";
import { getInitials, getMemberAvatarColor } from "@/lib/utils";
import styles from "./Avatar.module.css";

type AvatarProps = {
  name: string;
  avatarUrl?: string | null;
  size?: number;
};

type AvatarOverflowProps = {
  count: number;
  size?: number;
};

const DEFAULT_AVATAR_SIZE = 34;

/**
 * Generic avatar for any named entity. Renders a photo via next/image when
 * `avatarUrl` is present, otherwise falls back to an initials circle colored
 * deterministically from the name's initials.
 *
 * @param name - Full name used for initials fallback and alt text
 * @param avatarUrl - Photo URL, or null/absent to use the initials fallback
 * @param size - Diameter in pixels (default 34, matching the existing member-avatar sizing)
 */
export function Avatar({
  name,
  avatarUrl = null,
  size = DEFAULT_AVATAR_SIZE,
}: AvatarProps) {
  const style = { "--avatar-size": `${size}px` } as React.CSSProperties;

  if (avatarUrl) {
    return (
      <span style={style} className={styles.avatar}>
        {/* Requires next.config.ts remotePatterns for the real storage domain — 
        configure when the avatar-upload feature lands, or this throws. */}
        <Image
          src={avatarUrl}
          alt={name}
          width={size}
          height={size}
          className={styles.image}
        />
      </span>
    );
  }

  const initials = getInitials(name);
  const color = getMemberAvatarColor(initials);

  return (
    <span
      style={
        {
          ...style,
          "--avatar-bg": color.bg,
          "--avatar-text": color.text,
        } as React.CSSProperties
      }
      className={styles.avatar}
    >
      <span className={styles.initials}>{initials}</span>
    </span>
  );
}

/**
 * Overflow indicator ("+N") for a capped avatar strip, sized identically
 * to Avatar via the same --avatar-size mechanism — never drifts out of
 * sync with Avatar's actual dimensions since both derive from the same
 * DEFAULT_AVATAR_SIZE constant.
 *
 * @param count - Number of additional, non-visible members
 * @param size - Diameter in pixels (default 34, matching Avatar's default)
 */
export function AvatarOverflow({
  count,
  size = DEFAULT_AVATAR_SIZE,
}: AvatarOverflowProps) {
  const style = { "--avatar-size": `${size}px` } as React.CSSProperties;
  return (
    <span style={style} className={styles.overflow}>
      +{count}
    </span>
  );
}
