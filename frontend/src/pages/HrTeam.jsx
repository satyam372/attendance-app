import clsx from "clsx";
import { Search, UserX } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useAuth } from "../auth/AuthContext.jsx";

import { AddEmployeeForm } from "../components/hr/AddEmployeeForm.jsx";
import { HrTabs } from "../components/hr/HrTabs.jsx";
import { ErrorAlert } from "../components/ui/Alert.jsx";
import { Avatar } from "../components/ui/Avatar.jsx";
import { Button } from "../components/ui/Button.jsx";
import { Skeleton } from "../components/ui/Skeleton.jsx";
import { useEmployees, useSetEmployeeActive } from "../hooks/useEmployees.js";
import { Role, ROLE_LABELS } from "../lib/domain/enums.js";

const ROLE_CHIP = {
  [Role.HR]: "bg-accent-soft text-accent-ink",
  [Role.MANAGER]: "bg-leave-soft text-leave-ink",
  [Role.EMPLOYEE]: "bg-field text-ink-soft",
};

function PersonRow({ person, isMe, confirming, busy, onAskDeactivate, onConfirm, onCancel, onReactivate }) {
  const cancelRef = useRef(null);

  // Move focus into the confirm step (Cancel is the safe default)
  useEffect(() => {
    if (confirming) cancelRef.current?.focus();
  }, [confirming]);

  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line/70 py-3 last:border-b-0">
      <Avatar name={person.name} className={clsx("size-10 text-[13px]", !person.is_active && "grayscale")} />
      <div className="min-w-0 flex-1">
        <p className={clsx("m-0 truncate text-sm font-semibold", !person.is_active && "text-ink-muted")}>
          {person.name}
          {isMe && <span className="font-normal text-ink-muted"> (you)</span>}
        </p>
        <p className="m-0 truncate text-xs text-ink-muted">{person.email}</p>
      </div>
      {/* Chips sit under the name on phones, on the right from sm up */}
      <div className="order-last flex basis-full gap-1.5 pl-13 sm:order-none sm:basis-auto sm:pl-0">
        {!person.is_active && <span className="shrink-0 rounded-full bg-field px-2.5 py-1 text-xs font-bold text-ink-muted">Inactive</span>}
        <span className={clsx("shrink-0 rounded-full px-2.5 py-1 text-xs font-bold", ROLE_CHIP[person.role])}>{ROLE_LABELS[person.role]}</span>
      </div>
      {!isMe &&
        !confirming &&
        (person.is_active ? (
          <Button variant="ghost" size="icon" aria-label={`Deactivate ${person.name}`} onClick={() => onAskDeactivate(person)} className="-mr-2 shrink-0">
            <UserX className="size-4.5" aria-hidden="true" />
          </Button>
        ) : (
          <Button variant="secondary" loading={busy} onClick={() => onReactivate(person)} aria-label={`Reactivate ${person.name}`} className="shrink-0">
            Reactivate
          </Button>
        ))}
      {confirming && (
        <div role="group" aria-label={`Deactivate ${person.name}?`} className="order-last flex w-full flex-wrap items-center gap-x-3 gap-y-2 rounded-xl bg-field px-3.5 py-2.5">
          <p className="m-0 min-w-0 flex-1 basis-52 text-sm text-ink-soft">
            Deactivate <strong className="text-ink">{person.name}</strong>? They can&rsquo;t sign in until you reactivate them. Their attendance history stays.
          </p>
          <div className="flex gap-2">
            <Button ref={cancelRef} variant="ghost" onClick={onCancel} disabled={busy}>
              Cancel
            </Button>
            <Button variant="danger" loading={busy} onClick={() => onConfirm(person)}>
              {busy ? "Deactivating" : "Deactivate"}
            </Button>
          </div>
        </div>
      )}
    </li>
  );
}

/**
 * HR people list (GET /api/employees), deactivating and reactivating accounts
 * (PATCH /api/employees/{id}, soft delete) and the add-employee form.
 */
