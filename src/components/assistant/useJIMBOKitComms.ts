import { useEffect, useState, useCallback } from "react";

export interface PendingTask {
  id: string;
  instruction: string;
  [key: string]: any;
}

/**
 * Hook do komunikacji z JIMBOKit przez JIMBO HUB.
 * Polluje endpoint /jimbokit-comms/pending co 5s.
 */
export function useJIMBOKitComms() {
  const [pendingTasks, setPendingTasks] = useState<PendingTask[]>([]);

  const poll = useCallback(async () => {
    try {
      const res = await fetch("http://localhost:4224/jimbokit-comms/pending");
      if (res.ok) {
        const tasks = await res.json();
        setPendingTasks(tasks);
      }
    } catch (err) {
      // HUB może być offline przy starcie, nie spamujmy konsoli błędami połączenia
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(poll, 5000);
    poll();
    return () => clearInterval(timer);
  }, [poll]);

  const completeTask = useCallback(async (id: string, result: any) => {
    try {
      // 1. Zapisz wynik
      await fetch("http://localhost:4224/jimbokit-comms/result", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, result }),
      });
      // 2. Usuń task z kolejki "pending"
      await fetch(`http://localhost:4224/jimbokit-comms/task/${id}`, {
        method: "DELETE",
      });
      // 3. Usuń z lokalnego stanu
      setPendingTasks((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      console.error("[JIMBOKitComms] Failed to complete task", err);
    }
  }, []);

  return { pendingTasks, completeTask };
}
