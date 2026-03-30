// Minimalny backend dla Jimbo_kit (czat + terminal, WebSocket + REST)
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { WebSocketServer } = require('ws');

const PORT = 4111;
const app = express();
app.use(cors());
app.use(bodyParser.json());

// Prosty czat (echo + demo tool_use)
let sessions = {};

app.post('/api/chat', (req, res) => {
  const { message, sessionId } = req.body;
  if (!sessions[sessionId]) sessions[sessionId] = [];
  const reply = {
    role: 'assistant',
    content: `Echo: ${message}`,
    blocks: [{ type: 'text', text: `Echo: ${message}` }],
    createdAt: Date.now(),
  };
  sessions[sessionId].push(reply);
  res.json({ messages: sessions[sessionId] });
});

app.get('/api/chat/sessions', (req, res) => {
  res.json({ sessions: Object.keys(sessions).map(id => ({ id, label: `Sesja ${id}` })) });
});

app.delete('/api/chat/sessions/:id', (req, res) => {
  delete sessions[req.params.id];
  res.json({ ok: true });
});

// Terminal: demo komenda
app.post('/api/webgate/fetch', (req, res) => {
  const { command } = req.body;
  if (command === '/help') {
    res.json({ output: 'Dostępne komendy: /help, /echo <tekst>' });
  } else if (command.startsWith('/echo ')) {
    res.json({ output: command.slice(6) });
  } else {
    res.json({ output: `Nieznana komenda: ${command}` });
  }
});

const server = app.listen(PORT, () => {
  console.log(`Jimbo_kit backend listening on http://127.0.0.1:${PORT}`);
});

// WebSocket: demo echo
const wss = new WebSocketServer({ server, path: '/ws' });
wss.on('connection', ws => {
  ws.on('message', msg => {
    try {
      const data = JSON.parse(msg);
      if (data.type === 'chat:message') {
        ws.send(JSON.stringify({
          type: 'chat:message',
          message: {
            role: 'assistant',
            content: `Echo: ${data.message.content}`,
            blocks: [{ type: 'text', text: `Echo: ${data.message.content}` }],
            createdAt: Date.now(),
          },
        }));
      }
    } catch (e) {}
  });
});
