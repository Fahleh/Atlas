"use client";

import { ActionErrorMessage } from "@/components/ActionErrorMessage";
import { Avatar } from "@/components/Avatar";
import { Skeleton } from "@/components/Skeleton";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useCurrentUserProfile } from "@/hooks/useCurrentUserProfile";
import type { SupabaseWriteErrorKind } from "@/lib/supabase/errors";
import { useQueryClient } from "@tanstack/react-query";
import { Camera } from "lucide-react";
import Link from "next/link";
import {
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { useFormStatus } from "react-dom";
import { updateProfile, validateAvatarFile } from "./profileActions";
import styles from "./ProfileForm.module.css";

type ProfileFormState = {
  error: string | null;
  errorKind: SupabaseWriteErrorKind | null;
  success: boolean;
};

const SUCCESS_BANNER_DURATION_MS = 2500;

type SaveButtonProps = {
  /** True when neither the name nor the avatar differs from the loaded profile. */
  disabled: boolean;
};

/**
 * Save button deriving its pending state from `useFormStatus`. Must be a
 * descendant of the `<form>` element, since `useFormStatus` cannot be called
 * in the component that renders the form itself.
 *
 * @param disabled - Disables Save while the form is unchanged from the loaded profile
 */
function SaveButton({ disabled }: SaveButtonProps) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className={styles.saveButton}
    >
      {pending ? "Saving…" : "Save"}
    </button>
  );
}

/**
 * Profile settings form: display name edit + avatar upload.
 *
 * A newly-selected avatar file is staged locally (never uploaded until Save
 * is pressed) and previewed via a local object URL, which is revoked whenever
 * a different file is selected or the component unmounts.
 *
 * Save is disabled until the name input or the staged avatar differs from
 * the loaded profile.
 */
export function ProfileForm() {
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();
  const {
    data: profile,
    isError: isProfileError,
    error: profileError,
    refetch: refetchProfile,
  } = useCurrentUserProfile();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrlState] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  // Controlled for Save's dirty-state check. Synced to profile.name during
  // render, not an effect. See docs/frontend.md's reset-during-render pattern.
  const [nameInput, setNameInput] = useState(profile?.name ?? "");
  const [lastSyncedName, setLastSyncedName] = useState(profile?.name ?? null);
  if ((profile?.name ?? null) !== lastSyncedName) {
    setLastSyncedName(profile?.name ?? null);
    setNameInput(profile?.name ?? "");
  }

  // Mirrors previewUrl so the unmount-only cleanup effect below can read the
  // latest object URL without needing previewUrl itself in its dependency array.
  const previewUrlRef = useRef<string | null>(null);

  // Revokes the previous object URL before adopting a new one. Called from
  // event handlers only, never an effect, so there is no setState-in-effect cascade.
  function setPreview(url: string | null) {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = url;
    setPreviewUrlState(url);
  }

  // Revokes whatever object URL is current at unmount time, so a staged-but-
  // never-saved preview never leaks for the tab's remaining lifetime.
  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;

    const validationError = validateAvatarFile(file);
    if (validationError) {
      setFileError(validationError);
      setAvatarFile(null);
      setPreview(null);
      e.target.value = "";
      return;
    }

    setFileError(null);
    setAvatarFile(file);
    setPreview(URL.createObjectURL(file));
  }

  const [showSuccess, setShowSuccess] = useState(false);

  // Mirrors previewUrlRef above: lets the unmount-only cleanup effect clear
  // whatever timeout is currently pending without needing it in a dependency array.
  const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Called from the action's success branch, not a useEffect on state.success.
  // See docs/decisions.md ("Triggering the success-banner side effect...").
  function triggerSuccessBanner() {
    if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
    setShowSuccess(true);
    successTimeoutRef.current = setTimeout(() => {
      setShowSuccess(false);
      successTimeoutRef.current = null;
    }, SUCCESS_BANNER_DURATION_MS);
  }

  // Clears any pending dismiss timeout at unmount.
  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
    };
  }, []);

  const updateProfileAction = useMemo(
    () =>
      async (
        _prevState: ProfileFormState,
        formData: FormData,
      ): Promise<ProfileFormState> => {
        if (!currentUser?.id) {
          return { error: "Not authenticated.", errorKind: null, success: false };
        }

        const nameRaw = formData.get("name") as string | null;
        const name = nameRaw?.trim();
        if (!name)
          return {
            error: "Display name is required.",
            errorKind: null,
            success: false,
          };

        const result = await updateProfile(
          currentUser.id,
          { name, avatarFile: avatarFile ?? undefined },
          queryClient,
        );
        if (result.error)
          return {
            error: result.error,
            errorKind: result.errorKind,
            success: false,
          };

        setAvatarFile(null);
        setPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        triggerSuccessBanner();
        return { error: null, errorKind: null, success: true };
      },
    [currentUser, avatarFile, queryClient],
  );

  const [state, formAction] = useActionState(updateProfileAction, {
    error: null,
    errorKind: null,
    success: false,
  });

  if (isProfileError) {
    return (
      <div className={styles.form}>
        <ActionErrorMessage
          error={profileError?.message ?? "Couldn't load your profile."}
          errorKind={profileError?.errorKind}
          onRetry={() => refetchProfile()}
          className={styles.errorBanner}
        />
      </div>
    );
  }

  if (!profile) {
    return (
      <div
        className={styles.form}
        role="status"
        aria-live="polite"
        aria-label="Loading profile"
      >
        <Skeleton
          width="150px"
          height="150px"
          borderRadius="var(--radius-pill)"
        />
        <Skeleton width="80px" height="0.875rem" />
        <Skeleton width="90%" height="2rem" borderRadius="var(--radius-md)" />
      </div>
    );
  }

  const isDirty = nameInput.trim() !== profile.name || avatarFile !== null;

  return (
    <form action={formAction} className={styles.form}>
      {showSuccess && (
        <div role="alert" className={styles.successBanner}>
          Profile updated.
        </div>
      )}
      {state.error && (
        <ActionErrorMessage
          error={state.error}
          errorKind={state.errorKind}
          className={styles.errorBanner}
        />
      )}
      {fileError && (
        <div role="alert" className={styles.errorBanner}>
          {fileError}
        </div>
      )}

      <div className={styles.avatarField}>
        <div className={styles.avatarWrapper}>
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- local blob: preview, not a remote/optimizable image
            <img
              src={previewUrl}
              alt={profile.name}
              className={styles.avatarPreview}
            />
          ) : (
            <Avatar
              name={profile.name}
              avatarUrl={profile.avatarUrl}
              size="large"
              loading="eager"
            />
          )}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Change photo"
            className={styles.changePhotoButton}
          >
            <Camera size={24} />
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          aria-label="Profile photo"
          className={styles.hiddenFileInput}
        />
        {avatarFile && (
          <p className={styles.stagedFileName}>Staged: {avatarFile.name}</p>
        )}
      </div>

      <div className={styles.field}>
        <label htmlFor="name" className={styles.fieldLabel}>
          Display name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
          className={styles.nameInput}
        />
      </div>

      <p className={styles.changePasswordRow}>
        <Link href="/update-password" className={styles.changePasswordLink}>
          Change password
        </Link>
      </p>

      <div className={styles.actions}>
        <SaveButton disabled={!isDirty} />
      </div>
    </form>
  );
}
