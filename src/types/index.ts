export type TobuStatus = 'pending' | 'approved' | 'rejected';

export interface Tobu {
  id: string;
  winner_name: string;
  story: string;
  /** Curated witty one-liner shown under the story in the speech bubble.
   *  Curator-only — BarnSubmit never collects it. */
  commentary?: string;
  /** @deprecated Photo feature removed (prd-bubble-font-reactions US-004).
   *  Kept so legacy documents that carry it still typecheck; never written
   *  or rendered anymore. */
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
