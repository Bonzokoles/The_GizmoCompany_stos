/**
 * JIMBOKIT_COMMS Validator
 * 
 * Waliduje struktury task.json i result.json zgodnie ze schematami
 * Używany przez HUB przed zapisem/odczytem z JIMBOKIT_COMMS
 */

import taskSchema from '../../JIMBOKIT_COMMS/schemas/task.schema.json';
import resultSchema from '../../JIMBOKIT_COMMS/schemas/result.schema.json';
import Ajv, { ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

// Kompilacja schematów
const validateTask: ValidateFunction = ajv.compile(taskSchema);
const validateResult: ValidateFunction = ajv.compile(resultSchema);

export interface CommsTask {
  id: string;
  type: 'data_cleanup' | 'data_analysis' | 'document_processing' | 'file_conversion' | 
        'data_validation' | 'batch_processing' | 'custom';
  source: 'jimbo_kit' | 'agent_pi' | 'buch_chat' | 'ui';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  payload: {
    instruction: string;
    files?: string[];
    context?: string;
    outputFormat?: 'json' | 'csv' | 'txt' | 'markdown' | 'auto';
    metadata?: Record<string, any>;
  };
  timestamp: string;
  timeout?: number;
}

export interface CommsResult {
  taskId: string;
  status: 'completed' | 'failed' | 'processing' | 'cancelled' | 'timeout';
  result?: {
    summary?: string;
    files?: string[];
    data?: any;
    metadata?: Record<string, any>;
  };
  error?: {
    code?: string;
    message: string;
    stack?: string;
  };
  timestamp: string;
  duration?: number;
}

export interface ValidationError {
  valid: false;
  errors: Array<{
    path: string;
    message: string;
  }>;
}

export interface ValidationSuccess {
  valid: true;
}

export type ValidationResult = ValidationSuccess | ValidationError;

/**
 * Waliduje obiekt task zgodnie ze schematem task.schema.json
 */
export function validateTaskObject(task: unknown): ValidationResult {
  const valid = validateTask(task);
  
  if (!valid) {
    return {
      valid: false,
      errors: (validateTask.errors || []).map(err => ({
        path: err.instancePath || err.schemaPath,
        message: err.message || 'Validation error'
      }))
    };
  }
  
  return { valid: true };
}

/**
 * Waliduje obiekt result zgodnie ze schematem result.schema.json
 */
export function validateResultObject(result: unknown): ValidationResult {
  const valid = validateResult(result);
  
  if (!valid) {
    return {
      valid: false,
      errors: (validateResult.errors || []).map(err => ({
        path: err.instancePath || err.schemaPath,
        message: err.message || 'Validation error'
      }))
    };
  }
  
  return { valid: true };
}

/**
 * Helper: tworzy nowy task z walidacją
 */
export function createValidTask(
  type: CommsTask['type'],
  instruction: string,
  options?: Partial<Omit<CommsTask, 'id' | 'type' | 'timestamp' | 'payload'>> & {
    files?: string[];
    context?: string;
    outputFormat?: CommsTask['payload']['outputFormat'];
    metadata?: Record<string, any>;
  }
): CommsTask {
  const task: CommsTask = {
    id: crypto.randomUUID(),
    type,
    source: options?.source || 'jimbo_kit',
    priority: options?.priority || 'medium',
    payload: {
      instruction,
      files: options?.files,
      context: options?.context,
      outputFormat: options?.outputFormat,
      metadata: options?.metadata
    },
    timestamp: new Date().toISOString(),
    timeout: options?.timeout
  };
  
  const validation = validateTaskObject(task);
  if (!validation.valid) {
    throw new Error(`Invalid task: ${JSON.stringify(validation.errors)}`);
  }
  
  return task;
}

/**
 * Helper: tworzy result z walidacją
 */
export function createValidResult(
  taskId: string,
  status: CommsResult['status'],
  data?: CommsResult['result'] | CommsResult['error']
): CommsResult {
  const result: CommsResult = {
    taskId,
    status,
    timestamp: new Date().toISOString()
  };
  
  if (status === 'completed' && data) {
    result.result = data as CommsResult['result'];
  } else if (status === 'failed' && data) {
    result.error = data as CommsResult['error'];
  }
  
  const validation = validateResultObject(result);
  if (!validation.valid) {
    throw new Error(`Invalid result: ${JSON.stringify(validation.errors)}`);
  }
  
  return result;
}

/**
 * Pretty print validation errors
 */
export function formatValidationErrors(validation: ValidationError): string {
  return validation.errors
    .map(err => `  - ${err.path}: ${err.message}`)
    .join('\n');
}
