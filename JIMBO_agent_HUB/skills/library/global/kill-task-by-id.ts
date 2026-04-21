// Skill: kill-task-by-id
// Namespace: global
// Tries to kill a task by its ID using the DELETE /agent/tasks/{task_id} endpoint. First attempts to get more details about the task if possible.
// Tags: task-management, api, debugging

// Auto-extracted skill
// Źródło: Goose task 2026-04-18T04:31:37.954Z

Najpierw (2): spróbuj uzyskać więcej szczegółów o aktywnym tasku (jeśli są dostępne przez inne endpointy).
Potem (1): jeśli nie da się zdiagnozować, spróbuj go zabić.
