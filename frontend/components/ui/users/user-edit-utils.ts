import type { UserEditFormData, UserWithStats } from "@/lib/types";

export function detectUserEdits(
  userNameForm: string,
  editUserFormData: UserEditFormData,
  editingUser: Pick<
    UserWithStats,
    "name" | "email" | "role" | "marketCenterId"
  > | null
) {
  const hasNameChanged = userNameForm !== editingUser?.name;
  const hasEmailChanged = editUserFormData?.email !== editingUser?.email;
  const hasRoleChanged = editUserFormData?.role !== editingUser?.role;
  const hasMarketCenterChanged =
    (editUserFormData?.marketCenterId ?? "") !==
    (editingUser?.marketCenterId ?? "");
  const userUpdatesMade =
    hasNameChanged ||
    hasEmailChanged ||
    hasRoleChanged ||
    hasMarketCenterChanged;
  return {
    hasNameChanged,
    hasEmailChanged,
    hasRoleChanged,
    hasMarketCenterChanged,
    userUpdatesMade,
  };
}

export function initEditUserFormData(
  user: Pick<UserWithStats, "name" | "email" | "role" | "marketCenterId">
): UserEditFormData {
  return {
    firstName: user?.name ? user.name.split(" ")?.[0] : "",
    lastName: user?.name ? user.name.split(" ")?.[1] : "",
    email: user.email,
    role: user.role,
    marketCenterId: user.marketCenterId ?? "",
  };
}
