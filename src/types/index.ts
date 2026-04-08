export interface Tobu {
  id: string;
  winner_name: string;
  story: string;
  photo_url?: string;
  date: string;
  term: 1 | 2 | 3;
  bull_color_seed: number;
  bull_position: { x: number; z: number };
  reactions: Record<string, string[]>;
  created_at: number;
}

export type ReactionEmoji = '😂' | '❤️' | '🔥' | '👏' | '🐂';
