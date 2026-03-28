export interface InfoItem {
  id: string;
  provider: string;
  category: InfoCategory;
  title: string;
  summary?: string;
  url?: string;
  tags: string[];
  metrics?: Record<string, number>;
  publishedAt?: string;
  fetchedAt: string;
}

export type InfoCategory = 'news' | 'finance' | 'tech' | 'social' | 'life';

export interface InfoProvider {
  id: string;
  category: InfoCategory;
  name: string;
  fetchInterval: number;
  fetch(): Promise<InfoItem[]>;
}

export interface ProviderMeta {
  id: string;
  name: string;
  category: InfoCategory;
  fetchInterval: number;
  lastFetchAt: string | null;
  itemCount: number;
}
