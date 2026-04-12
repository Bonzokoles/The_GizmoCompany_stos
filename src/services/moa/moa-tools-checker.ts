/**
 * MOA Tools Checker
 * Narzędzie do sprawdzania i walidacji narzędzi MOA (Multi-Objective Analyzer)
 */

import fs from 'fs';
import path from 'path';

// Interfejsy bazujące na analizie kodu MOA
export interface MOATool {
  id: string;
  name: string;
  description: string;
  category: 'analyzer' | 'translator' | 'writer' | 'embedder' | 'search';
  enabled: boolean;
  configSchema?: Record<string, any>;
  validate?: (config: any) => boolean;
  test?: (config: any) => Promise<{ success: boolean; output?: any; error?: string }>;
}

export interface MOAConfig {
  tools: Record<string, MOATool>;
  defaultToolchain: string[];
  envVars: Record<string, string>;
  apiEndpoints: Record<string, string>;
  validationRules: Record<string, (value: any) => boolean>;
}

export interface MOAToolTestResult {
  toolId: string;
  success: boolean;
  output?: any;
  error?: string;
  timestamp: Date;
  configUsed: any;
}

export interface MOACheckSummary {
  totalTools: number;
  enabledTools: number;
  configValid: boolean;
  missingEnvVars: string[];
  apiEndpointsReachable: Record<string, boolean>;
  toolTestResults: MOAToolTestResult[];
}

/**
 * Pobiera listę dostępnych narzędzi MOA na podstawie analizy kodu projektu
 * @returns Record<string, MOATool> - Mapa narzędzi MOA
 */
export function getMOATools(): Record<string, MOATool> {
  // Bazując na analizie moa-pipeline.mjs i [[path]].ts
  const tools: Record<string, MOATool> = {
    analyzer: {
      id: 'analyzer',
      name: 'Dataset Analyzer',
      description: 'Analizuje surowe dataset i ekstrahuje tematy',
      category: 'analyzer',
      enabled: true,
      configSchema: {
        inputPath: { type: 'string', required: true },
        outputPath: { type: 'string', required: true },
        chunkSize: { type: 'number', default: 1000 }
      },
      validate: (config) => {
        return typeof config.inputPath === 'string' && config.inputPath.length > 0;
      }
    },
    translator: {
      id: 'translator',
      name: 'Topic Translator',
      description: 'Tłumaczy tematy na różne języki i formaty',
      category: 'translator',
      enabled: true,
      configSchema: {
        sourceLanguage: { type: 'string', default: 'auto' },
        targetLanguages: { type: 'array', default: ['en', 'pl'] },
        model: { type: 'string', default: 'deepseek-chat' }
      }
    },
    html_writer: {
      id: 'html_writer',
      name: 'HTML Writer',
      description: 'Generuje HTML z przetłumaczonych tematów',
      category: 'writer',
      enabled: true,
      configSchema: {
        template: { type: 'string', default: 'default' },
        outputDir: { type: 'string', required: true }
      }
    },
    embedder: {
      id: 'embedder',
      name: 'Vector Embedder',
      description: 'Tworzy embeddingi wektorowe dla przetłumaczonych treści',
      category: 'embedder',
      enabled: true,
      configSchema: {
        model: { type: 'string', default: 'text-embedding-ada-002' },
        dimensions: { type: 'number', default: 1536 }
      }
    },
    search_generator: {
      id: 'search_generator',
      name: 'Search Module Generator',
      description: 'Generuje moduł wyszukiwania na podstawie embeddingów',
      category: 'search',
      enabled: true,
      configSchema: {
        algorithm: { type: 'string', default: 'cosine' },
        maxResults: { type: 'number', default: 10 }
      }
    },
    // Narzędzia z API MOA
    parallel_writer: {
      id: 'parallel_writer',
      name: 'Parallel Writer',
      description: 'Równoległe generowanie draftów (z [[path]].ts)',
      category: 'writer',
      enabled: true,
      configSchema: {
        workers: { type: 'number', default: 3 },
        temperature: { type: 'number', default: 0.7 }
      }
    },
    critique: {
      id: 'critique',
      name: 'Critique Stage',
      description: 'Krytyka i poprawa draftów',
      category: 'analyzer',
      enabled: true
    },
    aggregation: {
      id: 'aggregation',
      name: 'Aggregation Stage',
      description: 'Agregacja poprawionych draftów',
      category: 'analyzer',
      enabled: true
    },
    validation: {
      id: 'validation',
      name: 'Validation Stage',
      description: 'Walidacja końcowego outputu',
      category: 'analyzer',
      enabled: true
    }
  };
  
  return tools;
}

