// tests/frontend.test.js — Frontend Smoke Tests
// Agent 9: Validates Agent 6 (index.html), Agent 7 (app.js), Agent 8 (style.css)
//
// Since we're in Node.js, these are structural/existence checks rather than
// full browser tests. A real project would use Playwright or Puppeteer.

const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');

describe('Frontend Files Exist (Agents 6, 7, 8)', () => {
  test('public/index.html exists', () => {
    expect(fs.existsSync(path.join(PUBLIC_DIR, 'index.html'))).toBe(true);
  });

  test('public/app.js exists', () => {
    expect(fs.existsSync(path.join(PUBLIC_DIR, 'app.js'))).toBe(true);
  });

  test('public/style.css exists', () => {
    expect(fs.existsSync(path.join(PUBLIC_DIR, 'style.css'))).toBe(true);
  });
});

describe('index.html Structure (Agent 6)', () => {
  let html;

  beforeAll(() => {
    html = fs.readFileSync(path.join(PUBLIC_DIR, 'index.html'), 'utf-8');
  });

  test('has DOCTYPE declaration', () => {
    expect(html.toLowerCase()).toContain('<!doctype html>');
  });

  test('references app.js', () => {
    expect(html).toContain('app.js');
  });

  test('references style.css', () => {
    expect(html).toContain('style.css');
  });

  test('has a form or input for adding tasks', () => {
    const hasInput = html.includes('<input') || html.includes('<form');
    expect(hasInput).toBe(true);
  });

  test('has a container for task list', () => {
    // Expect some kind of list/container element with a relevant id or class
    const hasContainer =
      html.includes('task-list') ||
      html.includes('tasks') ||
      html.includes('todo-list') ||
      html.includes('<ul') ||
      html.includes('<ol');
    expect(hasContainer).toBe(true);
  });
});

describe('style.css is valid (Agent 8)', () => {
  let css;

  beforeAll(() => {
    css = fs.readFileSync(path.join(PUBLIC_DIR, 'style.css'), 'utf-8');
  });

  test('is non-empty', () => {
    expect(css.trim().length).toBeGreaterThan(0);
  });

  test('contains at least one CSS rule', () => {
    expect(css).toMatch(/\{[\s\S]*\}/);
  });
});

describe('app.js is valid (Agent 7)', () => {
  let js;

  beforeAll(() => {
    js = fs.readFileSync(path.join(PUBLIC_DIR, 'app.js'), 'utf-8');
  });

  test('is non-empty', () => {
    expect(js.trim().length).toBeGreaterThan(0);
  });

  test('references the /api/tasks endpoint', () => {
    expect(js).toContain('/api/tasks');
  });

  test('handles fetch or XMLHttpRequest', () => {
    const usesFetch = js.includes('fetch(') || js.includes('XMLHttpRequest');
    expect(usesFetch).toBe(true);
  });
});
