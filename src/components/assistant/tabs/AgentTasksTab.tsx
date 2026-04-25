import type { RefObject } from "react";
import type { TaskEntry } from "../agentHubTypes";

interface AgentTasksTabProps {
  visible: boolean;
  hubOnline: boolean;
  gooseAvail: boolean;
  tasks: TaskEntry[];
  taskInput: string;
  taskRunning: boolean;
  taskBottomRef: RefObject<HTMLDivElement | null>;
  onRunTask: () => void;
  onCopy: (text: string) => void;
  onSendToChat: (text: string) => void;
  onOpenIframe: (url: string) => void;
  onToggleCollapse: (id: string) => void;
  onTaskInputChange: (v: string) => void;
}

function extractUrls(text: string) {
  return [...text.matchAll(/https?:\/\/[^\s"'>)]+/g)]
    .map((m) => m[0])
    .slice(0, 3);
}

function taskOutput(t: TaskEntry) {
  return t.lines.map((l) => l.text).join("");
}

export function AgentTasksTab({
  visible,
  hubOnline,
  gooseAvail,
  tasks,
  taskInput,
  taskRunning,
  taskBottomRef,
  onRunTask,
  onCopy,
  onSendToChat,
  onOpenIframe,
  onToggleCollapse,
  onTaskInputChange,
}: AgentTasksTabProps) {
  return (
    <>
      <div
        className="ah-task-output"
        ref={taskBottomRef}
        style={{ display: visible ? undefined : "none" }}
      >
        {tasks.length === 0 && (
          <p className="ah-empty">
            Wpisz instrukcję — Goose wykona ją i pokaże output tutaj
            <br />
            <span className="ah-empty-hint">
              Shift+Enter = uruchom · → wyśle output do chatu
            </span>
          </p>
        )}
        {tasks.map((task) => {
          const urls = extractUrls(taskOutput(task));
          const isCollapsed = task.collapsed && task.status !== "running";
          return (
            <div
              key={task.id}
              className={`ah-task ah-task-${task.status}${isCollapsed ? " ah-task-collapsed" : ""}`}
            >
              <div
                className="ah-task-hdr"
                onClick={() => onToggleCollapse(task.id)}
                style={{ cursor: "pointer" }}
              >
                <span className="ah-task-icon">
                  {task.status === "running"
                    ? "⟳"
                    : task.status === "done"
                      ? "✓"
                      : "✗"}
                </span>
                <span className="ah-task-instr" title={task.instructions}>
                  {task.instructions.slice(0, 70)}
                  {task.instructions.length > 70 ? "…" : ""}
                </span>
                <span
                  style={{
                    marginLeft: "auto",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    flexShrink: 0,
                  }}
                >
                  {task.reflexionScore != null && (
                    <span
                      title={
                        task.reflexionImprovement ?? task.reflexionVerdict ?? ""
                      }
                      style={{
                        fontSize: "10px",
                        padding: "1px 5px",
                        borderRadius: "10px",
                        background:
                          task.reflexionScore >= 0.7 ? "#1a3a1a" : "#3a1a1a",
                        color:
                          task.reflexionScore >= 0.7 ? "#4ade80" : "#f87171",
                        border: `1px solid ${task.reflexionScore >= 0.7 ? "#4ade80" : "#f87171"}`,
                      }}
                    >
                      {task.reflexionVerdict === "success"
                        ? "✓"
                        : task.reflexionVerdict === "failure"
                          ? "✗"
                          : "~"}{" "}
                      {(task.reflexionScore * 100).toFixed(0)}%
                    </span>
                  )}
                  {task.retryNum != null && (
                    <span
                      style={{ fontSize: "10px", color: "#fbbf24" }}
                      title="Auto-retry w toku"
                    >
                      ↺{task.retryNum}/{task.maxRetries}
                    </span>
                  )}
                  {task.durationMs != null && (
                    <span className="ah-task-dur">
                      {(task.durationMs / 1000).toFixed(1)}s
                    </span>
                  )}
                  <span className="ah-task-toggle">
                    {isCollapsed ? "▶" : "▼"}
                  </span>
                </span>
              </div>
              {!isCollapsed && (
                <>
                  <pre className="ah-task-lines">
                    {task.lines.map((l, i) => (
                      <span key={i} className={l.isStderr ? "ah-line-err" : ""}>
                        {l.text}
                      </span>
                    ))}
                    {task.status === "running" && (
                      <span className="ah-typing">▋</span>
                    )}
                  </pre>
                  <div className="ah-task-actions">
                    <button
                      className="ah-act-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCopy(taskOutput(task));
                      }}
                      title="Kopiuj output"
                    >
                      ⎘ kopiuj
                    </button>
                    <button
                      className="ah-act-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSendToChat(taskOutput(task).slice(0, 3000));
                      }}
                      title="Wyślij do chatu"
                    >
                      → chat
                    </button>
                    {urls.map((url) => (
                      <button
                        key={url}
                        className="ah-act-btn ah-act-url"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenIframe(url);
                        }}
                        title={url}
                      >
                        ⊞ {new URL(url).hostname.replace("www.", "")}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {visible && (
        <div className="ah-input-bar">
          <textarea
            className="ah-textarea"
            placeholder={
              !hubOnline
                ? "Hub offline"
                : !gooseAvail
                  ? "Goose offline — uruchom hub z Goose"
                  : "Instrukcja dla Goose… (Shift+Enter = uruchom)"
            }
            value={taskInput}
            onChange={(e) => onTaskInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.shiftKey) {
                e.preventDefault();
                onRunTask();
              }
            }}
            rows={2}
            disabled={taskRunning || !gooseAvail}
          />
          <button
            className="ah-btn-run"
            onClick={onRunTask}
            disabled={taskRunning || !gooseAvail || !taskInput.trim()}
          >
            {taskRunning ? "⟳" : "⚡"}
          </button>
        </div>
      )}
    </>
  );
}
