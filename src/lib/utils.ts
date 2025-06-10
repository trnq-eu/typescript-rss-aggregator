import { feeds, users } from './db/schema'; // Assuming schema.ts is in lib/db/

// Define types based on your Drizzle schema
export type Feed = typeof feeds.$inferSelect;
export type User = typeof users.$inferSelect;

export function printFeed(feed: Feed, user: User): void {
    console.log("\n✅ Feed Added Successfully!");
    console.log("--------------------------");
    console.log(`  🏷️ Name: ${feed.name}`);
    console.log(`  🔗 URL: ${feed.url}`);
    console.log(`  🆔 Feed ID: ${feed.id}`);
    console.log(`  👤 User: ${user.name} (User ID: ${user.id})`); // user.id is the actual ID of the user record
    // feed.user_id is the foreign key in the feed record, which should match user.id
    console.log(`  🕒 Created: ${feed.createdAt.toLocaleString()}`);
    console.log(`  🔄 Updated: ${feed.updatedAt.toLocaleString()}`);
    console.log("--------------------------");
}