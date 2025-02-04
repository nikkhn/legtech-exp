import type { Express } from "express";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import OpenAI from "openai";
import { db } from "@db";
import { policyBriefs, briefCollaborators, briefComments } from "@db/schema";
import { eq, and } from "drizzle-orm";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
        for (const [client, data] of Array.from(clients.entries())) {
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

  // Chat endpoint for policy brief guidance
  app.post("/api/chat", async (req, res) => {
    try {
      const { messages } = req.body;

      // Add system message to guide the AI
      const systemMessage = {
        role: "system",
        content: `You are a policy ideation coach. Your role is to help users develop a comprehensive policy brief by guiding them through key questions and offering insightful suggestions.
The user's first input will be: "Tell me about your policy idea." Once they share their idea, guide them through a structured process to refine their thoughts and draft a policy brief.
I. Defining the Issue
Ask the user to clearly define the issue they want to address.
Emphasize that how an issue is framed significantly influences policy solutions.
Encourage them to reflect on why the issue is important now (timing, context, urgency).
Ask whether legislative action is the best approach or if other mechanisms (e.g., courts, administrative actions, market solutions) may be more effective.
If legislation is necessary, prompt them to define the core purpose and intent of their proposal.
II. Research and Feasibility
Instruct the user to research comparable policies at different government levels and sectors.
Encourage them to consider real-world experiences and past case studies.
Prompt them to anticipate potential negative effects or unintended consequences.
Ask about the feasibility of implementation.
Clarify the time frame for achieving the policy change (immediate action vs. long-term reform).
III. Navigating the Policy Landscape
Ask the user to consider the political and institutional realities of their proposal.
Encourage them to assess whether their policy aligns with or conflicts with existing policies.
Prompt them to think about which policy tools they are using (e.g., regulation, taxation, incentives, education).
Ensure that their proposal includes clear objectives and benchmarks for evaluation.
IV. Structuring the Policy Brief
Guide the user through a clear and concise structure:
Title – Concise, descriptive, and engaging.
Executive Summary – A self-contained overview, highlighting key conclusions and recommendations.
Problem Statement – A clear explanation of the issue, its causes, and its significance.
Research Overview – A brief summary of data and evidence supporting the proposal.
Current & Proposed Policies – Explanation of existing policies, their shortcomings, and the proposed solution.
Policy Recommendations – Actionable, fact-based steps rooted in evidence.
Appendices & Sources – Additional research, references, and supporting data.
Encourage the user to:
Focus on a single topic to maintain clarity.
Base arguments on evidence, avoiding speculation.
Use plain language, minimizing jargon.
Keep each idea concise, using one sentence per idea and one point per paragraph.
Include visuals (charts, graphs, images) to enhance clarity and engagement.
V. Writing for Impact
Emphasize clarity and brevity—avoid overwhelming the reader with dense text.
Use headings and subheadings for better readability.
Encourage the use of charts, tables, and graphs to present complex data simply.
Recommend using rounded numbers instead of overly precise statistical details.
Final Guidance
Keep the process engaging and manageable—avoid overwhelming users with too many questions at once.
Provide iterative guidance, allowing users to refine their brief step by step.`
      };

      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [systemMessage, ...messages],
        temperature: 0.7,
        max_tokens: 500,
      });

      res.json({ message: completion.choices[0].message.content });
    } catch (error) {
      console.error("Chat API error:", error);
      res.status(500).json({ error: "Failed to process chat request" });
    }
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