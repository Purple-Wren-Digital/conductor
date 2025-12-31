import TicketTemplateEditor from "@/components/templates/ticket-template-editor";

export default function CreateTicketTemplatePage() {
  return (
    <div className="container py-6">
      <TicketTemplateEditor type="create" />
    </div>
  );
}
