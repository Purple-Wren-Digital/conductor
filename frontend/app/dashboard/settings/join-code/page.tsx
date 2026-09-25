import JoinCodeSettings from "@/components/ui/settings/join-code-settings";

export default function JoinCodePage() {
  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Agent Join Code</h1>
        <p className="text-muted-foreground">
          Share this code so agents can join your market center themselves.
          Agents are free and never use a paid seat.
        </p>
      </div>
      <JoinCodeSettings />
    </div>
  );
}
