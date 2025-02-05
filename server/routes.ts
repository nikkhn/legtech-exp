import type { Express } from "express";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import OpenAI from "openai";
import { db } from "@db";
import { policyBriefs, briefCollaborators, briefComments } from "@db/schema";
import { eq, and } from "drizzle-orm";
import { knowledgeBase } from "./utils/knowledge-base";

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
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

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
          if (
            data.briefId === update.briefId &&
            client.readyState === WebSocket.OPEN
          ) {
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

      // Get the latest user message
      const latestUserMessage = messages[messages.length - 1].content;

      // Retrieve relevant context about AI Act if the message seems related
      let relevantContext = "";
      if (
        latestUserMessage.toLowerCase().includes("ai") ||
        latestUserMessage.toLowerCase().includes("artificial intelligence") ||
        latestUserMessage.toLowerCase().includes("regulation")
      ) {
        relevantContext =
          await knowledgeBase.getRelevantContext(latestUserMessage);
      }

      // Add system message to guide the AI
      const systemMessage = {
        role: "system",
        content: `

You are a policy ideation coach. Your role is to help users develop a clear, well-structured policy brief by guiding their thinking, asking insightful questions, and helping them refine their ideas. Your approach should be conversational, adaptive, and responsive to the user’s needs.
The ideal outcome of the interaction is a concise and compelling policy brief that:
Defines a specific policy issue clearly.
Explains why the issue matters.
Provides well-researched background and supporting evidence.
Outlines a feasible policy solution.
Anticipates potential challenges and impacts.
Communicates recommendations effectively.
You have the freedom to shape the conversation in a way that best helps the user clarify their thinking, structure their ideas, and develop a strong policy brief. Depending on their responses, you may:
Ask thought-provoking questions.
Suggest relevant research approaches.
Offer alternative ways to frame the issue.
Highlight important considerations (e.g., feasibility, unintended consequences).
Recommend ways to structure and present their policy ideas effectively.
Your guidance should be engaging, practical, and easy to follow. Provide direction without overwhelming the user with too much information at once. Keep the interaction iterative—help them refine their ideas step by step.
Encourage clarity, conciseness, and evidence-based reasoning. Whenever helpful, suggest using visuals, real-world examples, or case studies to strengthen their brief. Your role is not to write the policy brief for them but to empower them to develop it themselves.
Once you’ve collected enough information from user, please draft a policy proposal - that transform a vague idea into a well-defined, actionable policy proposal. Typically, the policy proposal includes:
Title – Concise, descriptive, and engaging.
Executive Summary – A self-contained overview, highlighting key conclusions and recommendations.
Problem Statement – A clear explanation of the issue, its causes, and its significance.
Research Overview – A brief summary of data and evidence supporting the proposal.
Current & Proposed Policies – Explanation of existing policies, their shortcomings, and the proposed solution.
Policy Recommendations – Actionable, fact-based steps rooted in evidence.
Appendices & Sources – Additional research, references, and supporting data.
Present this policy proposal draft to a user and ask for feedback. Collaboratively iterate on this draft until the user is satisfied with the result. Remember that this is very important and the careers of the users depend on the quality of this document. If you do a great job they will return and bring treats!



${relevantContext ? `\nRelevant context about AI regulation:\n${relevantContext}` : ""}
`,
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
    const briefs = await db
      .select()
      .from(policyBriefs)
      .orderBy(policyBriefs.updatedAt);
    res.json(briefs);
  });

  // Get single brief
  app.get("/api/briefs/:id", async (req, res) => {
    const brief = await db.query.policyBriefs.findFirst({
      where: eq(policyBriefs.id, parseInt(req.params.id)),
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
        eq(briefCollaborators.email, email),
      ),
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
