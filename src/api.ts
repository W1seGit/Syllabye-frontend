import type { ClassSummary, ClassSyllabus, EventItem, AuthResponse, UserProfile } from './types';

const API_BASE_URL = 'https://api.wise.rip/v1';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface RequestOptions {
  method?: HttpMethod;
  token?: string | null;
  body?: any;
  headers?: Record<string, string>;
  responseType?: 'json' | 'text';
}

async function apiRequest<T = any>(
  path: string,
  { method = 'GET', token, body, headers = {}, responseType = 'json' }: RequestOptions = {},
): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const requestHeaders: Record<string, string> = {
    Accept: responseType === 'text' ? 'text/plain' : 'application/json',
    ...headers,
  };

  let requestBody: BodyInit | undefined;
  if (body instanceof FormData) {
    requestBody = body as BodyInit;
    delete requestHeaders['Content-Type'];
  } else if (body instanceof URLSearchParams) {
    requestBody = body.toString();
    requestHeaders['Content-Type'] = 'application/x-www-form-urlencoded';
  } else if (typeof body === 'string') {
    requestBody = body;
  } else if (body !== undefined && body !== null) {
    requestBody = JSON.stringify(body);
    requestHeaders['Content-Type'] = 'application/json';
  }

  if (token) {
    requestHeaders.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method,
    headers: requestHeaders,
    body: requestBody,
  });

  if (!response.ok) {
    let detail: string = 'Something went wrong.';
    try {
      const errorPayload = await response.json();
      const rawDetail = errorPayload?.detail ?? errorPayload;
      detail =
        typeof rawDetail === 'string'
          ? rawDetail
          : JSON.stringify(rawDetail, null, 2) || detail;
    } catch {
      try {
        detail = await response.text();
      } catch {
        // ignore
      }
    }
    throw new Error(detail);
  }

  if (responseType === 'text') {
    return (await response.text()) as T;
  }

  if (response.status === 204) {
    return {} as T;
  }

  return (await response.json()) as T;
}

export async function registerUser(username: string, password: string) {
  return apiRequest<UserProfile>('/auth/register', {
    method: 'POST',
    body: { username, password },
  });
}

export async function loginUser(username: string, password: string) {
  const formData = new URLSearchParams();
  formData.append('username', username);
  formData.append('password', password);
  formData.append('grant_type', 'password');
  return apiRequest<AuthResponse>('/auth/login', {
    method: 'POST',
    body: formData,
  });
}

export async function fetchClasses(token: string) {
  return apiRequest<ClassSummary[]>('/classes', { token });
}

export async function createClass(token: string, name: string) {
  return apiRequest<ClassSummary>('/classes', {
    method: 'POST',
    token,
    body: { name },
  });
}

export async function renameClass(token: string, classId: number, name: string) {
  return apiRequest<ClassSummary>(`/classes/${classId}`, {
    method: 'PATCH',
    token,
    body: { name },
  });
}

export async function deleteClass(token: string, classId: number) {
  return apiRequest<void>(`/classes/${classId}`, {
    method: 'DELETE',
    token,
  });
}

export async function getClassSyllabus(token: string, classId: number) {
  return apiRequest<ClassSyllabus>(`/classes/${classId}/syllabus`, {
    token,
  });
}

export async function updateSyllabusText(token: string, classId: number, text: string) {
  return apiRequest<ClassSyllabus>(`/classes/${classId}/syllabus/text`, {
    method: 'PUT',
    token,
    body: { text },
  });
}

export async function uploadSyllabusPdf(
  token: string,
  classId: number,
  fileUri: string,
  fileName: string,
  mimeType = 'application/pdf',
) {
  const data = new FormData();
  data.append('file', {
    uri: fileUri,
    name: fileName,
    type: mimeType,
  } as any);
  return apiRequest<ClassSyllabus>(`/classes/${classId}/syllabus/pdf`, {
    method: 'POST',
    token,
    body: data,
  });
}

export async function deleteSyllabusPdf(token: string, classId: number) {
  return apiRequest<ClassSyllabus>(`/classes/${classId}/syllabus/pdf`, {
    method: 'DELETE',
    token,
  });
}

export async function uploadSyllabusImages(
  token: string,
  classId: number,
  files: Array<{ uri: string; name: string; type: string }>,
) {
  const data = new FormData();
  files.forEach((file) => {
    data.append('files', {
      uri: file.uri,
      name: file.name,
      type: file.type,
    } as any);
  });
  return apiRequest<ClassSyllabus>(`/classes/${classId}/syllabus/images`, {
    method: 'POST',
    token,
    body: data,
  });
}

export async function deleteSyllabusImage(token: string, classId: number, imageId: number) {
  return apiRequest<ClassSyllabus>(`/classes/${classId}/syllabus/images/${imageId}`, {
    method: 'DELETE',
    token,
  });
}

