"use client";

import { useUserRole } from "@/hooks/use-user-role";
import TemplateCustomizationList from "@/components/templates/template-customization-list";

export default function TemplateCustomizationPage() {
  const { role } = useUserRole();

  return (
    <div className="container py-6">
      <TemplateCustomizationList role={role} />
    </div>
  );
}
