"use client";

import { createClient } from "@/lib/supabase/client";
import type { QueryClient } from "@tanstack/react-query";

// ---- Types ------------------------------------------------------------------

export type UpdateProfileChanges = {
  name?: string;
  avatarFile?: File;
};

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];

const AVATAR_EXTENSION_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

// ---- Validation ---------------------------------------------------------------

/**
 * Validates an avatar file's type and size before any upload attempt.
 * Shared between `updateProfile` and the profile page's file-selection
 * handler, so the same rejection rules apply the instant a file is staged,
 * not only when Save is eventually pressed.
 *
 * @param file - Candidate avatar file
 * @returns An error message, or null if the file is acceptable
 */
export function validateAvatarFile(file: File): string | null {
  if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
    return "Photo must be a JPEG, PNG, or WEBP image.";
  }
  if (file.size > MAX_AVATAR_BYTES) {
    return "Photo must be 2MB or smaller.";
  }
  return null;
}

// ---- Update -------------------------------------------------------------------

/**
 * Updates the current user's display name and/or avatar photo.
 *
 * Avatar uploads use a fixed filename (`avatars/{userId}/avatar.{ext}`, `upsert: true`)
 * so a new photo overwrites the previous one rather than accumulating storage objects.
 *
 * Invalidates `["currentUserProfile"]` and `["projectMembers"]` on success — a user's
 * own name/avatar is denormalized into `useMembersByProject`'s cache via any project
 * they belong to, so member lists would otherwise show stale data until natural
 * staleTime expiry.
 *
 * @param userId - ID of the profile being updated
 * @param changes - `name` and/or `avatarFile` to apply; both optional
 * @param queryClient - TanStack QueryClient for cache invalidation
 * @returns `{ error: string | null }` — null on success, message string on failure
 */
export async function updateProfile(
  userId: string,
  changes: UpdateProfileChanges,
  queryClient: QueryClient,
): Promise<{ error: string | null }> {
  const { name, avatarFile } = changes;

  if (avatarFile) {
    const validationError = validateAvatarFile(avatarFile);
    if (validationError) return { error: validationError };
  }

  const supabase = createClient();

  let avatarUrl: string | undefined;

  if (avatarFile) {
    const extension = AVATAR_EXTENSION_BY_TYPE[avatarFile.type];
    const path = `${userId}/avatar.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, avatarFile, { upsert: true });

    if (uploadError) return { error: uploadError.message };

    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(path);

    // Cache-bust so <Image> doesn't keep serving a stale cached copy at the
    // same fixed path after re-upload.
    avatarUrl = `${publicUrl}?t=${Date.now()}`;
  }

  const updates: { name?: string; avatar_url?: string } = {};
  if (name !== undefined) updates.name = name;
  if (avatarUrl !== undefined) updates.avatar_url = avatarUrl;

  if (Object.keys(updates).length > 0) {
    const { error: updateError } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", userId);

    if (updateError) return { error: updateError.message };
  }

  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["currentUserProfile"] }),
    queryClient.invalidateQueries({ queryKey: ["projectMembers"] }),
  ]);

  return { error: null };
}