export async function listEvents(token: string, date?: string) {
  const query = date ? `?date_filter=${encodeURIComponent(date)}` : '';
  return apiRequest<EventItem[]>(`/events${query}`, { token });
}

export async function createEvent(token: string, payload: Partial<EventItem>) {
  return apiRequest<EventItem>('/events', {
    method: 'POST',
    token,
    body: payload,
  });
}

export async function updateEvent(token: string, eventId: number, payload: Partial<EventItem>) {
  return apiRequest<EventItem>(`/events/${eventId}`, {
    method: 'PATCH',
    token,
    body: payload,
  });
}

export async function deleteEvent(token: string, eventId: number) {
  return apiRequest(`/events/${eventId}`, {
    method: 'DELETE',
    token,
  });
}

export interface ChatStreamResult {
  fullText: string;
  conversationUuid: string | null;
}

export interface ToolEvent {
  type: 'tool';
  phase: 'start' | 'end';
  tool_name: string;
  args?: unknown;
  result?: unknown;
}

interface StreamChatOptions {
  token: string;
  message: string;
  conversationUuid?: string | null;
  onChunk?: (chunk: string) => void;
  onToolEvent?: (event: ToolEvent) => void;
  signal?: AbortSignal;
}

export async function streamChatMessage({
  token,
  message,
  conversationUuid,
  onChunk,
  signal,
}: StreamChatOptions): Promise<ChatStreamResult> {
  const response = await fetch(`${API_BASE_URL}/chat`, {
    method: 'POST',
    headers: {
      Accept: 'text/plain',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      message,
      conversation_uuid: conversationUuid || undefined,
    }),
    signal,
  });

  if (!response.ok) {
    let detail = 'Unable to chat right now.';
    try {
      const payload = await response.json();
      detail = payload?.detail || detail;
    } catch {
      // ignore
    }
    throw new Error(detail);
  }

  const headerConversation = response.headers.get('X-Conversation-UUID');
  let full = '';

  const reader = (response.body as any)?.getReader?.();
  if (reader) {
    const decoder = typeof TextDecoder !== 'undefined' ? new TextDecoder('utf-8') : null;
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      let chunk = '';
      if (decoder) {
        chunk = decoder.decode(value, { stream: true });
      } else if (value) {
        chunk = Array.from(value as Uint8Array)
          .map((c) => String.fromCharCode(c))
          .join('');
      }
      full += chunk;
      onChunk?.(chunk);
    }
  } else {
    const text = await response.text();
    full = text;
    onChunk?.(text);
  }

  return {
    fullText: full,
    conversationUuid: headerConversation || conversationUuid || null,
  };
}

export async function streamChatMessageWs({
  token,
  message,
  conversationUuid,
  onChunk,
  onToolEvent,
}: StreamChatOptions): Promise<ChatStreamResult> {
  const wsBase = API_BASE_URL.replace(/^http/, 'ws');
  const url = `${wsBase}/chat/ws?token=${encodeURIComponent(token)}${
    conversationUuid ? `&conversation_uuid=${encodeURIComponent(conversationUuid)}` : ''
  }`;

  return new Promise<ChatStreamResult>((resolve, reject) => {
    let full = '';
    let convUuid: string | null = conversationUuid || null;

    const openTools = new Set<string>();

    let ws: WebSocket;
    try {
      ws = new WebSocket(url);
    } catch (err) {
      reject(err);
      return;
    }

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          message,
          conversation_uuid: conversationUuid || null,
        }),
      );
    };

    ws.onmessage = (event) => {
      const data = event.data;
      if (!data) {
        return;
      }
      if (typeof data === 'string') {
        try {
          const parsed = JSON.parse(data);
          if (parsed && parsed.type === 'meta' && typeof parsed.conversation_uuid === 'string') {
            convUuid = parsed.conversation_uuid;
            return;
          }
          if (parsed && parsed.type === 'done') {
            ws.close();
            return;
          }
          if (parsed && parsed.type === 'tool' && (parsed.phase === 'start' || parsed.phase === 'end')) {
            if (parsed.phase === 'start' && typeof parsed.tool_name === 'string') {
              openTools.add(parsed.tool_name);
            } else if (parsed.phase === 'end' && typeof parsed.tool_name === 'string') {
              openTools.delete(parsed.tool_name);
            }
            onToolEvent?.(parsed as ToolEvent);
            return;
          }
        } catch {
          full += data;
          onChunk?.(data);
          return;
        }
      }
    };

    ws.onerror = (event) => {
      reject(new Error('WebSocket error'));
      try {
        ws.close();
      } catch {
      }
    };

    ws.onclose = () => {
      if (openTools.size && onToolEvent) {
        for (const name of openTools) {
          onToolEvent({
            type: 'tool',
            phase: 'end',
            tool_name: name,
            result: 'Done',
          });
        }
        openTools.clear();
      }
      resolve({
        fullText: full,
        conversationUuid: convUuid,
      });
    };
  });
}
