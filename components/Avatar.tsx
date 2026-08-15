import Image from "next/image";
import { getInitials, getMemberAvatarPaletteIndex } from "@/lib/utils";
import styles from "./Avatar.module.css";

type AvatarSizeVariant = "default" | "small" | "medium" | "large";

const AVATAR_SIZE_PX: Record<AvatarSizeVariant, number> = {
  default: 34,
  small: 32,
  medium: 36,
  large: 150,
};

const AVATAR_SIZE_CLASS: Record<AvatarSizeVariant, string> = {
  default: styles.avatarDefault,
  small: styles.avatarSmall,
  medium: styles.avatarMedium,
  large: styles.avatarLarge,
};

type AvatarProps = {
  name: string;
  avatarUrl?: string | null;
  size?: AvatarSizeVariant;
};

type AvatarOverflowProps = {
  count: number;
  size?: AvatarSizeVariant;
};

/**
 * Generic avatar for any named entity. Renders a photo via next/image when
 * `avatarUrl` is present, otherwise falls back to an initials circle colored
 * deterministically from the name's initials.
 *
 * @param name - Full name used for initials fallback and alt text
 * @param avatarUrl - Photo URL, or null/absent to use the initials fallback
 * @param size - Named size variant (default "default", 34px, matching the existing member-avatar sizing)
 */
export function Avatar({
  name,
  avatarUrl = null,
  size = "default",
}: AvatarProps) {
  const sizePx = AVATAR_SIZE_PX[size];
  const sizeClass = AVATAR_SIZE_CLASS[size];

  if (avatarUrl) {
    return (
      <span className={`${styles.avatar} ${sizeClass}`}>
        <Image
          src={avatarUrl}
          alt={name}
          width={sizePx}
          height={sizePx}
          className={styles.image}
        />
      </span>
    );
  }

  const initials = getInitials(name);
  const paletteIndex = getMemberAvatarPaletteIndex(initials);
  const paletteClass = styles[`palette${paletteIndex}`];

  return (
    <span className={`${styles.avatar} ${sizeClass}`}>
      <span className={`${styles.initials} ${paletteClass}`}>{initials}</span>
    </span>
  );
}

/**
 * Overflow indicator ("+N") for a capped avatar strip, sized identically
 * to Avatar via the same named size variant — never drifts out of sync
 * with Avatar's actual dimensions since both derive from the same
 * AVATAR_SIZE_PX/AVATAR_SIZE_CLASS maps.
 *
 * @param count - Number of additional, non-visible members
 * @param size - Named size variant (default "default", 34px, matching Avatar's default)
 */
export function AvatarOverflow({
  count,
  size = "default",
}: AvatarOverflowProps) {
  const sizeClass = AVATAR_SIZE_CLASS[size];
  return (
    <span className={`${styles.overflow} ${sizeClass}`}>+{count}</span>
  );
}
