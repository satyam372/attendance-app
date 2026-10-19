import { Category } from "../../lib/domain/dayStatus.js";

// Tailwind classes per status category. Written out in full so Tailwind can find them.
export const CATEGORY_STYLES = {
  [Category.PRESENT]: { dot: "bg-present", chip: "bg-present-soft text-present-ink" },
  [Category.LATE]: { dot: "bg-late-dot", chip: "bg-late-soft text-late" },
  [Category.ABSENT]: { dot: "bg-absent", chip: "bg-absent-soft text-absent-ink" },
  [Category.LEAVE]: { dot: "bg-leave", chip: "bg-leave-soft text-leave-ink" },
  [Category.HOLIDAY]: { dot: "bg-holiday", chip: "bg-field text-ink-soft" },
  [Category.PENDING]: { dot: "bg-pending", chip: "bg-accent-soft text-accent-ink" },
  [Category.TODAY]: { dot: "bg-accent", chip: "bg-accent-soft text-accent-ink" },
  [Category.NONE]: { dot: "bg-transparent", chip: "bg-field text-ink-muted" },
};

// Legend order from the Attendance artboard, plus "Awaiting approval" for pending requests.
export const LEGEND = [
  { category: Category.PRESENT, label: "Present" },
  { category: Category.LATE, label: "Late" },
  { category: Category.ABSENT, label: "Absent" },
  { category: Category.LEAVE, label: "Leave" },
  { category: Category.HOLIDAY, label: "Holiday" },
  { category: Category.PENDING, label: "Awaiting approval" },
];
