export type TobuStatus = 'pending' | 'approved' | 'rejected';

export interface Tobu {
  id: string;
  winner_name: string;
  story: string;
  /** Curated witty one-liner shown under the story in the speech bubble.
   *  Curator-only — BarnSubmit never collects it. */
  commentary?: string;
  photo_url?: string;
  date: string;
  term: 1 | 2 | 3;
  bull_pattern_seed: string;
  reactions: Record<string, string[]>;
  status: TobuStatus;
  submitted_by: string;
  created_at: number;
}

export type ReactionEmoji = '😂' | '❤️' | '🔥' | '👏' | '🐂';
