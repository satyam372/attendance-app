import clsx from "clsx";
import { Search, UserCog, UserX } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useAuth } from "../auth/AuthContext.jsx";
import { AddEmployeeForm } from "../components/hr/AddEmployeeForm.jsx";
import { HrTabs } from "../components/hr/HrTabs.jsx";
import { ErrorAlert } from "../components/ui/Alert.jsx";
import { Avatar } from "../components/ui/Avatar.jsx";
import { Button } from "../components/ui/Button.jsx";
import { SelectField } from "../components/ui/Fields.jsx";
import { Skeleton } from "../components/ui/Skeleton.jsx";
import { useEmployees, useUpdateEmployee } from "../hooks/useEmployees.js";
import { Role, ROLE_LABELS } from "../lib/domain/enums.js";

const ROLE_CHIP = {
  [Role.HR]: "bg-accent-soft text-accent-ink",
  [Role.MANAGER]: "bg-leave-soft text-leave-ink",
  [Role.EMPLOYEE]: "bg-field text-ink-soft",
};

/** Who approves this person's requests, as a short line under their email. */
function approvalLine(person, managerName) {
  if (person.role !== Role.EMPLOYEE) return "Requests approved by HR";
  return managerName ? `Reports to ${managerName}` : null;
}

function PersonRow({ person, isMe, managerName, managers, panel, busy, onOpen, onClose, onDeactivate, onReactivate, onSaveManager }) {
  const cancelRef = useRef(null);
  const [managerId, setManagerId] = useState(person.reports_to_id ?? "");
  const line = approvalLine(person, managerName);
  const choices = managers.filter((m) => m.id !== person.id);

  // Move focus into an opened panel (Cancel is the safe default)
  useEffect(() => {
    if (panel) cancelRef.current?.focus();
    if (panel === "manager") setManagerId(person.reports_to_id ?? "");
  }, [panel, person.reports_to_id]);

  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line/70 py-3 last:border-b-0">
      <Avatar name={person.name} className={clsx("size-10 text-[13px]", !person.is_active && "grayscale")} />
      <div className="min-w-0 flex-1">
        <p className={clsx("m-0 truncate text-sm font-semibold", !person.is_active && "text-ink-muted")}>
          {person.name}
          {isMe && <span className="font-normal text-ink-muted"> (you)</span>}
        </p>
        <p className="m-0 truncate text-xs text-ink-muted">{person.email}</p>
        {line ? (
          <p className="m-0 truncate text-xs text-ink-muted">{line}</p>
        ) : (
          <p className="m-0 text-xs font-semibold text-late">No manager yet: HR approves their requests</p>
        )}
      </div>
      {/* Chips sit under the name on phones, on the right from sm up */}
      <div className="order-last flex basis-full gap-1.5 pl-13 sm:order-none sm:basis-auto sm:pl-0">
        {!person.is_active && <span className="shrink-0 rounded-full bg-field px-2.5 py-1 text-xs font-bold text-ink-muted">Inactive</span>}
        <span className={clsx("shrink-0 rounded-full px-2.5 py-1 text-xs font-bold", ROLE_CHIP[person.role])}>{ROLE_LABELS[person.role]}</span>
      </div>
      {!isMe && !panel && (
        <div className="-mr-2 flex shrink-0">
          {person.is_active && person.role === Role.EMPLOYEE && (
            <Button variant="ghost" size="icon" aria-label={`Change ${person.name}'s manager`} onClick={() => onOpen(person, "manager")}>
              <UserCog className="size-4.5" aria-hidden="true" />
            </Button>
          )}
          {person.is_active ? (
            <Button variant="ghost" size="icon" aria-label={`Deactivate ${person.name}`} onClick={() => onOpen(person, "deactivate")}>
              <UserX className="size-4.5" aria-hidden="true" />
            </Button>
          ) : (
            <Button variant="secondary" loading={busy} onClick={() => onReactivate(person)} aria-label={`Reactivate ${person.name}`} className="mr-2">
              Reactivate
            </Button>
          )}
        </div>
      )}
      {panel === "deactivate" && (
        <div role="group" aria-label={`Deactivate ${person.name}?`} className="order-last flex w-full flex-wrap items-center gap-x-3 gap-y-2 rounded-xl surface-inset px-3.5 py-2.5">
          <p className="m-0 min-w-0 flex-1 basis-52 text-sm text-ink-soft">
            Deactivate <strong className="text-ink">{person.name}</strong>? They can&rsquo;t sign in until you reactivate them. Their attendance history stays.
          </p>
          <div className="flex gap-2">
            <Button ref={cancelRef} variant="ghost" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button variant="danger" loading={busy} onClick={() => onDeactivate(person)}>
              {busy ? "Deactivating" : "Deactivate"}
            </Button>
          </div>
        </div>
      )}
      {panel === "manager" && (
        <form
          aria-label={`Change ${person.name}'s manager`}
          onSubmit={(e) => {
            e.preventDefault();
            onSaveManager(person, managerId);
          }}
          className="order-last flex w-full flex-wrap items-end gap-x-3 gap-y-2 rounded-xl surface-inset px-3.5 py-3"
        >
          <SelectField label="Reports to" value={managerId} onChange={(e) => setManagerId(e.target.value)} className="min-w-0 flex-1 basis-52">
            {!managerId && <option value="">Choose a manager</option>}
            {choices.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </SelectField>
          <div className="flex gap-2">
            <Button ref={cancelRef} variant="ghost" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" loading={busy} disabled={!managerId || managerId === person.reports_to_id}>
              Save
            </Button>
          </div>
          <p className="m-0 basis-full text-xs text-ink-muted">Their pending requests move to the new manager.</p>
        </form>
      )}
    </li>
  );
}

