export interface BookMeta {
  root: string;
  title: string;
  genrePack: string;
}

export interface ChapterSummary {
  id: string;
  title: string;
  path: string;
}

export interface SceneSummary {
  id: string;
  title: string;
  path: string;
  status: string;
  wordCount: number;
}
