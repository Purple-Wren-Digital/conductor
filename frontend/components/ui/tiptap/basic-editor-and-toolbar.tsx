"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import Link from "@tiptap/extension-link";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { FC, FormEvent, useEffect, useState } from "react";
import { Button } from "../button";
import {
  Ban,
  Bold,
  Italic,
  LinkIcon,
  List,
  ListOrdered,
  Strikethrough,
  UnlinkIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../dialog/base-dialog";
import { Label } from "../label";
import { Input } from "../input";

interface BasicEditorProps {
  value?: string;
  disabled?: boolean;
  onChange?: (html: string) => void;
  placeholder?: string;
  onSubmit?: () => void; // new
}

export const BasicEditorWithToolbar: FC<BasicEditorProps> = ({
  value = "",
  disabled = false,
  onChange,
  placeholder,
  onSubmit,
}) => {
  const [openLinkDialog, setOpenLinkDialog] = useState(false);
  const [linkText, setLinkText] = useState("");
  const [linkUrl, setLinkUrl] = useState("");

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: placeholder || "Start typing...",
        showOnlyWhenEditable: false,
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
        HTMLAttributes: {
          target: "_blank",
          rel: "noopener noreferrer",
        },
      }),
    ],
    immediatelyRender: false,
    content: value,
    editable: !disabled,
    onUpdate({ editor }) {
      onChange?.(editor.getHTML());
    },

    editorProps: {
      attributes: {
        class:
          "min-h-[120px] rounded-b-md border p-1 text-md text-primary focus:outline-none [&_ul]:list-disc [&_ul]:list-outside [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:list-outside [&_ol]:pl-6 ",
      },
      handleKeyDown(view, event) {
        if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
          event.preventDefault();
          onSubmit?.();
          return true;
        }
        return false;
      },
    },
  });

  useEffect(() => {
    if (!editor) return;

    const onBlur = () => setOpenLinkDialog(false);
    editor.on("blur", onBlur);

    return () => {
      editor.off("blur", onBlur);
    };
  }, [editor]);

  const cleanupLinkForm = () => {
    setOpenLinkDialog(false);
    setLinkUrl("");
    setLinkText("");
  };

  if (!editor) return null;

  return (
    <>
      <div className="border rounded-md">
        {/* Toolbar */}
        <div className="flex justify-between flex-wrap gap-4 border-b p-2 bg-gray-50 border rounded-t-md w-full">
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={"outline"}
              size={"icon"}
              onClick={() => editor.chain().focus().toggleBold().run()}
              disabled={disabled}
              className={editor.isActive("bold") ? "bg-muted" : ""}
              aria-label="Bold"
            >
              <Bold className="size-4" />
            </Button>
            <Button
              variant={"outline"}
              size={"icon"}
              onClick={() => editor.chain().focus().toggleItalic().run()}
              disabled={disabled}
              className={editor.isActive("italic") ? "bg-muted" : ""}
            >
              <Italic className="size-4" />
            </Button>
            <Button
              variant={"outline"}
              size={"icon"}
              disabled={disabled}
              onClick={() => {
                const previousUrl = editor.getAttributes("link").href ?? "";
                const selection = editor.state.selection;
                if (selection && !selection.empty) {
                  const selectedText = editor.state.doc.textBetween(
                    selection.from,
                    selection.to,
                    " "
                  );
                  setLinkText(selectedText);
                } else {
                  setLinkText("");
                }
                setLinkUrl(previousUrl);
                setOpenLinkDialog(true);
              }}
              className={editor.isActive("link") ? "bg-muted" : ""}
              aria-label="Add or edit link"
            >
              <LinkIcon className="size-4" />
            </Button>

            {editor.isActive("link") && (
              <Button
                variant="outline"
                size={"icon"}
                disabled={disabled}
                onClick={() => {
                  editor.chain().focus().unsetLink().run();
                }}
                aria-label="Remove link from selection in the editor"
              >
                <UnlinkIcon className="size-4" />
              </Button>
            )}
            <Button
              variant={"outline"}
              size={"icon"}
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              disabled={disabled}
              className={editor.isActive("bulletList") ? "bg-muted" : ""}
            >
              <List className="size-4" />
            </Button>
            <Button
              variant={"outline"}
              size={"icon"}
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              disabled={disabled}
              className={editor.isActive("orderedList") ? "bg-muted" : ""}
            >
              <ListOrdered className="size-4" />
            </Button>
          </div>

          <Button
            variant={"ghost"}
            size={"icon"}
            onClick={() => {
              editor.chain().focus().setContent("").run();
            }}
            disabled={disabled}
            className="border"
            aria-label="Clear input"
          >
            <Ban className="size-4" />
          </Button>
        </div>

        {/* Editor */}
        <EditorContent editor={editor} />
      </div>

      {/* Link Form */}
      <Dialog open={openLinkDialog} onOpenChange={setOpenLinkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              Add Link
            </DialogTitle>
            <DialogDescription>
              You may also paste URLs directly in the editor to add a web link
            </DialogDescription>
          </DialogHeader>
          <form className="flex flex-col gap-4">
            <div className="space-y-2 mt-2">
              <Label
                htmlFor="link-text"
                className="block text-sm font-semibold"
              >
                Text
              </Label>
              <Input
                type="text"
                id="link-text"
                name="link-text"
                className="w-full border rounded-md p-2"
                value={linkText}
                onChange={(e) => setLinkText(e.target.value)}
                placeholder="Link text"
                aria-label="Input text for the link"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="link-url" className="block text-sm font-semibold">
                URL
              </Label>
              <Input
                type="text"
                id="link-url"
                name="link-url"
                className="w-full border rounded-md p-2"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="i.e. www.example.com"
                aria-label="Input URL for the link"
              />
            </div>

            <DialogFooter className="mt-4 space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setOpenLinkDialog(false);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={(e) => {
                  e.preventDefault();

                  // Normalize URL
                  const normalized =
                    linkUrl.startsWith("http://") ||
                    linkUrl.startsWith("https://")
                      ? linkUrl
                      : `https://${linkUrl}`;

                  if (!linkUrl) {
                    editor.chain().focus().unsetLink().run();
                    cleanupLinkForm();
                    return;
                  }

                  const alt = linkText ? linkText : normalized;
                  const { from, to } = editor.state.selection;

                  if (linkText) {
                    editor.chain().focus().deleteRange({ from, to }).run();
                    editor
                      .chain()
                      .focus()
                      .insertContentAt(from, [
                        {
                          type: "text",
                          text: linkText,
                          marks: [
                            {
                              type: "link",
                              attrs: {
                                href: normalized,
                                target: "_blank",
                                rel: "noopener noreferrer",
                                alt: alt,
                              },
                            },
                          ],
                        },
                      ])
                      .run();
                  } else {
                    editor
                      .chain()
                      .focus()
                      .extendMarkRange("link")
                      .setLink({
                        href: normalized,
                        target: "_blank",
                        rel: "noopener noreferrer",
                      })
                      .run();
                  }

                  cleanupLinkForm();
                }}
              >
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};
