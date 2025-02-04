import type { Express } from "express";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { db } from "@db";
import { policyBriefs, briefCollaborators, briefComments } from "@db/schema";
import { eq, and } from "drizzle-orm";

interface BriefUpdate {
  type: "update" | "comment";
  briefId: number;
  data: any;
}

export function registerRoutes(app: Express) {
  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  const clients = new Map<WebSocket, { briefId: number }>();

  wss.on("connection", (ws) => {
    ws.on("message", async (message) => {
      try {
        const update: BriefUpdate = JSON.parse(message.toString());

        if (update.type === "update") {
          await db
            .update(policyBriefs)
            .set(update.data)
            .where(eq(policyBriefs.id, update.briefId));
        } else if (update.type === "comment") {
          await db.insert(briefComments).values(update.data);
        }

        // Broadcast to all clients viewing this brief
        for (const [client, data] of clients.entries()) {
          if (data.briefId === update.briefId && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(update));
          }
        }
      } catch (error) {
        console.error("WebSocket message error:", error);
      }
    });

    ws.on("close", () => {
      clients.delete(ws);
    });
  });

  // Get all briefs
  app.get("/api/briefs", async (_req, res) => {
    const briefs = await db.select().from(policyBriefs).orderBy(policyBriefs.updatedAt);
    res.json(briefs);
  });

  // Get single brief
  app.get("/api/briefs/:id", async (req, res) => {
    const brief = await db.query.policyBriefs.findFirst({
      where: eq(policyBriefs.id, parseInt(req.params.id))
    });

    if (!brief) {
      return res.status(404).json({ message: "Brief not found" });
    }

    res.json(brief);
  });

  // Create new brief
  app.post("/api/briefs", async (req, res) => {
    const brief = await db.insert(policyBriefs).values(req.body).returning();
    res.json(brief[0]);
  });

  // Update brief
  app.patch("/api/briefs/:id", async (req, res) => {
    const brief = await db
      .update(policyBriefs)
      .set(req.body)
      .where(eq(policyBriefs.id, parseInt(req.params.id)))
      .returning();

    if (!brief.length) {
      return res.status(404).json({ message: "Brief not found" });
    }

    res.json(brief[0]);
  });

  // Add collaborator
  app.post("/api/briefs/:id/collaborators", async (req, res) => {
    const { email, accessLevel } = req.body;
    const briefId = parseInt(req.params.id);

    const existing = await db.query.briefCollaborators.findFirst({
      where: and(
        eq(briefCollaborators.briefId, briefId),
        eq(briefCollaborators.email, email)
      )
    });

    if (existing) {
      return res.status(400).json({ message: "Already a collaborator" });
    }

    const collaborator = await db
      .insert(briefCollaborators)
      .values({ briefId, email, accessLevel })
      .returning();

    res.json(collaborator[0]);
  });

  // Get brief collaborators
  app.get("/api/briefs/:id/collaborators", async (req, res) => {
    const collaborators = await db
      .select()
      .from(briefCollaborators)
      .where(eq(briefCollaborators.briefId, parseInt(req.params.id)));

    res.json(collaborators);
  });

  // Get brief comments
  app.get("/api/briefs/:id/comments", async (req, res) => {
    const comments = await db
      .select()
      .from(briefComments)
      .where(eq(briefComments.briefId, parseInt(req.params.id)))
      .orderBy(briefComments.createdAt);

    res.json(comments);
  });

  return httpServer;
}