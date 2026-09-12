"use client";

import { ActionErrorMessage } from "@/components/ActionErrorMessage";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useOwnedMultiMemberProjects } from "@/hooks/useOwnedMultiMemberProjects";
import { createClient } from "@/lib/supabase/client";
import type { SupabaseWriteErrorKind } from "@/lib/supabase/errors";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { deleteAccount } from "./profileActions";
import styles from "./DeleteAccountSection.module.css";

type DeleteAccountFormState = {
  error: string | null;
  errorKind: SupabaseWriteErrorKind | null;
};

/**
 * The account email, read from the local JWT claims (no network call).
 * See docs/decisions.md ("useCurrentUserEmail as its own hook...") for
 * why this isn't folded into useCurrentUser.
 */
function useCurrentUserEmail() {
  return useQuery({
    queryKey: ["currentUserEmail"],
    queryFn: async (): Promise<string | null> => {
      const supabase = createClient();
      const { data, error } = await supabase.auth.getClaims();
      if (error || !data?.claims) return null;
      return data.claims.email ?? null;
    },
    staleTime: 5 * 60 * 1000,
  });
}

type DeleteSubmitButtonProps = {
  disabled: boolean;
};

// Must be a descendant of the form element, see docs/frontend.md's
// useFormStatus rule; same constraint as ProfileForm's SaveButton.
function DeleteSubmitButton({ disabled }: DeleteSubmitButtonProps) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className={styles.deleteButton}
    >
      {pending ? "Deleting…" : "Delete account"}
    </button>
  );
}

/**
 * Account deletion section on the profile page. Shows the type-to-confirm
 * delete form, or, when the account solely owns a project with other
 * members, hides that form and lists the blocking projects instead.
 *
 * See docs/decisions.md ("The database enforces account-deletion
 * blocking...") for why this is a convenience layer, not the real gate.
 */
export function DeleteAccountSection() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();
  const { data: email } = useCurrentUserEmail();
  const { data: blockingProjects } = useOwnedMultiMemberProjects();

  const [confirmText, setConfirmText] = useState("");

  const deleteAccountAction = useMemo(
    () =>
      async (
        _prevState: DeleteAccountFormState,
        _formData: FormData,
      ): Promise<DeleteAccountFormState> => {
        if (!currentUser?.id) {
          return { error: "Not authenticated.", errorKind: null };
        }

        const result = await deleteAccount(currentUser.id, queryClient);
        if (result.error) {
          return { error: result.error, errorKind: result.errorKind };
        }

        router.push("/login");
        return { error: null, errorKind: null };
      },
    [currentUser, queryClient, router],
  );

  const [state, formAction] = useActionState(deleteAccountAction, {
    error: null,
    errorKind: null,
  });

  const hasBlockingProjects = (blockingProjects?.length ?? 0) > 0;
  const isConfirmed = !!email && confirmText.trim() === email;

  return (
    <section className={styles.section}>
      <h2 className={styles.heading}>Delete account</h2>
      <p className={styles.description}>
        This disables your account. You will be signed out immediately and
        will no longer be able to log in.
      </p>

      {state.error && (
        <ActionErrorMessage
          error={state.error}
          errorKind={state.errorKind}
          className={styles.errorBanner}
        />
      )}

      {blockingProjects === undefined ? null : hasBlockingProjects ? (
        <div role="alert" className={styles.blockedBanner}>
          <p className={styles.blockedText}>
            You solely own {blockingProjects!.length}{" "}
            {blockingProjects!.length === 1 ? "project" : "projects"} with
            other members. Delete{" "}
            {blockingProjects!.length === 1 ? "it" : "them"} or remove every
            other member before deleting your account.
          </p>
          <ul className={styles.blockedProjectList}>
            {blockingProjects!.map((project) => (
              <li key={project.id}>
                <Link
                  href={`/projects?project=${project.id}`}
                  className={styles.blockedProjectLink}
                >
                  {project.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <form action={formAction} className={styles.form}>
          <label htmlFor="confirmEmail" className={styles.confirmLabel}>
            Type your account email ({email ?? "…"}) to confirm
          </label>
          <input
            id="confirmEmail"
            name="confirmEmail"
            type="text"
            autoComplete="off"
            disabled={!email}
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className={styles.confirmInput}
          />
          <div className={styles.actions}>
            <DeleteSubmitButton disabled={!isConfirmed} />
          </div>
        </form>
      )}
    </section>
  );
}
