/**
 * Local authentication system for offline Electron app.
 * Supports account creation with password hashing for security.
 */

import { loadSettings, updateSetting } from "@/lib/settings/settings-manager";
import { db } from "@/lib/db/sqlite-client";
import { users } from "@/lib/db/sqlite-schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

export interface LocalUser {
  id: string;
  email: string;
}

let currentUser: LocalUser | null = null;

// Cookie name for session storage
export const SESSION_COOKIE_NAME = "zlutty-session";

/**
 * Create a new local user with password
 */
export async function createLocalUser(
  email: string,
  password: string
): Promise<LocalUser> {
  // Check if email already exists
  const existingUser = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (existingUser) {
    throw new Error("Email already registered");
  }

  const id = `user-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const passwordHash = await bcrypt.hash(password, 12);

  const [newUser] = await db
    .insert(users)
    .values({
      id,
      email,
      passwordHash,
    })
    .returning();

  // Update settings with new user info
  updateSetting("localUserId", id);
  updateSetting("localUserEmail", email);

  currentUser = { id: newUser.id, email: newUser.email };
  return currentUser;
}

/**
 * Authenticate a user with email and password
 */
export async function authenticateUser(
  email: string,
  password: string
): Promise<LocalUser | null> {
  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (!user) {
    return null;
  }

  // If user has no password hash (legacy user), allow any password for first login
  // and prompt them to set one
  if (!user.passwordHash) {
    // For legacy users without password, set the password on first login
    const passwordHash = await bcrypt.hash(password, 12);
    await db
      .update(users)
      .set({ passwordHash })
      .where(eq(users.id, user.id));

    currentUser = { id: user.id, email: user.email };
    return currentUser;
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    return null;
  }

  currentUser = { id: user.id, email: user.email };
  return currentUser;
}

/**
 * Get the current local user (creates one if it doesn't exist)
 * Used for backward compatibility with existing code
 */
export async function getLocalUser(): Promise<LocalUser> {
  if (currentUser) {
    return currentUser;
  }

  const settings = loadSettings();

  // Check if user exists in database
  const existingUser = await db.query.users.findFirst({
    where: eq(users.id, settings.localUserId),
  });

  if (existingUser) {
    currentUser = {
      id: existingUser.id,
      email: existingUser.email,
    };
    return currentUser;
  }

  // Create the local user without password (legacy support)
  const [newUser] = await db
    .insert(users)
    .values({
      id: settings.localUserId,
      email: settings.localUserEmail,
    })
    .returning();

  currentUser = {
    id: newUser.id,
    email: newUser.email,
  };

  return currentUser;
}

/**
 * Get user by ID
 */
export async function getUserById(id: string): Promise<LocalUser | null> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, id),
  });

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
  };
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string): Promise<LocalUser | null> {
  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
  };
}

/**
 * Check if any users exist in the database
 */
export async function hasAnyUsers(): Promise<boolean> {
  const user = await db.query.users.findFirst();
  return !!user;
}

/**
 * Update user email
 */
export async function updateUserEmail(email: string): Promise<LocalUser> {
  const user = await getLocalUser();

  await db.update(users).set({ email }).where(eq(users.id, user.id));

  // Update settings too
  updateSetting("localUserEmail", email);

  currentUser = { ...user, email };
  return currentUser;
}

/**
 * Update user password
 */
export async function updateUserPassword(
  userId: string,
  newPassword: string
): Promise<void> {
  const passwordHash = await bcrypt.hash(newPassword, 12);
  await db.update(users).set({ passwordHash }).where(eq(users.id, userId));
}

/**
 * Parse session cookie from request headers
 */
export function parseSessionCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(";").reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split("=");
    acc[key] = value;
    return acc;
  }, {} as Record<string, string>);

  return cookies[SESSION_COOKIE_NAME] || null;
}

/**
 * Check if a user is "authenticated" (for API compatibility)
 * Now checks for valid session cookie
 */
export async function isAuthenticated(
  cookieHeader?: string | null
): Promise<boolean> {
  const sessionId = parseSessionCookie(cookieHeader || null);
  if (!sessionId) return false;

  const user = await getUserById(sessionId);
  return !!user;
}

/**
 * Get current user ID from session (for use in API routes)
 * This replaces the old requireAuth() function
 */
export async function requireAuth(request?: Request): Promise<string> {
  const cookieHeader = request?.headers.get("cookie");
  const sessionId = parseSessionCookie(cookieHeader || null);

  if (!sessionId) {
    throw new Error("Unauthorized");
  }

  const user = await getUserById(sessionId);
  if (!user) {
    throw new Error("Invalid session");
  }

  return user.id;
}

/**
 * Clear cached user (for testing or logout)
 */
export function clearUserCache(): void {
  currentUser = null;
}

/**
 * Initialize the local auth system
 * Should be called on app startup
 */
export async function initializeAuth(): Promise<LocalUser | null> {
  // Check if any users exist
  const hasUsers = await hasAnyUsers();
  if (!hasUsers) {
    return null; // No users, will redirect to signup
  }

  // Try to get user from settings
  const settings = loadSettings();
  const user = await getUserById(settings.localUserId);

  if (user) {
    currentUser = user;
    return user;
  }

  return null;
}
