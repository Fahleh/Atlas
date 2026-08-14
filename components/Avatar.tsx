import Image from "next/image";
import { getInitials, getMemberAvatarPaletteIndex } from "@/lib/utils";
import styles from "./Avatar.module.css";

// TEMPORARY, throwaway live-verification test, not part of the approved diff.
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

export function AvatarOverflow({
  count,
  size = "default",
}: AvatarOverflowProps) {
  const sizeClass = AVATAR_SIZE_CLASS[size];
  return (
    <span className={`${styles.overflow} ${sizeClass}`}>+{count}</span>
  );
}
