const { WebSocket } = require('ws');

describe('BUCH_CHAT Delegation Mechanism', () => {
  let socket;
  const JIMBO_HUB_WS = 'ws://localhost:4224/ws';

  beforeEach((done) => {
    socket = new WebSocket(JIMBO_HUB_WS);
    socket.on('open', () => done());
  });

  afterEach(() => {
    if (socket) socket.close();
  });

  test('should detect Goose delegation pattern', () => {
    const testCases = [
      '⚡ Wyślij do Goose: Analiza pliku test.ts',
      'Sprawdź ⚡ Wyślij do Goose: Refaktoryzacja kodu',
      'Zadanie: ⚡ Wyślij do Goose: Generowanie raportu'
    ];

    testCases.forEach(message => {
      const match = message.match(/⚡\s*(?:Wyślij do Goose[:\s]+)?(.+?)(?:\n|$)/i);
      expect(match).toBeTruthy();
      expect(match[1]).toBeTruthy();
    });
  });

  test('should send task to Goose via WebSocket', (done) => {
    const testTask = {
      instruction: '⚡ Wyślij do Goose: Analiza pliku main.ts',
      priority: 'high'
    };

    socket.send(JSON.stringify({
      type: 'task_dispatch',
      data: testTask
    }));

    socket.on('message', (data) => {
      const response = JSON.parse(data);
      
      expect(response.type).toBe('task_received');
      expect(response.taskId).toBeDefined();
      done();
    });
  });

  test('should handle reflexion scoring', (done) => {
    const mockResult = {
      verdict: 'success',
      score: 0.85,
      reflection: 'Zadanie wykonane poprawnie',
      improvements: []
    };

    socket.send(JSON.stringify({
      type: 'task_result',
      data: mockResult
    }));

    socket.on('message', (data) => {
      const response = JSON.parse(data);
      
      expect(response.type).toBe('reflexion_scored');
      expect(response.score).toBeGreaterThan(0.6);
      done();
    });
  });
});