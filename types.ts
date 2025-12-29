
export enum AnalysisTag {
  EXPLANATION = 'Explanation',
  BEGINNER_CONFUSION = 'Beginner_Confusion',
  COMMON_MISTAKE = 'Common_Mistake',
  REPEATED_CLAIM = 'Repeated_Claim',
  OPINION_JUDGMENT = 'Opinion_or_Judgment',
  WARNING_CAVEAT = 'Warning_or_Caveat'
}

export type OutputFormat = 'detailed' | 'bulleted' | 'summary';

export interface TranscriptExcerpt {
  videoId: string;
  creatorName: string;
  text: string;
  tag: AnalysisTag;
}

export interface Pattern {
  theme: string;
  description: string;
  supportingExcerpts: TranscriptExcerpt[];
}

export interface DatasetOverview {
  count: number;
  transcriptSources: string[];
}

export interface AnalysisResult {
  topic: string;
  datasetOverview: DatasetOverview;
  processedVideos: {
    title: string;
    url: string;
    creator: string;
  }[];
  aggregatedThemes: Pattern[];
  commonConfusionPoints: {
    point: string;
    explanationAttempt: string;
    supportingExcerpts: TranscriptExcerpt[];
  }[];
  disagreements: {
    topic: string;
    variations: string;
  }[];
  impliedQuestions: {
    question: string;
    evidence: string;
  }[];
  sources: { uri: string; title: string }[];
}

export interface AppState {
  isSearching: boolean;
  result: AnalysisResult | null;
  error: string | null;
  searchHistory: string[];
}
