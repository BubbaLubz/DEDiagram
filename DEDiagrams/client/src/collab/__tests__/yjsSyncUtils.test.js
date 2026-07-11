import { describe, it, expect } from 'vitest';
import { stripSelected, nodeContentEqual, edgeContentEqual } from '../yjsSyncUtils';

describe('stripSelected', () => {
  it('removes the selected key', () => {
    const node = { id: 'n1', type: 'component', position: { x: 0, y: 0 }, data: {}, selected: true };
    const stripped = stripSelected(node);
    expect(stripped).not.toHaveProperty('selected');
    expect(stripped).toEqual({ id: 'n1', type: 'component', position: { x: 0, y: 0 }, data: {} });
  });

  it('leaves objects without selected unchanged in content', () => {
    const node = { id: 'n1', type: 'component', position: { x: 0, y: 0 }, data: {} };
    expect(stripSelected(node)).toEqual(node);
  });
});

describe('nodeContentEqual', () => {
  it('treats a selection-only change (same nested refs) as equal', () => {
    const position = { x: 10, y: 20 };
    const data = { label: 'Postgres' };
    const before = { id: 'n1', type: 'component', position, data, width: 200, height: 90, selected: false };
    // Mirrors ReactFlow's applyChanges for a 'select' change: shallow copy,
    // only `.selected` reassigned — position/data/width/height keep refs.
    const after = { ...before, selected: true };
    expect(nodeContentEqual(before, after)).toBe(true);
  });

  it('treats a position change (new position ref) as different', () => {
    const data = { label: 'Postgres' };
    const before = { id: 'n1', type: 'component', position: { x: 10, y: 20 }, data, width: 200, height: 90 };
    const after = { ...before, position: { x: 50, y: 20 } };
    expect(nodeContentEqual(before, after)).toBe(false);
  });

  it('treats a data change (new data ref) as different', () => {
    const position = { x: 10, y: 20 };
    const before = { id: 'n1', type: 'component', position, data: { label: 'Old' }, width: 200, height: 90 };
    const after = { ...before, data: { label: 'New' } };
    expect(nodeContentEqual(before, after)).toBe(false);
  });

  it('handles null/undefined without throwing', () => {
    expect(nodeContentEqual(null, null)).toBe(true);
    expect(nodeContentEqual(null, {})).toBe(false);
    expect(nodeContentEqual({}, null)).toBe(false);
  });
});

describe('edgeContentEqual', () => {
  it('treats a selection-only change as equal', () => {
    const data = { label: 'batch', edgeType: 'batch' };
    const before = { id: 'e1', type: 'labeled', source: 'n1', target: 'n2', data, selected: false };
    const after = { ...before, selected: true };
    expect(edgeContentEqual(before, after)).toBe(true);
  });

  it('treats a data change (new data ref) as different', () => {
    const before = { id: 'e1', type: 'labeled', source: 'n1', target: 'n2', data: { label: 'batch' } };
    const after = { ...before, data: { label: 'stream' } };
    expect(edgeContentEqual(before, after)).toBe(false);
  });
});
