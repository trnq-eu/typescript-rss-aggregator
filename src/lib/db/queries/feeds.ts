import { db } from "..";
import { feeds, users } from "../schema";
import { eq, and, sql } from 'drizzle-orm';

export async function createFeed(name: string, url: string, userId: string) {
    const [result] = await db.insert(feeds).values({
        name: name, 
        url:url, 
        user_id: userId,
    }).returning();
    return result;
}

export async function getAllFeedsWithUserDetails() {
    const result = await db.select({
        feed_name: feeds.name,
        feed_url: feeds.url,
        user_name: users.name,
    })
    .from(feeds)
    .leftJoin(users, eq(feeds.user_id, users.id));

    return result;
}

export async function getFeedByUrl(url: string) {
    const [result] = await db.select().from(feeds).where(eq(feeds.url, url));
    return result;
}