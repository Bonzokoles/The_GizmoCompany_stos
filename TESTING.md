# Testing Guide - ZENO Browser

## Unit Tests

```bash
npm run test:unit
```

Tests located in `src/__tests__/` and `src-electron/__tests__/`

## E2E Tests

```bash
npm run test:e2e
```

Tests located in `test/e2e/`

## Coverage

```bash
npm run test:coverage
```

Minimum coverage: 70% for branches, functions, lines, statements

## Writing Tests

### React Component Test

```typescript
import { render, screen } from '@testing-library/react';
import { MyComponent } from '@/components/MyComponent';

describe('MyComponent', () => {
  test('renders correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

### Plugin Test

```typescript
import { BasePlugin } from '@/plugin-system/core/plugin-api';

class MyPlugin extends BasePlugin {
  // ... implementation
}

describe('MyPlugin', () => {
  test('loads successfully', async () => {
    const plugin = new MyPlugin();
    const metadata = plugin.getMetadata();
    expect(metadata.id).toBe('my-plugin');
  });
});
```

---

✅ Testing setup complete!

---

## Integration Tests

Tests in `test/integration/` verify cross-layer communication. They are separated into a dedicated Jest project (`integration`).

### Run all integration tests

```bash
npx jest --testPathPattern="test/integration" --runInBand --selectProjects integration
```

### Run only non-network tests (always green, no services required)

```bash
npx jest --testPathPattern="0[4-6]" --runInBand --selectProjects integration
```

### Scenarios

| # | File | Requires services |
|---|------|-------------------|
| 01 | `01-health-check.test.ts` | 3701 + 4224 + 5180 |
| 02 | `02-jimbokit-tool.test.ts` | 3701 |
| 03 | `03-d1-roundtrip.test.ts` | 5180 |
| 04 | `04-electron-ipc.test.ts` | no |
| 05 | `05-plugin-rejection.test.ts` | no |
| 06 | `06-permission-gate.test.ts` | no |

Scenarios 01–03 **gracefully skip** with a descriptive warning when services are not running.  
Before running 01–03, start:

```bash
# JIMbo_kit
cd JIMbo_kit && JIMBO_PORT=3701 npm start

# JIMBO_agent_HUB
cd JIMBO_agent_HUB && npm start

# BUCH
cd backend/app && uvicorn main:app --reload --port 5180
```

### Helpers

- `test/integration/helpers/service-checker.ts` — `isServiceUp(port)`, `assertServiceUp(port, name)`
- `test/integration/helpers/retry.ts` — `withRetry(fn, attempts, delayMs)`