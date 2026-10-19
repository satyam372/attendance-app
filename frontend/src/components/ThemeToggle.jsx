import { Monitor, Moon, Sun } from "lucide-react";

import { useTheme } from "../theme/ThemeContext.jsx";
import { Button } from "./ui/Button.jsx";

const NEXT = { system: "light", light: "dark", dark: "system" };
const ICONS = { system: Monitor, light: Sun, dark: Moon };
const LABELS = { system: "System", light: "Light", dark: "Dark" };

/** Cycles the theme: system → light → dark. */
export function ThemeToggle() {
  const { preference, setPreference } = useTheme();
  const Icon = ICONS[preference];
  const next = NEXT[preference];
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setPreference(next)}
      aria-label={`Theme: ${LABELS[preference]}. Switch to ${LABELS[next].toLowerCase()}`}
      title={`Theme: ${LABELS[preference]}`}
    >
      <Icon className="size-5" strokeWidth={1.8} aria-hidden="true" />
    </Button>
  );
}
