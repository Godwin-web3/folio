import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  addressFiles: defineTable({
    userId: v.string(),
    demoKey: v.optional(v.string()),
    street: v.string(),
    unit: v.string(),
    city: v.string(),
    state: v.string(),
    zip: v.string(),
    jurisdiction: v.string(),
    status: v.string(),
    caseInbox: v.string(),
    mailInboxId: v.optional(v.string()),
    mailProvider: v.string(),
  })
    .index("by_user", ["userId"])
    .index("by_inbox", ["caseInbox"])
    .index("by_mail_inbox", ["mailInboxId"])
    .index("by_user_demo", ["userId", "demoKey"]),

  fileMembers: defineTable({
    fileId: v.id("addressFiles"),
    userId: v.string(),
    role: v.string(),
  }).index("by_file", ["fileId"]).index("by_user", ["userId"]),

  parties: defineTable({
    fileId: v.id("addressFiles"),
    userId: v.string(),
    kind: v.string(),
    name: v.string(),
    email: v.string(),
    org: v.string(),
  }).index("by_file", ["fileId"]),

  notices: defineTable({
    fileId: v.id("addressFiles"),
    userId: v.string(),
    noticeType: v.string(),
    servedOn: v.optional(v.string()),
    deadlineOn: v.optional(v.string()),
    plaintiff: v.string(),
    amountCents: v.optional(v.number()),
    reason: v.string(),
    rawText: v.string(),
    source: v.string(),
  }).index("by_file", ["fileId"]),

  records: defineTable({
    fileId: v.id("addressFiles"),
    userId: v.string(),
    agency: v.string(),
    kind: v.string(),
    title: v.string(),
    url: v.string(),
    extracted: v.string(),
    rawExcerpt: v.string(),
    status: v.string(),
  }).index("by_file", ["fileId"]),

  issues: defineTable({
    fileId: v.id("addressFiles"),
    userId: v.string(),
    kind: v.string(),
    title: v.string(),
    detail: v.string(),
    status: v.string(),
    openedOn: v.optional(v.string()),
  }).index("by_file", ["fileId"]),

  claims: defineTable({
    fileId: v.id("addressFiles"),
    userId: v.string(),
    kind: v.string(),
    amountCents: v.optional(v.number()),
    description: v.string(),
    statute: v.string(),
    status: v.string(),
    promisedOn: v.optional(v.string()),
    dueOn: v.optional(v.string()),
  }).index("by_file", ["fileId"]),

  messages: defineTable({
    fileId: v.id("addressFiles"),
    userId: v.string(),
    direction: v.string(),
    toEmail: v.string(),
    fromEmail: v.string(),
    subject: v.string(),
    body: v.string(),
    classification: v.string(),
    status: v.string(),
    relatedClaimId: v.optional(v.string()),
    providerId: v.optional(v.string()),
    sentAt: v.optional(v.number()),
  }).index("by_file", ["fileId"]),

  exhibits: defineTable({
    fileId: v.id("addressFiles"),
    userId: v.string(),
    label: v.string(),
    title: v.string(),
    kind: v.string(),
    sourceTable: v.string(),
    sourceId: v.string(),
    body: v.string(),
  }).index("by_file", ["fileId"]),

  deadlines: defineTable({
    fileId: v.id("addressFiles"),
    userId: v.string(),
    kind: v.string(),
    title: v.string(),
    dueOn: v.string(),
    completedAt: v.optional(v.number()),
  }).index("by_file", ["fileId"]),

  timelineEvents: defineTable({
    fileId: v.id("addressFiles"),
    userId: v.string(),
    kind: v.string(),
    title: v.string(),
    detail: v.string(),
  }).index("by_file", ["fileId"]),
});
