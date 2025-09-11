import UserManagement from "@/components/users/user-management";

export default function UsersPage() {
  return (
    <>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">
          Admin — User Management
        </h1>
        <p className="text-muted-foreground">
          Create, edit, and manage users & roles.
        </p>
      </div>

      <div className="space-y-6">
        <UserManagement />
      </div>
    </>
  );
}
