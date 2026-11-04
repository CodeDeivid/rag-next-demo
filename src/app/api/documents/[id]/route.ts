import { z } from "zod";
import { deleteDocument } from "@/features/rag/server/delete-document";

const idSchema = z.uuid({ error: "Invalid document id" });

export async function DELETE(_req: Request, ctx: RouteContext<"/api/documents/[id]">) {
  const parsed = idSchema.safeParse((await ctx.params).id);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  if (!(await deleteDocument(parsed.data))) {
    return Response.json({ error: "Document not found" }, { status: 404 });
  }
  return new Response(null, { status: 204 });
}
