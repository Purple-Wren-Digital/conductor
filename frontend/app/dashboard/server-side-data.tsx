import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getApiClient } from "@/lib/api/server-side";
import { auth } from "@clerk/nextjs/server";

/**
 * This component shows how you can fetch data from the encore backend using server components.
 */
export async function ServerSideData() {
  const { userId } = await auth();
  if (!userId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Server side data</CardTitle>
          <CardDescription>User not authenticated</CardDescription>
        </CardHeader>
        <CardContent>Please log in to view data</CardContent>
      </Card>
    );
  }

  const apiClient = await getApiClient();
  console.log({ apiClient });
  const data = await apiClient.admin.getDashboardData();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Server side data</CardTitle>
        <CardDescription>
          This data is fetched from the backend using server components
        </CardDescription>
      </CardHeader>
      <CardContent>{JSON.stringify(data)}</CardContent>
    </Card>
  );
}
