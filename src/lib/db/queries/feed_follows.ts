import { db } from "..";
import { feedFollows, users, feeds } from "../schema";
import { eq, and } from 'drizzle-orm';

export async function createFeedFollow(userId: string, feedId: string) {
    const [newFeedFollow] = await db.insert(feedFollows).values({
        user_id: userId,
        feed_id: feedId,
    }).returning();

    if (!newFeedFollow) {
        throw new Error("Failed to create feed follow record.");
    }

     // Fetch the newly created feed_follow record along with related user and feed names
     const [result] = await db
        .select({
            feed_follow_id: feedFollows.id,
            feed_follow_created_at: feedFollows.created_at,
            feed_follow_updated_at: feedFollows.updated_at,
            user_id: users.id,
            user_name: users.name,
            feed_id: feeds.id,
            feed_name: feeds.name,
            feed_url: feeds.url, 
        })
        .from(feedFollows)
        .innerJoin(users, eq(feedFollows.user_id, users.id))
        .innerJoin(feeds, eq(feedFollows.feed_id, feeds.id))
        .where(eq(feedFollows.id, newFeedFollow.id));

    return result;
}

export async function getFeedFollowsForUser(userId: string) {
    const results = await db
        .select({
            feed_follow_id: feedFollows.id, // Included for completeness, might not be strictly needed for the 'following' command output
            user_name: users.name, // User name (will be the same for all results for a given user_id)
            feed_id: feeds.id,
            feed_name: feeds.name,
            feed_url: feeds.url,
        })
        .from(feedFollows)
        .innerJoin(users, eq(feedFollows.user_id, users.id)) // Technically, user join might be redundant if only feed names are needed for 'following'
        .innerJoin(feeds, eq(feedFollows.feed_id, feeds.id))
        .where(eq(feedFollows.user_id, userId));
    return results;
}
