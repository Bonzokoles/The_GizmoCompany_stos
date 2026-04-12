import dotenv from 'dotenv';
dotenv.config({ override: true });
const k = process.env.OPENROUTER_API_KEY;
console.log('len:', k?.length);
console.log('starts:', k?.substring(0, 12));
console.log('ends:', k?.substring(k.length - 5));
console.log('has_quotes:', k?.includes('"') || k?.includes("'"));
console.log('has_spaces:', k !== k?.trim());
console.log('RAW_REPR:', JSON.stringify(k));

// Test actual API call like Hub does
import OpenAI from 'openai';
const client = new OpenAI({
  apiKey: k,
  baseURL: 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    'HTTP-Referer': 'http://localhost:4222',
    'X-Title': 'JIMBO-agent-hub',
  },
});

try {
  const res = await client.chat.completions.create({
    model: 'google/gemini-2.0-flash-001',
    messages: [{ role: 'user', content: 'powiedz hej' }],
  });
  console.log('SUCCESS:', res.choices[0]?.message?.content);
} catch (e) {
  console.log('ERROR:', e.message);
  console.log('STATUS:', e.status);
}
