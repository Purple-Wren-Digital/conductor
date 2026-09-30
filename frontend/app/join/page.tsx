import { Suspense } from "react";
import { JoinForm } from "./join-form";

export default function JoinPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Suspense
        fallback={
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900" />
        }
      >
        <JoinForm />
      </Suspense>
    </div>
  );
}
