"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import type { Todo } from "@/lib/types";
import { API_BASE } from "@/lib/api/utils";
import { Plus } from "lucide-react";
import { toast } from "sonner";

type EditSubtask = {
  ticketId: string;
  todoId: string;
  title: string;
};

export function TicketTodos({ ticketId }: { ticketId: string }) {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState<string>("");
  const [editingSubtask, setEditingSubtask] = useState<EditSubtask>({
    ticketId: "",
    todoId: "",
    title: "",
  });
  const [errorMessage, setErrorMessage] = useState({
    message: "",
    type: "",
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const { getToken } = useAuth();

  const taskTodosProgress = () => {
    if (todos.length === 0) return 0;
    const completedTodos = todos.filter((todo) => todo.complete).length;
    return (completedTodos / todos.length) * 100;
  };

  const validateSubtaskTitle = (type: "create" | "edit") => {
    setErrorMessage({ message: "", type: "" });

    switch (type) {
      case "create":
        if (newSubtaskTitle.trim() === "") {
          setErrorMessage({
            message: "Subtask title cannot be empty",
            type: "create",
          });
          return false;
        }
        break;
      case "edit":
        if (
          !editingSubtask?.title ||
          (editingSubtask?.title && editingSubtask?.title.trim() === "")
        ) {
          setErrorMessage({
            message: "Subtask title cannot be empty",
            type: "edit",
          });
          return false;
        }
        const originalTodo = todos.find(
          (todo) => todo.id === editingSubtask.todoId
        );
        if (originalTodo && originalTodo.title === editingSubtask.title) {
          setErrorMessage({ message: "No changes made", type: "edit" });
          return false;
        }
        break;
      default:
        return true;
    }
    setErrorMessage({ message: "", type: "" });
    return true;
  };

  const fetchSubtasks = useCallback(async () => {
    // Placeholder for fetching subtasks if needed in the future
    try {
      const token = await getToken();
      if (!token) {
        throw new Error("Failed to get authentication token");
      }
      const response = await fetch(`${API_BASE}/tickets/${ticketId}/todos`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });
      const data = await response.json();
      setTodos(data?.todos ?? []);
      // Process subtasks data as needed
    } catch (error) {
      console.error("Failed to fetch subtasks:", error);
    }
  }, [ticketId, getToken]);

  useEffect(() => {
    fetchSubtasks();
  }, [fetchSubtasks]);

  const closeEditSubtask = () => {
    setErrorMessage({ message: "", type: "" });
    setEditingSubtask({
      ticketId: "",
      todoId: "",
      title: "",
    });
  };

  const resetCreateSubtask = () => {
    setErrorMessage({ message: "", type: "" });
    setNewSubtaskTitle("");
  };

  const onSubmitCreateSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    const isValid = validateSubtaskTitle("create");
    if (!isValid) {
      toast.error("Invalid input");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const token = await getToken();
      if (!token) {
        throw new Error("Failed to get authentication token");
      }
      const res = await fetch(`${API_BASE}/tickets/${ticketId}/todos`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
        body: JSON.stringify({ title: newSubtaskTitle, completed: false }),
      });
      if (!res.ok) {
        throw new Error("Failed to create subtask");
      }
      const data = await res.json();
      if (!data?.todo) {
        throw new Error("No subtask data returned");
      }
      toast.info("Subtask created");
      resetCreateSubtask();
      setTodos((prevTodos) => [...prevTodos, data.todo]);
      await fetchSubtasks();
    } catch (error) {
      toast.error("Error: Could not create subtask");
      console.error("Error creating subtask:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const onMarketTaskComplete = async (todoId: string, completed: boolean) => {
    // Placeholder for marking task complete if needed in the future
    setIsLoading(true);
    try {
      const token = await getToken();
      if (!token) {
        throw new Error("Failed to get authentication token");
      }
      const res = await fetch(
        `${API_BASE}/tickets/${ticketId}/todos/${todoId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
          body: JSON.stringify({ completed }),
        }
      );
      if (!res.ok) {
        throw new Error("Failed to update subtask");
      }
      const data = await res.json();
      if (!data?.success) {
        throw new Error("Failed to update subtask");
      }

      await fetchSubtasks();
    } catch (error) {
      console.error("Error updating subtask:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatedSubtask = async () => {
    setIsLoading(true);
    const isValid = validateSubtaskTitle("edit");
    if (!isValid) {
      toast.error("Invalid input");
      setIsLoading(false);
      return;
    }
    try {
      const token = await getToken();
      if (!token) {
        throw new Error("Failed to get authentication token");
      }
      const res = await fetch(
        `${API_BASE}/tickets/${ticketId}/todos/${editingSubtask.todoId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
          body: JSON.stringify({ title: editingSubtask.title }),
        }
      );
      if (!res.ok) {
        throw new Error("Failed to update subtask");
      }
      const data = await res.json();
      if (!data?.success) {
        throw new Error("Failed to update subtask");
      }
      toast.info("Subtask updated");
      closeEditSubtask();
      await fetchSubtasks();
    } catch (error) {
      toast.error("Error: Could not update subtask");
      console.error("Error updating subtask:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveSubtask = async () => {
    setIsLoading(true);
    try {
      const token = await getToken();
      if (!token) {
        throw new Error("Failed to get authentication token");
      }
      const res = await fetch(
        `${API_BASE}/tickets/${ticketId}/todos/${editingSubtask.todoId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        }
      );
      if (!res.ok) {
        throw new Error("Failed to update subtask");
      }
      const data = await res.json();
      if (!data?.success) {
        throw new Error("Failed to update subtask");
      }
      toast.info("Subtask removed");
      closeEditSubtask();
      await fetchSubtasks();
    } catch (error) {
      toast.error("Error: Could not remove subtask");
      console.error("Error removing subtask:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-12 gap-2 items-center">
      <div className="col-start-1 col-end-9">
        <h4 className="font-semibold">Todos</h4>
      </div>

      <div className="col-start-9 col-end-12">
        {todos && todos.length > 0 && (
          <div className="w-full mx-auto">
            <Progress
              value={taskTodosProgress()}
              getValueLabel={(value, max) =>
                `${Math.round((value / max) * 100)}%`
              }
              className="w-full h-2"
            />
          </div>
        )}
      </div>
      <div className="col-start-12 col-end-13">
        <p className="text-xs text-center text-muted-foreground font-semibold">
          {Math.round(taskTodosProgress())}%
        </p>
      </div>

      <div className="col-start-1 col-end-13">
        <form
          className="flex items-center gap-2"
          onSubmit={onSubmitCreateSubtask}
          onReset={(e) => {
            e.preventDefault();
            resetCreateSubtask();
          }}
        >
          <div className="ml-0.5 flex items-center justify-center rounded-xs border-muted bg-muted/50">
            <Plus className="size-4 text-muted-foreground" />
          </div>

          <Input
            placeholder="Create a new task"
            value={newSubtaskTitle}
            onChange={(e) => setNewSubtaskTitle(e.target.value)}
            className={`md:w-2/3 h-8 ${errorMessage?.type === "create" ? "border-rose-500" : ""}`}
            disabled={isLoading}
          />
          <Button
            type="submit"
            variant="outline"
            size={"sm"}
            disabled={isLoading || newSubtaskTitle.trim() === ""}
            aria-label="Create new subtask for ticket"
          >
            Create
          </Button>
          {newSubtaskTitle && newSubtaskTitle.trim() !== "" && (
            <Button
              type="reset"
              variant="outline"
              size={"sm"}
              disabled={isLoading || newSubtaskTitle.trim() === ""}
              aria-label="Reset new subtask input"
              className="bg-muted"
              onBlur={closeEditSubtask}
              onKeyDown={async (e) => {
                e.preventDefault();
                if (e.key === "Escape" || e.key === "Tab") resetCreateSubtask();
              }}
            >
              {/* <RotateCcw className="size-3.5" /> */}
              Reset
            </Button>
          )}
        </form>
        <ul className="list-none">
          {todos.map((todo: Todo) => (
            <li key={todo.id} className="flex items-center gap-2 pl-1">
              <Checkbox
                id={`todo-${todo.id}`}
                checked={todo.complete}
                onCheckedChange={async (checked) => {
                  await onMarketTaskComplete(todo.id, Boolean(checked));
                }}
                className="shadow hover:bg-muted"
                aria-label={`Mark subtask "${todo.title}" as ${
                  todo.complete ? "incomplete" : "complete"
                }`}
              />
              <div
                onClick={() => {
                  setEditingSubtask({
                    ticketId,
                    todoId: todo.id,
                    title: todo.title,
                  });
                }}
                className="flex-1 space-y-2 cursor-pointer hover:underline py-2"
              >
                {editingSubtask?.todoId !== todo.id && (
                  <Label
                    htmlFor={`todo-${todo.id}`}
                    className={`text-md text-muted-foreground font-normal leading-relaxed ${todo.complete ? "line-through text-muted-foreground" : ""}`}
                    aria-label={`Subtask title: ${todo.title}. Click here to edit.`}
                  >
                    {todo.title}
                  </Label>
                )}
                {editingSubtask?.todoId === todo.id && (
                  <div className="flex flex-wrap items-center gap-2 w-full">
                    <Input
                      type="text"
                      className={`md:w-2/3 h-8 ${errorMessage?.type === "edit" ? "border-rose-500" : ""}`}
                      value={editingSubtask.title}
                      onChange={(e) =>
                        setEditingSubtask((prev) => ({
                          ...prev,
                          title: e.target.value,
                        }))
                      }
                      onBlur={closeEditSubtask}
                      onKeyDown={async (e) => {
                        e.preventDefault();
                        if (e.key === "Enter") await handleUpdatedSubtask();
                        if (e.key === "Escape" || e.key === "Tab")
                          closeEditSubtask();
                      }}
                    />
                    <div className="flex flex-wrap items-center justify-end gap-2 w-full md:w-auto">
                      <Button
                        variant="outline"
                        size={"sm"}
                        onClick={handleUpdatedSubtask}
                        disabled={
                          isLoading || editingSubtask?.title.trim() === ""
                        }
                        aria-label="Save edited subtask title"
                      >
                        Save
                      </Button>
                      <Button
                        variant="outline"
                        size={"sm"}
                        onClick={handleRemoveSubtask}
                        className="bg-muted"
                        disabled={isLoading}
                        aria-label="Delete subtask from todo list"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
