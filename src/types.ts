export interface UserProfile {
  id?: number;
  username: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
}

export interface ClassSummary {
  id: number;
  name: string;
}

export interface SyllabusImage {
  id: number;
  file_path: string;
}

export interface ClassSyllabus {
  id: number;
  class_id: number;
  text?: string | null;
  pdf_path?: string | null;
  images: SyllabusImage[];
}

export interface EventItem {
  id: number;
  title: string;
  due: string;
  location?: string | null;
  description?: string | null;
  assignment_type?: string | null;
  class_name?: string | null;
  status?: string | null;
  priority?: string | null;
}

export interface ChatMessageItem {
  id?: number;
  role: 'user' | 'assistant';
  content: string;
  message_index?: number;
}

export interface ConversationSummary {
  uuid: string;
  name: string;
}
