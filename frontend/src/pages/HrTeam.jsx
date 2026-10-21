import clsx from "clsx";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";

import { AddEmployeeForm } from "../components/hr/AddEmployeeForm.jsx";
import { HrTabs } from "../components/hr/HrTabs.jsx";
import { ErrorAlert } from "../components/ui/Alert.jsx";
import { Avatar } from "../components/ui/Avatar.jsx";
import { Button } from "../components/ui/Button.jsx";
import { Skeleton } from "../components/ui/Skeleton.jsx";
import { useEmployees } from "../hooks/useEmployees.js";
import { Role, ROLE_LABELS } from "../lib/domain/enums.js";

const ROLE_CHIP = {
  [Role.HR]: "bg-accent-soft text-accent-ink",
  [Role.MANAGER]: "bg-leave-soft text-leave-ink",
  [Role.EMPLOYEE]: "bg-field text-ink-soft",
};

/** HR people list (GET /api/employees) and the add-employee form. */
export default function HrTeam() {
  const employees = useEmployees();
  const [query, setQuery] = useState("");

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
                <li key={person.email} className={clsx("flex items-center gap-3 border-b border-line/70 py-3 last:border-b-0", !person.is_active && "opacity-60")}>
                  <Avatar name={person.name} className="size-10 text-[13px]" />
                  <div className="min-w-0 flex-1">
                    <p className="m-0 truncate text-sm font-semibold">{person.name}</p>
                    <p className="m-0 truncate text-xs text-ink-muted">{person.email}</p>
                  </div>
                  {!person.is_active && <span className="shrink-0 rounded-full bg-field px-2.5 py-1 text-xs font-bold text-ink-muted">Inactive</span>}
                  <span className={clsx("shrink-0 rounded-full px-2.5 py-1 text-xs font-bold", ROLE_CHIP[person.role])}>{ROLE_LABELS[person.role]}</span>
                </li>
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
