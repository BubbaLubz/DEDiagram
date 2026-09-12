// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import ErdWorkspace from '../ErdWorkspace';
import useStore from '../../../store';

// jsdom doesn't implement ResizeObserver. ReactFlow renders a node
// `visibility: hidden` until this reports a measurement, so the stub must
// actually invoke the callback (with a plausible size) rather than no-op.
global.ResizeObserver = class {
  constructor(callback) { this.callback = callback; }
  observe(target) {
    this.callback([{ target, contentRect: { width: 300, height: 150 } }]);
  }
  unobserve() {}
  disconnect() {}
};

// jsdom also doesn't implement DOMMatrixReadOnly, which ReactFlow uses to
// read the current zoom out of the viewport's computed transform. The exact
// zoom value doesn't matter for these tests, so a fixed scale is fine.
global.DOMMatrixReadOnly = class {
  constructor() { this.m22 = 1; }
};

// jsdom does no layout, so offsetWidth/offsetHeight are always 0 — and
// ReactFlow keeps a node `visibility: hidden` until it measures a nonzero
// size for it. Fix both to a plausible size so nodes report as measured.
Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, value: 300 });
Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, value: 150 });

afterEach(cleanup);

beforeEach(() => {
  useStore.setState({
    erdWorkspaceNodeId: null,
    currentDiagramName: 'customer-pipeline',
    nodes: [{ id: 'pg-1', type: 'component', position: { x: 0, y: 0 }, data: { componentType: 'postgresql', label: 'PostgreSQL' } }],
    edges: [],
  });
});

function openWorkspace() {
  useStore.getState().openErdWorkspace('pg-1');
  return render(<ErdWorkspace />);
}

function tableCard(nameValue) {
  return screen.getByText(nameValue).closest('.react-flow__node');
}

// The table name only becomes an editable input after a double-click on the
// header span; a single click (or click-drag) instead moves the card.
function renameTable(oldName, newName) {
  fireEvent.doubleClick(screen.getByText(oldName));
  fireEvent.change(screen.getByDisplayValue(oldName), { target: { value: newName } });
  fireEvent.blur(screen.getByDisplayValue(newName));
}

describe('ErdWorkspace', () => {
  it('renders nothing when no node is scoped for the ERD workspace', () => {
    const { container } = render(<ErdWorkspace />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the breadcrumb and an empty state when the node has no tables yet', () => {
    openWorkspace();
    expect(screen.getByText('customer-pipeline')).toBeInTheDocument();
    expect(screen.getByText('PostgreSQL — Schema')).toBeInTheDocument();
    expect(screen.getByText('No tables yet')).toBeInTheDocument();
  });

  it('adds a table with a default PK "id" column when "Add Table" is clicked', () => {
    openWorkspace();
    fireEvent.click(screen.getByRole('button', { name: /add table/i }));
    expect(screen.getByText('new_table')).toBeInTheDocument();
    expect(screen.getByDisplayValue('id')).toBeInTheDocument();
  });

  it('renames a table only via double-click, not a single click', () => {
    openWorkspace();
    fireEvent.click(screen.getByRole('button', { name: /add table/i }));

    // A single click on the name does nothing — it stays a static label.
    fireEvent.click(screen.getByText('new_table'));
    expect(screen.queryByDisplayValue('new_table')).not.toBeInTheDocument();

    renameTable('new_table', 'users');
    expect(screen.getByText('users')).toBeInTheDocument();
    expect(screen.queryByText('new_table')).not.toBeInTheDocument();
  });

  it('gives the table card a drag handle covering the header, outside the editable name field', () => {
    openWorkspace();
    fireEvent.click(screen.getByRole('button', { name: /add table/i }));
    const table = tableCard('new_table');
    const handle = table.querySelector('.table-node-drag-handle');
    expect(handle).toBeInTheDocument();
    // The name label sits inside the drag handle until double-clicked — a
    // plain click there should drag the card, not start editing.
    expect(handle.contains(screen.getByText('new_table'))).toBe(true);
  });

  it('persists a table\'s new position when it stops being dragged', () => {
    openWorkspace();
    fireEvent.click(screen.getByRole('button', { name: /add table/i }));
    const tableId = useStore.getState().nodes[0].data.schema.tables[0].id;

    useStore.getState().moveTable('pg-1', tableId, { x: 500, y: 260 });

    expect(useStore.getState().nodes[0].data.schema.tables[0].position).toEqual({ x: 500, y: 260 });
  });

  it('auto-detects a 1:N relationship once a column is marked as a FK, and lets the pill override it', () => {
    openWorkspace();

    // Table 1: "users" (default id PK column is enough as the FK target).
    fireEvent.click(screen.getByRole('button', { name: /add table/i }));
    renameTable('new_table', 'users');

    // Table 2: "orders", with an extra column to use as the FK.
    fireEvent.click(screen.getByRole('button', { name: /add table/i }));
    renameTable('new_table', 'orders');
    const orders = tableCard('orders');
    fireEvent.click(within(orders).getByRole('button', { name: /add column/i }));

    const fkSelect = within(orders).getAllByRole('combobox')[1]; // [0] is the "id" row's own FK select
    const usersIdOption = Array.from(fkSelect.querySelectorAll('option')).find(o => o.textContent === 'users.id');
    expect(usersIdOption).toBeTruthy();
    fireEvent.change(fkSelect, { target: { value: usersIdOption.value } });

    // Auto-detected 1:N relationship shows up on the canvas.
    expect(screen.getByTitle('Auto-detected from the foreign key — click to override')).toBeInTheDocument();

    // Clicking the pill overrides it to 1:1, and the bolt icon becomes a manual (pencil) indicator.
    fireEvent.click(screen.getByTitle('Auto-detected from the foreign key — click to override'));
    expect(screen.getByTitle('Manually set — click to cycle, or revert to auto-detect')).toBeInTheDocument();
  });
});
