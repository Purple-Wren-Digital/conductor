import UserDetailView from "@/components/ui/users/user-detail-view";

export default async function DashboardUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <UserDetailView id={id} />;
}
