import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut } from "lucide-react";
import Link from "next/link";

export default function SettingsPage() {
	return (
		<main className="container">
			<h1 className="text-3xl font-semibold mb-4">Settings</h1>

			<Card>
				<CardHeader>
					<CardTitle>Sign out</CardTitle>
				</CardHeader>
				<CardContent>
					<Button asChild>
						<Link href="/auth/logout">
							Sign out <LogOut />
						</Link>
					</Button>
				</CardContent>
			</Card>
		</main>
	);
}