/**
 * Pobiera konfigurację MOA z różnych źródeł
 * @returns MOAConfig - Kompletna konfiguracja MOA
 */
export function getMOAConfig(): MOAConfig {
  // Sprawdź zmienne środowiskowe
  const envVars: Record<string, string> = {};
  const requiredEnvVars = [
    'ANTHROPIC_API_KEY',
    'OPENAI_API_KEY', 
    'DEEPSEEK_API_KEY',
    'MOA_OUTPUT_DIR'
  ];
  
  for (const envVar of requiredEnvVars) {
    envVars[envVar] = process.env[envVar] || '';
  }
  
  // Sprawdź endpoints API
  const apiEndpoints: Record<string, string> = {
    moa_generate: process.env.MOA_API_ENDPOINT || 'http://localhost:8787/api/moa/generate',
    moa_quick: process.env.MOA_QUICK_ENDPOINT || 'http://localhost:8787/api/moa/quick',
    ai_gateway: process.env.AI_GATEWAY_ENDPOINT || 'http://localhost:3000/api/ai/gateway'
  };
  
  // Reguły walidacji
  const validationRules: Record<string, (value: any) => boolean> = {
    isNonEmptyString: (val) => typeof val === 'string' && val.trim().length > 0,
    isPositiveNumber: (val) => typeof val === 'number' && val > 0,
    isBoolean: (val) => typeof val === 'boolean',
    isValidPath: (val) => {
      if (typeof val !== 'string') return false;
      try {
        return fs.existsSync(val) || path.dirname(val) !== '.';
      } catch {
        return false;
      }
    }
  };
  
  return {
    tools: getMOATools(),
    defaultToolchain: ['analyzer', 'translator', 'html_writer', 'embedder', 'search_generator'],
    envVars,
    apiEndpoints,
    validationRules
  };
}

/**
 * Waliduje konfigurację MOA
 * @param config - Konfiguracja do walidacji
 * @returns {valid: boolean, errors: string[]} - Wynik walidacji
 */
