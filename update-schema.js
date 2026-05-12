const fs = require('fs');
const content = fs.readFileSync('convex/schema.ts', 'utf8');

const target1 = `    notifiedAt: v.optional(v.union(v.number(), v.null())),`;
const replace1 = `    notifiedAt: v.optional(v.union(v.number(), v.null())),
    scheduledFunctionId: v.optional(v.id("_scheduled_functions")),`;

const target2 = `    .index("by_workspaceId_status_remindAt", ["workspaceId", "status", "remindAt"]),
});`;
const replace2 = `    .index("by_workspaceId_status_remindAt", ["workspaceId", "status", "remindAt"]),

  pushSubscriptions: defineTable({
    userId: v.string(),
    endpoint: v.string(),
    p256dh: v.string(),
    auth: v.string(),
    createdAt: v.number(),
  }).index("by_userId", ["userId"]),
});`;

let updated = content.replace(target1, replace1);
updated = updated.replace(target2, replace2);

fs.writeFileSync('convex/schema.ts', updated);
console.log('Schema updated successfully!');
