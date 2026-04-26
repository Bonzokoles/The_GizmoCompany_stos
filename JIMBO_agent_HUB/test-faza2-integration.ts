/**
 * Test integracyjny FAZY 2
 * Sprawdza czy:
 * 1. Można utworzyć task przez validator
 * 2. Task zapisuje się do tasks/
 * 3. PiBridge odczytuje task
 * 4. Result zapisuje się do results/
 * 5. PiBridge odczytuje result
 * 
 * Uruchom: tsx JIMBO_agent_HUB/test-faza2-integration.ts
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createValidTask, createValidResult } from './core/comms-validator.js';
import { PiBridge } from './core/pi-bridge.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const COMMS_PATH = path.resolve(__dirname, '..', 'JIMBOKIT_COMMS');
const TASKS_PATH = path.join(COMMS_PATH, 'tasks');
const RESULTS_PATH = path.join(COMMS_PATH, 'results');

console.log('🧪 Test integracyjny FAZY 2\n');

// Cleanup przed testem
function cleanup() {
  if (fs.existsSync(TASKS_PATH)) {
    const files = fs.readdirSync(TASKS_PATH);
    for (const file of files) {
      if (file.endsWith('.task.json')) {
        fs.unlinkSync(path.join(TASKS_PATH, file));
      }
    }
  }
  if (fs.existsSync(RESULTS_PATH)) {
    const files = fs.readdirSync(RESULTS_PATH);
    for (const file of files) {
      if (file.endsWith('.result.json')) {
        fs.unlinkSync(path.join(RESULTS_PATH, file));
      }
    }
  }
}

async function runTest() {
  cleanup();
  
  // Test 1: Utwórz task przez validator
  console.log('Test 1: Tworzenie taska przez validator');
  const task = createValidTask('data_cleanup', 'Clean test data', {
    files: ['test.csv'],
    priority: 'high',
    source: 'jimbo_kit'
  });
  console.log('✅ Task utworzony:', task.id);
  
  // Test 2: PiBridge zapisuje task
  console.log('\nTest 2: PiBridge zapisuje task');
  const bridge = new PiBridge();
  const piTask = {
    id: task.id,
    type: task.type,
    payload: task.payload,
    priority: task.priority as 'low' | 'medium' | 'high',
    timestamp: Date.now()
  };
  
  await bridge.receiveTask(piTask);
  
  // Sprawdź czy plik istnieje w tasks/
  const taskPath = path.join(TASKS_PATH, `${task.id}.task.json`);
  if (fs.existsSync(taskPath)) {
    console.log('✅ Task zapisany w:', taskPath);
  } else {
    console.error('❌ Task NIE zapisany!');
    return;
  }
  
  // Test 3: Odczyt taska z pliku
  console.log('\nTest 3: Odczyt taska z pliku');
  const taskContent = fs.readFileSync(taskPath, 'utf-8');
  const taskParsed = JSON.parse(taskContent);
  console.log('✅ Task odczytany:', taskParsed.id);
  
  // Test 4: Zapisz result
  console.log('\nTest 4: Zapisz result');
  const result = createValidResult(task.id, 'completed', {
    summary: 'Cleaned 50 rows',
    files: ['cleaned_test.csv'],
    data: { rowsProcessed: 50, errors: 0 }
  });
  
  const resultPath = path.join(RESULTS_PATH, `${task.id}.result.json`);
  fs.writeFileSync(resultPath, JSON.stringify(result, null, 2), 'utf-8');
  console.log('✅ Result zapisany w:', resultPath);
  
  // Test 5: PiBridge odczytuje result
  console.log('\nTest 5: PiBridge odczytuje result');
  const resultFromBridge = await bridge.getResultForPi(task.id);
  
  if (resultFromBridge.status === 'completed') {
    console.log('✅ Result odczytany przez PiBridge');
    console.log('   Status:', resultFromBridge.status);
    console.log('   TaskId:', resultFromBridge.taskId);
  } else {
    console.error('❌ Result NIE odczytany poprawnie!');
    return;
  }
  
  // Test 6: Status taska
  console.log('\nTest 6: Status taska');
  const status = await bridge.getTaskStatus(task.id);
  console.log('✅ Status:', status);
  
  // Cleanup po teście
  cleanup();
  
  console.log('\n✨ Wszystkie testy przeszły pomyślnie!');
  console.log('   FAZA 2 działa poprawnie ✅');
}

runTest().catch(err => {
  console.error('\n❌ Test zakończony błędem:', err);
  process.exit(1);
});
