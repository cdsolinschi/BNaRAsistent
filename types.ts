
export enum Role {
  User = 'user',
  Model = 'model',
}

export interface Source {
  uri: string;
  title: string;
}

export interface ChatMessage {
  id: string;
  role: Role;
  text: string;
  sources: Source[];
}