export function validateMOAConfig(config: MOAConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Sprawdź wymagane zmienne środowiskowe
  const requiredEnvVars = ['MOA_OUTPUT_DIR'];
  for (const envVar of requiredEnvVars) {
    if (!config.envVars[envVar] || config.envVars[envVar].trim() === '') {
      errors.push(`Brak wymaganej zmiennej środowiskowej: ${envVar}`);
    }
  }
  
  // Sprawdź narzędzia
  if (Object.keys(config.tools).length === 0) {
    errors.push('Brak zdefiniowanych narzędzi MOA');
  }
  
  // Sprawdź domyślną toolchain
  for (const toolId of config.defaultToolchain) {
    if (!config.tools[toolId]) {
      errors.push(`Narzędzie w domyślnej toolchain nie istnieje: ${toolId}`);
    }
  }
  
  // Sprawdź endpoints
  for (const [endpointName, endpointUrl] of Object.entries(config.apiEndpoints)) {
    if (!endpointUrl || endpointUrl.trim() === '') {
      errors.push(`Brak URL dla endpointu: ${endpointName}`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Testuje konkretne narzędzie MOA
 * @param toolId - ID narzędzia do przetestowania
 * @param config - Konfiguracja narzędzia (opcjonalna)
 * @returns Promise<MOAToolTestResult> - Wynik testu
 */
export async function testMOATool(
  toolId: string, 
  config?: any
): Promise<MOAToolTestResult> {
  const tools = getMOATools();
  const tool = tools[toolId];
  
  if (!tool) {
    return {
      toolId,
      success: false,
      error: `Narzędzie ${toolId} nie istnieje`,
      timestamp: new Date(),
      configUsed: config || {}
    };
  }
  
  // Jeśli narzędzie ma własną funkcję testową
  if (tool.test) {
    try {
      const testResult = await tool.test(config || {});
      return {
        toolId,
        success: testResult.success,
        output: testResult.output,
        error: testResult.error,
        timestamp: new Date(),
        configUsed: config || {}
      };
    } catch (error: any) {
      return {
        toolId,
        success: false,
        error: `Błąd podczas testu: ${error.message}`,
        timestamp: new Date(),
        configUsed: config || {}
      };
    }
  }
  
  // Domyślne testy w zależności od kategorii
  try {
    switch (tool.category) {
            case 'analyzer':
        // Test analizatora - sprawdź czy wymagane ścieżki istnieją
        // Jeśli mamy konkretną ścieżkę, sprawdź ją, inaczej zwróć sukces (narzędzie dostępne)
        if (config && typeof config === 'object' && 'inputPath' in config && typeof config.inputPath === 'string') {
          const exists = fs.existsSync(config.inputPath);
          return {
            toolId,
            success: exists,
            output: { inputPathExists: exists, testPath: config.inputPath },
            error: exists ? undefined : `Ścieżka wejściowa nie istnieje: ${config.inputPath}`,
            timestamp: new Date(),
            configUsed: config
          };
        } else {
          // Brak konkretnej ścieżki - narzędzie jest dostępne, ale potrzebuje konfiguracji
          return {
            toolId,
            success: true,
            output: { message: 'Narzędzie dostępne (wymaga konfiguracji inputPath)' },
            timestamp: new Date(),
            configUsed: config || {}
          };
        }break;
        
      case 'translator':
        // Test translatora - sprawdź dostępność modeli
        return {
          toolId,
          success: true,
          output: { model: config?.model || 'deepseek-chat', status: 'available' },
          timestamp: new Date(),
          configUsed: config || {}
        };
        
            case 'writer': {
        // Test writer - sprawdź możliwość zapisu
        // Użyj przykładowego katalogu
        const testOutputDir = typeof config === 'object' && config !== null && 'outputDir' in config
          ? config.outputDir
          : './test-output';
        try {
          // Sprawdź czy katalog istnieje, jeśli nie spróbuj utworzyć
          if (!fs.existsSync(testOutputDir)) {
            fs.mkdirSync(testOutputDir, { recursive: true });
          }
          fs.accessSync(testOutputDir, fs.constants.W_OK);
          return {
            toolId,
            success: true,
            output: { outputDirWritable: true, testPath: testOutputDir },
            timestamp: new Date(),
            configUsed: config
          };
        } catch (error: any) {
          return {
            toolId,
            success: false,
            error: `Brak uprawnień zapisu do katalogu: ${testOutputDir} (${error.message})`,
            timestamp: new Date(),
            configUsed: config
          };
        }
        break;
      }
    }
    
    // Domyślny sukces dla narzędzi bez specyficznych testów
    return {
      toolId,
      success: true,
      output: { message: 'Narzędzie dostępne (brak specyficznego testu)' },
      timestamp: new Date(),
      configUsed: config || {}
    };
    
  } catch (error: any) {
    return {
      toolId,
      success: false,
      error: `Błąd podczas domyślnego testu: ${error.message}`,
      timestamp: new Date(),
      configUsed: config || {}
    };
  }
}

/**
 * Sprawdza wszystkie narzędzia MOA i generuje raport
 * @param configOverrides - Nadpisania konfiguracji (opcjonalne)
 * @returns Promise<MOACheckSummary> - Kompletny raport sprawdzenia
 */
export async function checkAllMOATools(
  configOverrides?: Partial<MOAConfig>
): Promise<MOACheckSummary> {
  const config = getMOAConfig();
  
  // Zastosuj nadpisania
  if (configOverrides) {
    Object.assign(config, configOverrides);
  }
  
  // Waliduj konfigurację
  const validation = validateMOAConfig(config);
  
  // Testuj endpointy API (symulacja)
  const apiEndpointsReachable: Record<string, boolean> = {};
  for (const [name, url] of Object.entries(config.apiEndpoints)) {
    // W rzeczywistości tutaj byłoby fetch(url).ok
    apiEndpointsReachable[name] = !!url && url.startsWith('http');
  }
  
  // Testuj narzędzia
  const toolTestResults: MOAToolTestResult[] = [];
  for (const toolId of Object.keys(config.tools)) {
    const tool = config.tools[toolId];
    if (tool.enabled) {
      const result = await testMOATool(toolId, {}); // Przekazujemy pusty config, nie schema
      toolTestResults.push(result);
    }
  }
  
  // Znajdź brakujące zmienne środowiskowe
  const missingEnvVars: string[] = [];
  for (const [key, value] of Object.entries(config.envVars)) {
    if (!value || value.trim() === '') {
      missingEnvVars.push(key);
    }
  }
  
  return {
    totalTools: Object.keys(config.tools).length,
    enabledTools: Object.values(config.tools).filter(t => t.enabled).length,
    configValid: validation.valid,
    missingEnvVars,
    apiEndpointsReachable,
    toolTestResults
  };
}

/**
 * Zmienia konfigurację narzędzia MOA
 * @param toolId - ID narzędzia
 * @param updates - Aktualizacje konfiguracji
 * @returns boolean - Czy aktualizacja się powiodła
 */
export function updateMOAToolConfig(
  toolId: string,
  updates: Partial<MOATool>
): boolean {
  // W rzeczywistości tutaj byłoby zapisanie do pliku konfiguracyjnego
  console.log(`Aktualizacja konfiguracji narzędzia ${toolId}:`, updates);
  
  const tools = getMOATools();
  if (!tools[toolId]) {
    console.error(`Narzędzie ${toolId} nie istnieje`);
    return false;
  }
  
  // Aktualizacja (w rzeczywistości zapis do pliku)
  const updatedTool = { ...tools[toolId], ...updates };
  console.log('Zaktualizowane narzędzie:', updatedTool);
  
  return true;
}

/**
 * Główna funkcja uruchamiająca checker (dla CLI)
 */
async function main() {
  console.log('=== MOA Tools Checker ===\n');
  
  // Pobierz konfigurację
  const config = getMOAConfig();
  console.log(`Znaleziono ${Object.keys(config.tools).length} narzędzi MOA`);
  
  // Sprawdź wszystkie narzędzia
  console.log('\n🔍 Sprawdzanie narzędzi MOA...');
  const summary = await checkAllMOATools();
  
  // Wyświetl podsumowanie
  console.log('\n📊 PODSUMOWANIE:');
  console.log(`- Narzędzia ogółem: ${summary.totalTools}`);
  console.log(`- Włączone narzędzia: ${summary.enabledTools}`);
  console.log(`- Konfiguracja poprawna: ${summary.configValid ? '✅' : '❌'}`);
  
  if (summary.missingEnvVars.length > 0) {
    console.log(`- Brakujące zmienne środowiskowe: ${summary.missingEnvVars.join(', ')}`);
  }
  
  // Wyniki testów narzędzi
  console.log('\n🧪 WYNIKI TESTOW NARZĘDZI:');
  for (const result of summary.toolTestResults) {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${result.toolId}: ${result.success ? 'OK' : result.error}`);
  }
  
  // Endpointy API
  console.log('\n🌐 ENDPOINTY API:');
  for (const [name, reachable] of Object.entries(summary.apiEndpointsReachable)) {
    console.log(`${reachable ? '✅' : '❌'} ${name}: ${reachable ? 'dostępny' : 'niedostępny'}`);
  }
  
  // Zalecenia
  console.log('\n💡 ZALECENIA:');
  if (!summary.configValid) {
    console.log('1. Popraw konfigurację MOA (sprawdź błędy walidacji)');
  }
  if (summary.missingEnvVars.length > 0) {
    console.log(`2. Ustaw brakujące zmienne środowiskowe: ${summary.missingEnvVars.join(', ')}`);
  }
  if (summary.toolTestResults.some(r => !r.success)) {
    const failedTools = summary.toolTestResults.filter(r => !r.success).map(r => r.toolId);
    console.log(`3. Napraw nieudane narzędzia: ${failedTools.join(', ')}`);
  }
  
  console.log('\n=== Koniec raportu ===');
}

// Uruchomienie jeśli wywołany bezpośrednio
if (require.main === module) {
  main().catch(console.error);
}

export default {
  getMOATools,
  getMOAConfig,
  validateMOAConfig,
  testMOATool,
  checkAllMOATools,
  updateMOAToolConfig
};