
export interface Tab {
  id: string;
  url: string;
  title: string;
  favIconUrl?: string;
  lastAccessed?: number;
  groupId?: string;
}

export interface TabGroup {
  id: string;
  name: string;
  description: string;
  color: string;
  tabIds: string[];
}

export interface AIResult {
  groups: {
    name: string;
    description: string;
    color: string;
    tabIndices: number[];
  }[];
}
