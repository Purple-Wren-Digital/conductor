import TicketTemplateEditor from "@/components/templates/ticket-template-editor";

export default async function EditTicketTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="container py-6">
      <TicketTemplateEditor type="edit" templateId={id} />
    </div>
  );
}
