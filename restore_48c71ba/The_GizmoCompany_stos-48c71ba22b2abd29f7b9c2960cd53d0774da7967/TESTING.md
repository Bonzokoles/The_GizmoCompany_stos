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