import { useRef, useState } from "react";

import { useAuth } from "../auth/AuthContext.jsx";
import { newPasswordError } from "../lib/domain/password.js";
import { ErrorAlert } from "./ui/Alert.jsx";
import { Button } from "./ui/Button.jsx";
import { PasswordField } from "./ui/TextField.jsx";

function validate({ current, next, confirm }) {
  const errors = {};
  if (!current) errors.current = "Enter your current password.";
  const policyError = newPasswordError(next);
  if (policyError) errors.next = policyError;
  else if (next === current) errors.next = "Choose a password different from the current one.";
  // The API takes the new password once; the confirmation only catches typos here.
  if (!errors.next && confirm !== next) errors.confirm = "The passwords don't match.";
  return errors;
}

/**
 * Change the signed-in user's password → POST /api/auth/change-password.
 * Used on the Profile page and on the forced /change-password screen. `onSuccess` runs after
 * AuthContext has the updated user.
 */
export function ChangePasswordForm({ onSuccess, submitLabel = "Change password", size = "md", actions }) {
  const { changePassword } = useAuth();
  const [values, setValues] = useState({ current: "", next: "", confirm: "" });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const refs = { current: useRef(null), next: useRef(null), confirm: useRef(null) };

  const field = (name) => ({
    ref: refs[name],
    value: values[name],
    error: errors[name],
    onChange: (event) => {
      setValues((current) => ({ ...current, [name]: event.target.value }));
      if (errors[name]) setErrors((current) => ({ ...current, [name]: undefined }));
    },
  });

  async function handleSubmit(event) {
    event.preventDefault();
    const found = validate(values);
    setErrors(found);
    setFormError("");
    const firstInvalid = ["current", "next", "confirm"].find((name) => found[name]);
    if (firstInvalid) return refs[firstInvalid].current?.focus();

    setSubmitting(true);
    try {
      const user = await changePassword(values.current, values.next);
      setValues({ current: "", next: "", confirm: "" });
      onSuccess?.(user);
    } catch (error) {
      // 400 wrong current password goes on that field; anything else above the form.
      if (error.status === 400 && /current password is incorrect/i.test(error.message)) {
        setErrors({ current: "That's not your current password." });
        refs.current.current?.focus();
      } else {
        setFormError(error.message || "Couldn't change your password. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  // Matches the login card on short phone screens
  const inputClassName = size === "lg" ? "short:h-12" : undefined;

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-5 motion-safe:animate-pop-in">
      <ErrorAlert>{formError}</ErrorAlert>
      <div className="flex flex-col gap-4">
        <PasswordField label="Current password" autoComplete="current-password" inputClassName={inputClassName} {...field("current")} />
        <PasswordField label="New password" autoComplete="new-password" inputClassName={inputClassName} {...field("next")} />
        <p className="m-0 -mt-2 text-[13px] text-ink-muted">At least 8 characters. A short phrase is easier to remember.</p>
        <PasswordField label="Confirm new password" autoComplete="new-password" inputClassName={inputClassName} {...field("confirm")} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" size={size} loading={submitting} className={size === "lg" ? "w-full short:h-12" : undefined}>
          {submitting ? "Saving" : submitLabel}
        </Button>
        {actions}
      </div>
    </form>
  );
}
