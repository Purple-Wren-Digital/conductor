"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Button } from "@/components/ui/button";
import DOMPurify from "dompurify";

interface NotificationEditorProps {
  id: string;
  disabled: boolean;
  templateVariables: string[];
  value: string;
  onChange: (json: any) => void;
}

export function NotificationEditor({
  id,
  disabled,
  value,
  onChange,
  templateVariables,
}: NotificationEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit],
    immediatelyRender: false,
    editable: !disabled,
    content: value,
    onUpdate({ editor }) {
      const cleanHtml = DOMPurify.sanitize(editor.getHTML(), {
        ALLOWED_TAGS: ["p", "br", "strong", "em"],
        ALLOWED_ATTR: [],
      });

      onChange(cleanHtml);
    },
    editorProps: {
      attributes: {
        class:
          "min-h-[120px] rounded-md border px-3 py-2 text-sm focus:outline-none",
      },
    },
  });

  if (!editor) return null;

  return (
    <div id={id} className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {templateVariables &&
          templateVariables.length > 0 &&
          templateVariables.map((variable) => {
            if (
              variable.includes("updateType") ||
              variable.includes("update_type") ||
              variable.includes("userUpdate") ||
              variable.includes("user_update")
            )
              return null;
            return (
              <Button
                key={`${id}-${variable}`}
                size="sm"
                variant="secondary"
                className="capitalize"
                onClick={() =>
                  editor.chain().focus().insertContent(variable).run()
                }
                disabled={disabled}
              >
                {variable.split("_").join(" ")}
              </Button>
            );
          })}
        {templateVariables.length === 0 && (
          <span className="text-sm text-muted-foreground">
            No template variables available
          </span>
        )}
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
