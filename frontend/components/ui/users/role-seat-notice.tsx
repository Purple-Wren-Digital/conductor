import type { UserRole } from "@/lib/types";

/**
 * Explains, inline, why the role dropdown is offering fewer options than usual.
 *
 * The seat limit was previously communicated only by a tooltip on a small
 * "N out of M paid seats used" line, which reads as a status label rather than
 * a constraint -- an admin seeing only "Agent" in the dropdown had no way to
 * tell whether the product was broken or whether they were out of seats.
 */
export function RoleSeatNotice({
  canBypassLimits,
  hasAvailableSeats,
  totalSeats,
  currentRole,
}: {
  canBypassLimits: boolean;
  hasAvailableSeats: boolean;
  totalSeats: number;
  /** Role of the user being edited; omit when creating one. */
  currentRole?: UserRole | null;
}) {
  if (canBypassLimits || hasAvailableSeats) return null;

  // Someone already on a paid role can still move between paid roles, so the
  // limit isn't restricting anything for them.
  if (currentRole && currentRole !== "AGENT") return null;

  return (
    <p className="text-xs text-muted-foreground">
      {totalSeats === 0
        ? "This market center has no active subscription, so only the agent role can be assigned. Agents are always free."
        : `All ${totalSeats} paid seats are in use, so only the agent role can be assigned. Free a seat or add more to assign staff, staff leader or admin.`}
    </p>
  );
}
