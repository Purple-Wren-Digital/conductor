"use client";

import AutoCloseSettings from "@/components/ui/settings/auto-close-settings";
import JoinCodeSettings from "@/components/ui/settings/join-code-settings";

export default function SettingsPage() {
  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="mt-2 text-muted-foreground">
          Configure your market center settings and preferences.
        </p>
      </div> */}

      <AutoCloseSettings />
      <JoinCodeSettings />
    </div>
  );
}
