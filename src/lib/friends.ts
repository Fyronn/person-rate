import type { Friend } from "@/types/review";

export const DEFAULT_FRIENDS: Friend[] = [
  { id: "friend-1", name: "Ali" },
  { id: "friend-2", name: "Berk" },
  { id: "friend-3", name: "Ceren" },
  { id: "friend-4", name: "Deniz" },
  { id: "friend-5", name: "Ece" },
];

export function getFriendName(friends: Friend[], friendId: string) {
  return friends.find((friend) => friend.id === friendId)?.name ?? "Bilinmeyen";
}
