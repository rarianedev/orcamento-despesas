// app/api/tasks/[id]/route.ts
import { NextResponse } from "next/server";
import { getTaskById, updateTask, deleteTask } from "../../../lib/tasksDb";

// utilzinho pra pegar o ID numérico da URL
function getIdFromParams(params: { id?: string }): number | null {
  const id = Number(params.id);
  if (!params.id || Number.isNaN(id)) return null;
  return id;
}

// GET /api/tasks/:id
export async function GET(
  _request: Request,
  { params }: { params: { id?: string } }
) {
  const id = getIdFromParams(params);
  if (id === null) {
    return NextResponse.json({ error: "ID inválido." }, { status: 400 });
  }

  const task = getTaskById(id);
  if (!task) {
    return NextResponse.json({ error: "Tarefa não encontrada." }, { status: 404 });
  }

  return NextResponse.json(task);
}

// PUT /api/tasks/:id
// body pode conter: { "title"?: string, "done"?: boolean }
export async function PUT(
  request: Request,
  { params }: { params: { id?: string } }
) {
  const id = getIdFromParams(params);
  if (id === null) {
    return NextResponse.json({ error: "ID inválido." }, { status: 400 });
  }

  const body = await request.json();

  const updated = updateTask(id, {
    title: body.title,
    done: body.done,
  });

  if (!updated) {
    return NextResponse.json({ error: "Tarefa não encontrada." }, { status: 404 });
  }

  return NextResponse.json(updated);
}

// DELETE /api/tasks/:id
export async function DELETE(
  _request: Request,
  { params }: { params: { id?: string } }
) {
  const id = getIdFromParams(params);
  if (id === null) {
    return NextResponse.json({ error: "ID inválido." }, { status: 400 });
  }

  const ok = deleteTask(id);

  if (!ok) {
    return NextResponse.json({ error: "Tarefa não encontrada." }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
