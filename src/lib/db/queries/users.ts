import { db } from "..";
import { users } from "../schema";
import { eq, and, sql } from 'drizzle-orm';



export async function createUser(name: string) {
  const [result] = await db.insert(users).values({ name: name }).returning();
  return result;
}

export async function getUser(name: string) {
    const [result] = await db.select().from(users).where(eq(users.name, name))
    return result;
}

export async function deleteAllUsers(): Promise<void> {
    const result = await db.delete(users);
}

