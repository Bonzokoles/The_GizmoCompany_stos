import '@testing-library/jest-dom';

// Mock electron
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(() => '/tmp'),
    getName: jest.fn(() => 'zeno-browser'),
    getVersion: jest.fn(() => '0.1.0'),
  },
  ipcMain: {
    on: jest.fn(),
    handle: jest.fn(),
  },
  ipcRenderer: {
    on: jest.fn(),
    send: jest.fn(),
    invoke: jest.fn(),
  },
  shell: {
    openExternal: jest.fn(),
  },
  BrowserWindow: jest.fn().mockImplementation(() => ({
    loadURL: jest.fn(),
    webContents: { send: jest.fn() },
    on: jest.fn(),
  })),
}), { virtual: true });

// Global test timeout
jest.setTimeout(10000);
