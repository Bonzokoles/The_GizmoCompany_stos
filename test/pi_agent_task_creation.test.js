const fs = require('fs');
const path = require('path');

describe('Pi Agent Task Creation', () => {
  const JIMBOKIT_COMMS = 'U:\\WWW_Zen_BRo_wser_org3\\JIMBOKIT_COMMS';

  test('should create valid task file', () => {
    // Symulacja utworzenia zadania przez Pi Agent
    const taskName = `pi_task_${Date.now()}.task.json`;
    const taskPath = path.join(JIMBOKIT_COMMS, taskName);
    
    const taskContent = {
      id: `test-${Date.now()}`,
      type: 'code_analysis',
      payload: {
        file: 'test.ts',
        lines: '1-50'
      },
      priority: 'high',
      timestamp: Date.now()
    };

    // Zapis pliku
    fs.writeFileSync(taskPath, JSON.stringify(taskContent, null, 2));

    // Weryfikacje
    expect(fs.existsSync(taskPath)).toBeTruthy();
    
    const savedTask = JSON.parse(fs.readFileSync(taskPath, 'utf8'));
    expect(savedTask.id).toBeDefined();
    expect(savedTask.type).toBe('code_analysis');
    expect(savedTask.priority).toBe('high');
  });

  test('should not create task in forbidden paths', () => {
    const forbiddenPaths = [
      'U:\\WWW_Zen_BRo_wser_org3\\JIMBO_agent_HUB',
      'U:\\WWW_Zen_BRo_wser_org3\\src'
    ];

    forbiddenPaths.forEach(forbiddenPath => {
      expect(() => {
        const taskPath = path.join(forbiddenPath, `test_task_${Date.now()}.task.json`);
        fs.writeFileSync(taskPath, '{}');
      }).toThrow();
    });
  });
});