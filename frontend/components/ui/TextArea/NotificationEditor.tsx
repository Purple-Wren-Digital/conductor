"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export interface TextAreaVariablesProps {
  label: string;
  id: string;
  initialValue: string;
  templateVariables?: string[];
  isEditing: boolean;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}

const NotificationEditor = ({
  label,
  id,
  templateVariables,
  isEditing,
  value,
  onChange,
  disabled,
}: TextAreaVariablesProps) => {
  function insertVariable(varName: string) {
    const textarea = document.getElementById(id) as HTMLTextAreaElement | null;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;

    const newText = text.slice(0, start) + `${varName}` + text.slice(end);
    onChange(newText);

    // re-focus
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd =
        start + varName.length + 4;
    }, 0);
  }

  return (
    <div className=" border rounded-md">
      <Textarea
        id={id}
        value={value}
        onChange={(e) => {
          if (!isEditing) return;
          onChange(e.target.value);
        }}
        placeholder={`Enter notification ${label}...`}
        className={`w-full p-2 border rounded bg-transparent overflow-y-auto disabled:text-black disabled:opacity-100 ${
          isEditing ? "cursor-text" : "max-h-[20px]"
        }`}
        disabled={!isEditing || disabled}
      />
      {isEditing && (
        <div className="flex gap-2 flex-wrap bg-muted p-2 rounded-b-md border-t">
          {templateVariables &&
            templateVariables.length > 0 &&
            templateVariables.map((variable, index) => {
              if (variable === "{{updateType}}") return null;
              return (
                <Button
                  key={`${index}-${variable}`}
                  variant={"outline"}
                  size={"sm"}
                  onClick={() => insertVariable(variable)}
                  disabled={!isEditing || disabled}
                >
                  {variable}
                </Button>
              );
            })}
        </div>
      )}
    </div>
  );
};

export default NotificationEditor;
