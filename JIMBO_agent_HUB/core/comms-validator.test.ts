/**
 * Test jednostkowy dla comms-validator
 * Uruchom: tsx core/comms-validator.test.ts
 */

import {
  validateTaskObject,
  validateResultObject,
  createValidTask,
  createValidResult,
  formatValidationErrors,
  type CommsTask,
  type CommsResult
} from './comms-validator.js';

console.log('🧪 Test JIMBOKIT_COMMS Validator\n');

// Test 1: Poprawny task
console.log('Test 1: Poprawny task');
try {
  const task = createValidTask('data_cleanup', 'Clean CSV file', {
    files: ['data.csv'],
    priority: 'high'
  });
  console.log('✅ Task utworzony:', task.id);
} catch (err) {
  console.error('❌ Błąd:', err);
}

// Test 2: Niepoprawny task (brak wymaganego pola)
console.log('\nTest 2: Niepoprawny task (brak instruction)');
const invalidTask = {
  id: 'test-123',
  type: 'data_cleanup',
  source: 'jimbo_kit',
  priority: 'medium',
  payload: {},  // Brak instruction!
  timestamp: new Date().toISOString()
};
const taskValidation = validateTaskObject(invalidTask);
if (!taskValidation.valid) {
  console.log('✅ Walidacja wykryła błąd:');
  console.log(formatValidationErrors(taskValidation));
} else {
  console.error('❌ Walidacja powinna wykryć błąd!');
}

// Test 3: Poprawny result (completed)
console.log('\nTest 3: Poprawny result (completed)');
try {
  const result = createValidResult(crypto.randomUUID(), 'completed', {
    summary: 'Cleaned 100 rows',
    files: ['cleaned_data.csv'],
    data: { rowsProcessed: 100, errors: 0 }
  });
  console.log('✅ Result utworzony:', result.taskId);
} catch (err) {
  console.error('❌ Błąd:', err);
}

// Test 4: Poprawny result (failed)
console.log('\nTest 4: Poprawny result (failed)');
try {
  const result = createValidResult(crypto.randomUUID(), 'failed', {
    message: 'File not found',
    code: 'ENOENT'
  });
  console.log('✅ Result z błędem utworzony:', result.taskId);
} catch (err) {
  console.error('❌ Błąd:', err);
}

// Test 5: Niepoprawny result (brak taskId)
console.log('\nTest 5: Niepoprawny result (brak taskId)');
const invalidResult = {
  status: 'completed',
  timestamp: new Date().toISOString()
  // Brak taskId!
};
const resultValidation = validateResultObject(invalidResult);
if (!resultValidation.valid) {
  console.log('✅ Walidacja wykryła błąd:');
  console.log(formatValidationErrors(resultValidation));
} else {
  console.error('❌ Walidacja powinna wykryć błąd!');
}

// Test 6: Wszystkie typy tasków
console.log('\nTest 6: Wszystkie dozwolone typy tasków');
const taskTypes: CommsTask['type'][] = [
  'data_cleanup',
  'data_analysis',
  'document_processing',
  'file_conversion',
  'data_validation',
  'batch_processing',
  'custom'
];

for (const type of taskTypes) {
  try {
    const task = createValidTask(type, `Test ${type}`);
    console.log(`✅ ${type}: OK`);
  } catch (err) {
    console.error(`❌ ${type}:`, err);
  }
}

// Test 7: Wszystkie statusy results
console.log('\nTest 7: Wszystkie dozwolone statusy results');
const statuses: CommsResult['status'][] = [
  'completed',
  'failed',
  'processing',
  'cancelled',
  'timeout'
];

for (const status of statuses) {
  try {
    const result = createValidResult(crypto.randomUUID(), status);
    console.log(`✅ ${status}: OK`);
  } catch (err) {
    console.error(`❌ ${status}:`, err);
  }
}

console.log('\n✨ Testy zakończone!');
