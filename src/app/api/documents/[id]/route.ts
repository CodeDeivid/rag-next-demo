import { z } from "zod";
import { deleteDocument } from "@/features/rag/server/delete-document";
import { getSessionId } from "@/features/session/server/get-session-id";

const idSchema = z.uuid({ error: "Invalid document id" });

export async function DELETE(_req: Request, ctx: RouteContext<"/api/documents/[id]">) {
  const parsed = idSchema.safeParse((await ctx.params).id);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const sessionId = await getSessionId().catch(() => null);
  if (!sessionId) return Response.json({ error: "No session" }, { status: 401 });
  // Same 404 for missing, shared or another session's document: never reveal which.
  if (!(await deleteDocument(parsed.data, sessionId))) {
    return Response.json({ error: "Document not found" }, { status: 404 });
  }
  return new Response(null, { status: 204 });
}
