import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const policyBriefs = pgTable("policy_briefs", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  executiveSummary: text("executive_summary").notNull(),
  background: text("background").notNull(),
  policyOptions: text("policy_options").notNull(),
  recommendations: text("recommendations").notNull(),
  implementation: text("implementation").notNull(),
  status: text("status").notNull().default("draft"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const briefCollaborators = pgTable("brief_collaborators", {
  id: serial("id").primaryKey(),
  briefId: integer("brief_id").notNull().references(() => policyBriefs.id),
  email: text("email").notNull(),
  accessLevel: text("access_level").notNull().default("viewer"), // viewer or editor
  createdAt: timestamp("created_at").defaultNow(),
});

export const briefComments = pgTable("brief_comments", {
  id: serial("id").primaryKey(),
  briefId: integer("brief_id").notNull().references(() => policyBriefs.id),
  email: text("email").notNull(),
  content: text("content").notNull(),
  section: text("section").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertBriefSchema = createInsertSchema(policyBriefs);
export const selectBriefSchema = createSelectSchema(policyBriefs);
export type PolicyBrief = typeof policyBriefs.$inferSelect;
export type NewPolicyBrief = typeof policyBriefs.$inferInsert;

export const insertCollaboratorSchema = createInsertSchema(briefCollaborators);
export const selectCollaboratorSchema = createSelectSchema(briefCollaborators);
export type BriefCollaborator = typeof briefCollaborators.$inferSelect;

export const insertCommentSchema = createInsertSchema(briefComments);
export const selectCommentSchema = createSelectSchema(briefComments);
export type BriefComment = typeof briefComments.$inferSelect;