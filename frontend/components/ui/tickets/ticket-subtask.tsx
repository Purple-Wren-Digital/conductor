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
import { PlusCircle } from "lucide-react";
import { toast } from "sonner";
import { title } from "process";

export function TicketTodos({ ticketId }: { ticketId: string }) {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const { getToken } = useAuth();

  const taskTodosProgress = () => {
    if (todos.length === 0) return 0;
    const completedTodos = todos.filter((todo) => todo.complete).length;
    return (completedTodos / todos.length) * 100;
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

  const onSubmitCreateSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newSubtaskTitle.trim() === "") return;
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
      toast.success("Subtask created");
      setNewSubtaskTitle("");
      setTodos((prevTodos) => [...prevTodos, data.todo]);
      await fetchSubtasks();
    } catch (error) {
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

      <form className="col-start-1 col-end-13">
        <ul className="list-none">
          {todos.map((todo: Todo) => (
            <li key={todo.id} className="flex items-center gap-2">
              <Checkbox
                id={`todo-${todo.id}`}
                checked={todo.complete}
                onCheckedChange={async (checked) =>
                  await onMarketTaskComplete(todo.id, Boolean(checked))
                }
                className="border-primary hover:bg-muted"
              />
              <Label
                htmlFor={`todo-${todo.id}`}
                className={`text-md text-muted-foreground leading-relaxed ${todo.complete ? "line-through text-muted-foreground" : ""}`}
              >
                {todo.title}
              </Label>
            </li>
          ))}
        </ul>
      </form>

      <div className="col-start-1 col-end-13">
        <form
          className="flex items-center gap-2"
          onSubmit={onSubmitCreateSubtask}
        >
          <Input
            placeholder="Create a new task"
            value={newSubtaskTitle}
            onChange={(e) => setNewSubtaskTitle(e.target.value)}
            className="w-5/12"
            disabled={isLoading}
          />
          <Button type="submit" variant="secondary" disabled={isLoading}>
            <PlusCircle className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
