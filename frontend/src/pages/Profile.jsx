import clsx from "clsx";
import { Camera, CircleCheck, KeyRound, LogOut, Monitor, Moon, Sun, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { useAuth } from "../auth/AuthContext.jsx";
import { ChangePasswordForm } from "../components/ChangePasswordForm.jsx";
import { PhotoEditor } from "../components/profile/PhotoEditor.jsx";
import { ErrorAlert } from "../components/ui/Alert.jsx";
import { Avatar } from "../components/ui/Avatar.jsx";
import { Button } from "../components/ui/Button.jsx";
import { Card } from "../components/ui/Card.jsx";
import { useRemovePhoto } from "../hooks/useProfile.js";
import { ROLE_LABELS } from "../lib/domain/enums.js";
import { photoFileError } from "../lib/domain/photo.js";
import { photoUrl } from "../lib/services/profile.js";
import { useTheme } from "../theme/ThemeContext.jsx";

const THEMES = [
  { value: "system", label: "System", icon: Monitor },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
];

export default function Profile() {
  const { user, logout } = useAuth();
  const { preference, setPreference } = useTheme();
  const [signingOut, setSigningOut] = useState(false);
  // "closed" → "open" (form showing) → "changed" (confirmation until opened again)
  const [passwordPanel, setPasswordPanel] = useState("closed");
  const removePhoto = useRemovePhoto();
  const [photoFile, setPhotoFile] = useState(null); // chosen file being positioned
  const [photoError, setPhotoError] = useState("");
  const [photoNotice, setPhotoNotice] = useState("");
  const src = photoUrl(user);

  function choosePhoto(event) {
    const file = event.target.files?.[0];
    event.target.value = ""; // so choosing the same file again still triggers a change
    setPhotoNotice("");
    removePhoto.reset();
    const error = photoFileError(file);
    setPhotoError(file ? (error ?? "") : "");
    if (file && !error) setPhotoFile(file);
  }

  useEffect(() => {
    document.title = "Profile · SpeedIn";
  }, []);

  return (
    <div className="flex flex-col gap-5">
      <h1 className="m-0 text-[28px] font-extrabold tracking-[-0.02em]">Profile</h1>

      <Card aria-label="You" className="flex flex-col gap-5">
        <div className="flex items-center gap-4">
          <Avatar name={user.name} src={src} className="size-20 text-2xl" />
          <div className="min-w-0">
            <p className="m-0 text-lg font-bold">{user.name}</p>
            <p className="m-0 truncate text-sm text-ink-muted">{user.email}</p>
            <p className="m-0 mt-1 text-xs font-semibold text-accent-ink">{ROLE_LABELS[user.role]}</p>
          </div>
        </div>

        {photoFile ? (
          <PhotoEditor
            file={photoFile}
            onCancel={() => setPhotoFile(null)}
            onSaved={() => {
              setPhotoFile(null);
              setPhotoNotice("Photo updated. Everyone in SpeedIn now sees it.");
            }}
          />
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              {/* The file input is the control; the label is styled as a button. On phones it offers the camera too. */}
              <label className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-line-strong bg-surface px-4 text-sm font-semibold text-ink transition hover:border-focus has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus">
                <input type="file" accept="image/*" onChange={choosePhoto} className="sr-only" />
                <Camera className="size-4" aria-hidden="true" />
                {src ? "Change photo" : "Upload photo"}
              </label>
              {src && (
                <Button
                  variant="ghost"
                  loading={removePhoto.isPending}
                  onClick={() => {
                    setPhotoNotice("");
                    removePhoto.mutate(undefined, { onSuccess: () => setPhotoNotice("Photo removed. Your initials show instead.") });
                  }}
                >
                  {!removePhoto.isPending && <Trash2 className="size-4" aria-hidden="true" />}
                  Remove photo
                </Button>
              )}
            </div>
            <ErrorAlert>{photoError || removePhoto.error?.message}</ErrorAlert>
            {photoNotice && (
              <p role="status" className="m-0 flex items-center gap-2 text-sm font-semibold text-success">
                <CircleCheck className="size-4" aria-hidden="true" />
                {photoNotice}
              </p>
            )}
          </div>
        )}
      </Card>

      <Card>
        <fieldset className="m-0 border-0 p-0">
          <legend className="mb-3 p-0 text-base font-bold">Appearance</legend>
          <div className="grid grid-cols-3 gap-1 rounded-2xl bg-field p-1">
            {THEMES.map(({ value, label, icon: Icon }) => (
              <label
                key={value}
                className={clsx(
                  "flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl text-sm font-semibold transition has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-focus",
                  preference === value ? "bg-surface text-accent-ink shadow-sm" : "text-ink-muted hover:text-ink",
                )}
              >
                <input
                  type="radio"
                  name="theme"
                  value={value}
                  checked={preference === value}
                  onChange={() => setPreference(value)}
                  className="sr-only"
                />
                <Icon className="size-4" aria-hidden="true" />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
      </Card>

      <Card aria-labelledby="password-heading" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="password-heading" className="m-0 text-base font-bold">
              Password
            </h2>
            <p className="m-0 mt-1 text-sm text-ink-muted">The password you sign in with.</p>
          </div>
          {passwordPanel !== "open" && (
            <Button variant="secondary" onClick={() => setPasswordPanel("open")}>
              <KeyRound className="size-4" aria-hidden="true" />
              Change password
            </Button>
          )}
        </div>
        {passwordPanel === "changed" && (
          <p role="status" className="m-0 flex items-center gap-2 text-sm font-semibold text-success">
            <CircleCheck className="size-4" aria-hidden="true" />
            Password changed. Use the new one next time you sign in.
          </p>
        )}
        {passwordPanel === "open" && (
          <ChangePasswordForm
            onSuccess={() => setPasswordPanel("changed")}
            actions={
              <Button variant="ghost" onClick={() => setPasswordPanel("closed")}>
                Cancel
              </Button>
            }
          />
        )}
      </Card>

      <Button
        variant="danger"
        size="lg"
        loading={signingOut}
        onClick={async () => {
          setSigningOut(true);
          await logout();
        }}
        className="w-full sm:w-auto sm:self-start"
      >
        {!signingOut && <LogOut className="size-5" aria-hidden="true" />}
        Sign out
      </Button>
    </div>
  );
}
