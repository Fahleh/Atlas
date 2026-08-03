"use client";

import { Avatar } from "@/components/Avatar";
import { Skeleton } from "@/components/Skeleton";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useCurrentUserProfile } from "@/hooks/useCurrentUserProfile";
import { useQueryClient } from "@tanstack/react-query";
import { Camera } from "lucide-react";
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

type ProfileFormState = { error: string | null; success: boolean };

const SUCCESS_BANNER_DURATION_MS = 2500;

/**
 * Save button deriving its pending state from `useFormStatus`. Must be a
 * descendant of the `<form>` element, since `useFormStatus` cannot be called
 * in the component that renders the form itself.
 */
function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={styles.saveButton}>
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
 */
export function ProfileForm() {
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();
  const { data: profile } = useCurrentUserProfile();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrlState] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  // Mirrors previewUrl so the unmount-only cleanup effect below can read the
  // latest object URL without needing previewUrl itself in its dependency array.
  const previewUrlRef = useRef<string | null>(null);

  // Revokes the previous object URL (if any) before adopting a new one — called
  // from event handlers only (file selection, post-save reset), never from an
  // effect, so there is no setState-in-effect render cascade.
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

  // Mirrors previewUrlRef above — lets the unmount-only cleanup effect clear
  // whatever timeout is currently pending without needing it in a dependency array.
  const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Shows the success banner and (re)starts its dismiss timer. Called directly
  // from the action's success branch below — not from a useEffect keyed on
  // state.success — because the action returns a new object literal on every
  // dispatch, so this runs on every successful save, including back-to-back
  // successes where the `success` boolean value itself never changes (an
  // effect keyed on that boolean would see true -> true as "no change" and
  // fail to reset the timer on the second save). Clearing any existing timeout
  // first also means a second save arriving mid-countdown restarts the full
  // duration rather than being cut short by the first timer.
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
          return { error: "Not authenticated.", success: false };
        }

        const nameRaw = formData.get("name") as string | null;
        const name = nameRaw?.trim();
        if (!name)
          return { error: "Display name is required.", success: false };

        const result = await updateProfile(
          currentUser.id,
          { name, avatarFile: avatarFile ?? undefined },
          queryClient,
        );
        if (result.error) return { error: result.error, success: false };

        setAvatarFile(null);
        setPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        triggerSuccessBanner();
        return { error: null, success: true };
      },
    [currentUser, avatarFile, queryClient],
  );

  const [state, formAction] = useActionState(updateProfileAction, {
    error: null,
    success: false,
  });

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

  return (
    <form action={formAction} className={styles.form}>
      {showSuccess && (
        <div role="alert" className={styles.successBanner}>
          Profile updated.
        </div>
      )}
      {state.error && (
        <div role="alert" className={styles.errorBanner}>
          {state.error}
        </div>
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
              size={150}
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
          defaultValue={profile.name}
          className={styles.nameInput}
        />
      </div>

      <div className={styles.actions}>
        <SaveButton />
      </div>
    </form>
  );
}
