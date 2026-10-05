import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function mount({ fail = false } = {}) {
  const listeners = new Map(), refs = [], effects = [], calls = [], pushes = [], toasts = [];
  class Node {}
  const summary = new Node(), inside = new Node(), outside = new Node();
  const document = { activeElement: inside, addEventListener: (name, fn) => listeners.set(name, fn), removeEventListener: (name, fn) => { if (listeners.get(name) === fn) listeners.delete(name); } };
  let focused = false, refreshed = false;
  summary.focus = () => { focused = true; };
  const details = { open: true, contains: node => node === inside || node === summary };
  const jsx = (type, props) => ({ type, props });
  const mocks = {
    react: { useRef: current => { const ref = { current }; refs.push(ref); return ref; }, useState: initial => [initial, () => {}], useEffect: (effect, deps) => effects.push({ effect, deps }) },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'next/navigation': { usePathname: () => '/client', useRouter: () => ({ push: path => pushes.push(path), refresh: () => { refreshed = true; } }) },
    '@/components/ui/toast': { useToasts: () => ({ toast: (...args) => toasts.push(args) }) },
    '@/components/ui/loading': { PendingButton: 'PendingButton' },
  };
  const source = readFileSync(new URL('../src/components/notifications/notification-center.tsx', import.meta.url), 'utf8');
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const exports = {};
  vm.runInNewContext(js, { exports, require: name => { if (!(name in mocks)) throw Error(name); return mocks[name]; }, document, Node, fetch: async (_url, init) => { calls.push(JSON.parse(init.body)); return { ok: !fail, json: async () => fail ? { error: 'Read status could not be saved.' } : {} }; } });
  const tree = exports.NotificationCenter({ inbox: { items: [{ id: 'one', href: '/client/projects/example', title: 'Project update', read_at: null, created_at: '2026-01-01T00:00:00Z' }], unreadCount: 1, capped: false } });
  tree.props.ref.current = details;
  function find(node, type) {
    if (!node || typeof node !== 'object') return null;
    if (node.type === type) return node;
    for (const child of [node.props?.children].flat(Infinity)) { const result = find(child, type); if (result) return result; }
    return null;
  }
  find(tree, 'summary').props.ref.current = summary;
  const cleanup = effects[0].effect();
  return { details, inside, outside, document, calls, pushes, toasts, cleanup, listeners, effects, find: type => find(tree, type), fire: (name, event) => listeners.get(name)?.(event), focused: () => focused, refreshed: () => refreshed };
}

test('notification details dismiss outside and on Escape, retain inside interaction, and clean listeners', () => {
  const h = mount();
  assert.equal(h.details.open, false);
  h.details.open = true; h.fire('pointerdown', { target: h.inside }); assert.equal(h.details.open, true);
  h.fire('pointerdown', { target: h.outside }); assert.equal(h.details.open, false);
  h.details.open = true; h.fire('keydown', { key: 'Escape' }); assert.equal(h.details.open, false); assert.equal(h.focused(), true);
  h.cleanup(); h.details.open = true; const cleanupAfterNavigation = h.effects[0].effect(); assert.equal(h.details.open, false);
  assert.equal(h.effects[0].deps[0], '/client');
  cleanupAfterNavigation(); assert.equal(h.listeners.size, 0);
});

test('notification listener cleanup on unmount leaves no active handlers', () => {
  const h = mount(); h.cleanup(); assert.equal(h.listeners.size, 0);
});

test('Escape does not steal focus from outside the panel', () => {
  const h = mount(); h.document.activeElement = h.outside; h.details.open = true;
  h.fire('keydown', { key: 'Escape' }); assert.equal(h.details.open, false); assert.equal(h.focused(), false); h.cleanup();
});

test('mark all remains functional; choosing a notification closes and navigates', async () => {
  const h = mount(); h.details.open = true;
  await h.find('PendingButton').props.onClick();
  assert.equal(h.calls[0].action, 'all'); assert.equal(h.refreshed(), true); assert.equal(h.details.open, true);
  let prevented = false;
  await h.find('a').props.onClick({ button: 0, preventDefault: () => { prevented = true; } });
  // onClick intentionally launches the async operation; flush its resolved microtasks.
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(prevented, true); assert.equal(h.details.open, false); assert.equal(h.calls[1].id, 'one'); assert.equal(h.pushes[0], '/client/projects/example');
  h.cleanup();
});

test('read-status failure stays visible in a toast and does not block destination navigation', async () => {
  const h = mount({ fail: true }); h.details.open = true;
  h.find('a').props.onClick({ button: 0, preventDefault() {} });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(h.details.open, false); assert.equal(h.toasts[0][0], 'error'); assert.equal(h.pushes.length, 1); h.cleanup();
});
