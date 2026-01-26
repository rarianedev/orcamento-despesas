// lib/tasksDb.ts

export type Task = {
  id: number;
  title: string;
  done: boolean;
};

let lastId = 3;

let tasks: Task[] = [
  { id: 1, title: "Estudar Next.js", done: false },
  { id: 2, title: "Montar layout do Figma", done: true },
  { id: 3, title: "Criar API de exemplo", done: false },
];

// lista todas as tarefas
export function getTasks(): Task[] {
  return tasks;
}

// pega 1 tarefa
export function getTaskById(id: number): Task | undefined {
  return tasks.find((t) => t.id === id);
}

// cria uma nova tarefa
export function addTask(title: string): Task {
  const newTask: Task = {
    id: ++lastId,
    title,
    done: false,
  };

  tasks.push(newTask);
  return newTask;
}

// atualiza tarefa (title/done)
export function updateTask(
  id: number,
  data: Partial<Pick<Task, "title" | "done">>
): Task | undefined {
  const task = tasks.find((t) => t.id === id);
  if (!task) return undefined;

  if (typeof data.title === "string") {
    task.title = data.title;
  }
  if (typeof data.done === "boolean") {
    task.done = data.done;
  }

  return task;
}

// apaga tarefa
export function deleteTask(id: number): boolean {
  const index = tasks.findIndex((t) => t.id === id);
  if (index === -1) return false;

  tasks.splice(index, 1);
  return true;
}
