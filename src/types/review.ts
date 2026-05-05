export type Friend = {
  id: string;
  name: string;
};

export type Review = {
  id: string;
  authorId: string;
  targetId: string;
  date: string;
  score: number;
  comment: string;
  createdAt: string;
};

export type AppView = "daily" | "mine" | "settings";

export type FriendPasswords = Record<string, string>;

export type Session =
  | {
      role: "admin";
    }
  | {
      role: "friend";
      friendId: string;
    };