/**
 * HR people list (GET /api/employees): who reports to whom, changing a manager and
 * deactivating/reactivating accounts (PATCH /api/employees/{id}), plus the add-employee form.
 * Managers approve their reports' leave and WFH requests; HR approves managers' and HR's.
 */
export default function HrTeam() {
  const employees = useEmployees();
  const { user } = useAuth();
  const update = useUpdateEmployee();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(null); // { id, panel: "deactivate" | "manager" }
  const [notice, setNotice] = useState("");
  const noticeRef = useRef(null);

  function save(person, changes, message) {
    setNotice("");
    update.mutate(
      { id: person.id, changes },
      {
        onSuccess: () => {
          setOpen(null);
          setNotice(message);
        },
      },
    );
  }

  // The panel closes, so focus moves to the result message instead of being lost
  useEffect(() => {
    if (notice) noticeRef.current?.focus();
  }, [notice]);

  useEffect(() => {
    document.title = "People · SpeedIn";
  }, []);

  const all = employees.data ?? [];
  const byId = new Map(all.map((e) => [e.id, e]));
  const managers = all.filter((e) => e.role === Role.MANAGER && e.is_active);
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
        <section aria-labelledby="people-heading" className="flex min-w-0 flex-col gap-3.5 rounded-3xl surface-card p-4 sm:p-5">
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

          <ErrorAlert>{update.error?.message}</ErrorAlert>
          {notice && (
            <p ref={noticeRef} tabIndex={-1} role="status" className="m-0 rounded-xl surface-inset px-3.5 py-2.5 text-sm font-semibold text-ink-soft focus:outline-none">
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
                  managerName={byId.get(person.reports_to_id)?.name}
                  managers={managers}
                  panel={open?.id === person.id ? open.panel : null}
                  busy={update.isPending && update.variables?.id === person.id}
                  onOpen={(p, panel) => {
                    update.reset();
                    setNotice("");
                    setOpen({ id: p.id, panel });
                  }}
                  onClose={() => setOpen(null)}
                  onDeactivate={(p) => save(p, { is_active: false }, `${p.name} is deactivated and can no longer sign in.`)}
                  onReactivate={(p) => save(p, { is_active: true }, `${p.name} can sign in again.`)}
                  onSaveManager={(p, managerId) =>
                    save(p, { reports_to_id: managerId }, `${p.name} now reports to ${byId.get(managerId)?.name}. Their requests go to them.`)
                  }
                />
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="add-employee-heading" className="flex flex-col gap-4 rounded-3xl surface-card p-5">
          <h2 id="add-employee-heading" className="m-0 text-base font-bold">
            Add employee
          </h2>
          <AddEmployeeForm managers={managers} />
        </section>
      </div>
    </div>
  );
}
