import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
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

export const insertBriefSchema = createInsertSchema(policyBriefs);
export const selectBriefSchema = createSelectSchema(policyBriefs);
export type PolicyBrief = typeof policyBriefs.$inferSelect;
export type NewPolicyBrief = typeof policyBriefs.$inferInsert;
