import type { Express } from "express";
import { createServer } from "http";
import { db } from "@db";
import { policyBriefs } from "@db/schema";
import { eq } from "drizzle-orm";

export function registerRoutes(app: Express) {
  const httpServer = createServer(app);

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

  return httpServer;
}
