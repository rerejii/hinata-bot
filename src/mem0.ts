import 'dotenv/config';

const MEM0_API_KEY = process.env['MEM0_API_KEY']!;
const MEM0_BASE_URL = 'https://api.mem0.ai/v1';
const USER_ID = process.env['DISCORD_USER_ID']!;

interface Memory {
  id: string;
  memory: string;
  created_at: string;
}

interface SearchResult {
  results: Array<{
    id: string;
    memory: string;
    score: number;
  }>;
}

interface AddMemoryResponse {
  results: Array<{
    id: string;
    event: string;
    memory: string;
  }>;
}

export async function searchMemories(query: string, limit: number = 5): Promise<string> {
  const response = await fetch(`${MEM0_BASE_URL}/memories/search/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Token ${MEM0_API_KEY}`,
    },
    body: JSON.stringify({
      query,
      user_id: USER_ID,
      limit,
    }),
  });

  if (!response.ok) {
    console.error(`Mem0 search error: ${response.status}`);
    return '';
  }

  const data = (await response.json()) as SearchResult;
  return data.results.map((m) => m.memory).join('\n');
}

export async function getRecentMemories(limit: number = 10): Promise<string> {
  const response = await fetch(`${MEM0_BASE_URL}/memories/?user_id=${USER_ID}&limit=${limit}`, {
    method: 'GET',
    headers: {
      Authorization: `Token ${MEM0_API_KEY}`,
    },
  });

  if (!response.ok) {
    console.error(`Mem0 get error: ${response.status}`);
    return '';
  }

  const data = (await response.json()) as Memory[];
  return data.map((m) => m.memory).join('\n');
}

export async function saveMemory(content: string): Promise<void> {
  const response = await fetch(`${MEM0_BASE_URL}/memories/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Token ${MEM0_API_KEY}`,
    },
    body: JSON.stringify({
      messages: [{ role: 'user', content }],
      user_id: USER_ID,
    }),
  });

  if (!response.ok) {
    console.error(`Mem0 save error: ${response.status}`);
    return;
  }

  const data = (await response.json()) as AddMemoryResponse;
  console.log('Memory saved:', data.results.length, 'entries');
}

let lastConversationTime: Date | null = null;

export function getLastConversationTime(): string {
  if (!lastConversationTime) {
    return 'なし';
  }
  return lastConversationTime.toLocaleString('ja-JP');
}

export function updateLastConversationTime(): void {
  lastConversationTime = new Date();
}
