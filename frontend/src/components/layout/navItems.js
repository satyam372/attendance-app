import { CalendarDays, FileText, House, UserRound, UsersRound } from "lucide-react";

import { Role } from "../../lib/domain/enums.js";

// Main navigation, shared by the PC sidebar and the phone tab bar.
// `roles` limits an item to those roles; the backend still enforces access on every route.
export const NAV_ITEMS = [
  { to: "/", label: "Home", icon: House, end: true },
  { to: "/attendance", label: "Attendance", icon: CalendarDays },
  { to: "/leave", label: "Leave", icon: FileText },
  { to: "/hr", label: "Team", icon: UsersRound, roles: [Role.HR] },
];

// The phone tab bar has no room for the profile card, so Profile is a tab there.
export const PROFILE_ITEM = { to: "/profile", label: "Profile", icon: UserRound };

export function itemsFor(role) {
  return NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(role));
}