export default function HrTeam() {
  const employees = useEmployees();
  const { user } = useAuth();
  const setActive = useSetEmployeeActive();
  const [query, setQuery] = useState("");
  const [confirmingId, setConfirmingId] = useState(null);
  const [notice, setNotice] = useState("");
  const noticeRef = useRef(null);

  function change(person, isActive) {
    setNotice("");
    setActive.mutate(
      { id: person.id, isActive },
      {
        onSuccess: () => {
          setConfirmingId(null);
          setNotice(isActive ? `${person.name} can sign in again.` : `${person.name} is deactivated and can no longer sign in.`);
        },
      },
    );
  }

  // The confirm row closes, so focus moves to the result message instead of being lost
  useEffect(() => {
    if (notice) noticeRef.current?.focus();
  }, [notice]);

  useEffect(() => {
    document.title = "People · SpeedIn";
  }, []);

  const all = employees.data ?? [];
  const q = query.trim().toLowerCase();
  const shown = q ? all.filter((e) => e.name.toLowerCase().includes(q) || e.email.includes(q)) : all;
  const active = all.filter((e) => e.is_active).length;

  return (
    <div className="flex flex-col gap-5 lg:gap-6">
      <HrTabs />
      <header>
        <h1 className="m-0 text-2xl font-extrabold tracking-[-0.02em] lg:text-[28px]">People</h1>
        <p className="m-0 mt-1 text-sm text-ink-muted">
          {employees.data ? `${active} active ${active === 1 ? "account" : "accounts"}` : "Everyone with a SpeedIn account"}
          {all.length > active ? ` · ${all.length - active} inactive` : ""}
        </p>
      </header>

      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[1fr_minmax(320px,380px)] lg:items-start">
        <section aria-labelledby="people-heading" className="flex min-w-0 flex-col gap-3.5 rounded-3xl border border-line bg-surface p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="people-heading" className="m-0 text-base font-bold">
              Everyone
            </h2>
            <label className="relative w-full sm:w-64">
              <span className="sr-only">Search people</span>
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name or email"
                className="h-10 w-full rounded-xl border border-line-strong bg-surface pr-3 pl-9 text-sm text-ink placeholder:text-placeholder focus:border-focus focus:ring-4 focus:ring-focus-ring focus:outline-none"
              />
            </label>
          </div>

          <ErrorAlert>{setActive.error?.message}</ErrorAlert>
          {notice && (
            <p ref={noticeRef} tabIndex={-1} role="status" className="m-0 rounded-xl bg-field px-3.5 py-2.5 text-sm font-semibold text-ink-soft focus:outline-none">
              {notice}
            </p>
          )}
          {employees.isError ? (
            <div className="flex flex-col gap-3">
              <ErrorAlert>{employees.error?.message ?? "Couldn't load people."}</ErrorAlert>
              <Button variant="secondary" className="self-start" onClick={() => employees.refetch()}>
                Try again
              </Button>
            </div>
          ) : employees.isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : shown.length === 0 ? (
            <p className="m-0 py-8 text-center text-sm text-ink-muted">{q ? "Nobody matches that search." : "No accounts yet."}</p>
          ) : (
            <ul className="m-0 list-none p-0">
              {shown.map((person) => (
                <PersonRow
                  key={person.id}
                  person={person}
                  isMe={person.id === user.id}
                  confirming={confirmingId === person.id}
                  busy={setActive.isPending && setActive.variables?.id === person.id}
                  onAskDeactivate={(p) => {
                    setActive.reset();
                    setNotice("");
                    setConfirmingId(p.id);
                  }}
                  onConfirm={(p) => change(p, false)}
                  onCancel={() => setConfirmingId(null)}
                  onReactivate={(p) => change(p, true)}
                />
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="add-employee-heading" className="flex flex-col gap-4 rounded-3xl border border-line bg-surface p-5">
          <h2 id="add-employee-heading" className="m-0 text-base font-bold">
            Add employee
          </h2>
          <AddEmployeeForm />
        </section>
      </div>
    </div>
  );
}
