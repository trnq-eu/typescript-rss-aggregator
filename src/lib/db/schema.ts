import { pgTable, text, timestamp, uuid, uniqueIndex } from 'drizzle-orm/pg-core';



export const users = pgTable("users", {
    id: uuid("id").primaryKey().defaultRandom().notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
        .notNull()
        .defaultNow()
        .$onUpdate(() => new Date()),
    name: text("name").notNull().unique(),
});

export const feeds = pgTable("feeds", {
    id: uuid("id").primaryKey().defaultRandom().notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
        .notNull()
        .defaultNow()
        .$onUpdate(() => new Date()),
    name: text("name").notNull(),
    url: text("url").notNull().unique(),
    user_id: uuid("user_id").notNull().references(() => users.id, {onDelete: 'cascade'})
}
);

export const feedFollows = pgTable('feed_follows', {
    id: uuid('id').primaryKey().defaultRandom(),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(), // Consider using .onUpdateNow() if your DB supports it or handle updates manually
    user_id: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    feed_id: uuid('feed_id').notNull().references(() => feeds.id, { onDelete: 'cascade' }),

}, (table) => {
    return {
        userFeedUnique: uniqueIndex('user_feed_unique_idx').on(table.user_id, table.feed_id),
    };
}
)