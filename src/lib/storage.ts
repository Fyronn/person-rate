import { DEFAULT_FRIENDS } from "@/lib/friends";
import type { Friend, FriendPasswords, Review, Session } from "@/types/review";

const FRIENDS_KEY = "rate507:friends";
const REVIEWS_KEY = "rate507:reviews";
const ACTIVE_USER_KEY = "rate507:active-user";
const PASSWORDS_KEY = "rate507:passwords";
const SESSION_KEY = "rate507:session";

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const rawValue = window.localStorage.getItem(key);
    return rawValue ? (JSON.parse(rawValue) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
}

export function loadFriends() {
  const friends = readJson<Friend[]>(FRIENDS_KEY, DEFAULT_FRIENDS);
  return friends.length === 5 ? friends : DEFAULT_FRIENDS;
}

export function saveFriends(friends: Friend[]) {
  writeJson(FRIENDS_KEY, friends);
}

export function loadReviews() {
  return readJson<Review[]>(REVIEWS_KEY, []);
}

export function saveReviews(reviews: Review[]) {
  writeJson(REVIEWS_KEY, reviews);
}

export function loadActiveUser() {
  return readJson<string>(ACTIVE_USER_KEY, DEFAULT_FRIENDS[0].id);
}

export function saveActiveUser(friendId: string) {
  writeJson(ACTIVE_USER_KEY, friendId);
}

export function loadPasswords() {
  return readJson<FriendPasswords>(PASSWORDS_KEY, {});
}

export function savePasswords(passwords: FriendPasswords) {
  writeJson(PASSWORDS_KEY, passwords);
}

export function loadSession() {
  return readJson<Session | null>(SESSION_KEY, null);
}

export function saveSession(session: Session) {
  writeJson(SESSION_KEY, session);
}

export function clearSession() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(SESSION_KEY);
}

export function resetLocalData() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(FRIENDS_KEY);
  window.localStorage.removeItem(REVIEWS_KEY);
  window.localStorage.removeItem(ACTIVE_USER_KEY);
  window.localStorage.removeItem(PASSWORDS_KEY);
  window.localStorage.removeItem(SESSION_KEY);
}
