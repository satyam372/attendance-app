import { CircleCheck, Copy, RefreshCw } from "lucide-react";
import { useState } from "react";

import { useCreateEmployee } from "../../hooks/useEmployees.js";
import { Role, ROLE_LABELS } from "../../lib/domain/enums.js";
import { generateTemporaryPassword, newPasswordError } from "../../lib/domain/password.js";
import { ErrorAlert } from "../ui/Alert.jsx";
import { Button } from "../ui/Button.jsx";
import { SelectField } from "../ui/Fields.jsx";
import { TextField } from "../ui/TextField.jsx";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const emptyForm = () => ({ name: "", email: "", role: Role.EMPLOYEE, reportsTo: "", password: generateTemporaryPassword() });

/**
 * HR adds an employee with a temporary password → POST /api/employees. Employees must report to a
 * manager (`managers`: active MANAGER accounts), because their manager approves their requests.
 */
export function AddEmployeeForm({ managers = [] }) {
  const createEmployee = useCreateEmployee();
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [created, setCreated] = useState(null);
  const [copied, setCopied] = useState(false);

  const update = (changes) => {
    setForm((current) => ({ ...current, ...changes }));
    setErrors({});
    createEmployee.reset();
  };

  function handleSubmit(event) {
    event.preventDefault();
    const found = {};
    if (!form.name.trim()) found.name = "Enter their full name.";
    if (!EMAIL_PATTERN.test(form.email.trim())) found.email = "Enter a valid work email.";
    const passwordError = newPasswordError(form.password);
    if (passwordError) found.password = passwordError;
    if (form.role === Role.EMPLOYEE && !form.reportsTo) found.reportsTo = "Choose who approves their leave.";
    setErrors(found);
    if (Object.keys(found).length) return;
    const body = {
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      role: form.role,
      // Managers' and HR's requests go to HR, so only employees need a manager
      reports_to_id: form.role === Role.EMPLOYEE ? form.reportsTo : null,
      password: form.password,
    };
    createEmployee.mutate(body, { onSuccess: (employee) => setCreated({ employee, password: form.password }) });
  }

  async function copyDetails() {
    const text = `SpeedIn sign-in\nEmail: ${created.employee.email}\nTemporary password: ${created.password}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setCopied(false); // clipboard needs https or localhost; the details stay visible to copy by hand
    }
  }

  if (created) {
    return (
      <div role="status" className="flex flex-col gap-3">
        <p className="m-0 flex items-center gap-2 font-bold">
          <CircleCheck className="size-5 text-success" aria-hidden="true" />
          Account created for {created.employee.name}
        </p>
        <p className="m-0 text-sm text-ink-soft">Share these details with them privately (not in a group chat). They&rsquo;ll be asked to change the password.</p>
        <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 rounded-xl bg-field px-4 py-3 text-sm">
          <dt className="text-ink-muted">Email</dt>
          <dd className="m-0 font-semibold break-all">{created.employee.email}</dd>
          <dt className="text-ink-muted">Temporary password</dt>
          <dd className="m-0 font-mono font-semibold">{created.password}</dd>
        </dl>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={copyDetails}>
            <Copy className="size-4" aria-hidden="true" />
            {copied ? "Copied" : "Copy details"}
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setCreated(null);
              setCopied(false);
              setForm(emptyForm());
            }}
          >
            Add another
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
      <TextField label="Full name" autoComplete="off" value={form.name} onChange={(e) => update({ name: e.target.value })} error={errors.name} />
      <TextField
        label="Work email"
        type="email"
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        placeholder="name@speedinnovations.in"
        value={form.email}
        onChange={(e) => update({ email: e.target.value })}
        error={errors.email}
       
      />
      <SelectField label="Role" value={form.role} onChange={(e) => update({ role: e.target.value })}>
        {[Role.EMPLOYEE, Role.MANAGER, Role.HR].map((role) => (
          <option key={role} value={role}>
            {ROLE_LABELS[role]}
          </option>
        ))}
      </SelectField>
      {form.role === Role.EMPLOYEE ? (
        <SelectField
          label="Reports to"
          value={form.reportsTo}
          onChange={(e) => update({ reportsTo: e.target.value })}
          error={errors.reportsTo}
          hint={managers.length ? "Their manager approves their leave and WFH requests." : "Add a manager first: employees need one to approve their requests."}
          disabled={!managers.length}
        >
          <option value="">Choose a manager</option>
          {managers.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </SelectField>
      ) : (
        <p className="m-0 -mt-1 text-xs text-ink-muted">{ROLE_LABELS[form.role]} requests are approved by HR.</p>
      )}
      <TextField
        label="Temporary password"
        autoComplete="new-password"
        spellCheck={false}
        value={form.password}
        onChange={(e) => update({ password: e.target.value })}
        error={errors.password}
        inputClassName="pr-13 font-mono"
        trailing={
          <button
            type="button"
            onClick={() => update({ password: generateTemporaryPassword() })}
            aria-label="Generate a new password"
            title="Generate a new password"
            className="absolute top-0.5 right-0.5 grid size-11 cursor-pointer place-items-center rounded-[10px] text-ink-muted hover:text-ink"
          >
            <RefreshCw className="size-4.5" aria-hidden="true" />
          </button>
        }
      />
      <ErrorAlert>{createEmployee.error?.message}</ErrorAlert>
      <Button type="submit" size="lg" loading={createEmployee.isPending}>
        {createEmployee.isPending ? "Adding" : "Add employee"}
      </Button>
    </form>
  );
}
