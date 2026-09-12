import { describe, it, expect, beforeEach } from 'vitest';
import { create } from 'zustand';
import { createCanvasSlice } from '../canvasSlice';
import { createSchemaSlice } from '../schemaSlice';
import { createColumn } from '../../data/erd';

function makeStore() {
  return create((set, get) => ({
    isDirty: false,
    ...createCanvasSlice(set, get),
    ...createSchemaSlice(set, get),
  }));
}

function addNode(store, id) {
  store.getState().addNode({ id, type: 'component', position: { x: 0, y: 0 }, data: { componentType: 'postgresql' } });
}

describe('schemaSlice › erd workspace open/close', () => {
  it('opens and closes, tracking the scoped node id', () => {
    const store = makeStore();
    expect(store.getState().erdWorkspaceNodeId).toBeNull();
    store.getState().openErdWorkspace('n1');
    expect(store.getState().erdWorkspaceNodeId).toBe('n1');
    store.getState().closeErdWorkspace();
    expect(store.getState().erdWorkspaceNodeId).toBeNull();
  });
});

describe('schemaSlice › addTable', () => {
  let store;
  beforeEach(() => { store = makeStore(); addNode(store, 'n1'); });

  it('creates a table with a default PK column on a node with no schema yet', () => {
    store.getState().addTable('n1');
    const node = store.getState().nodes[0];
    expect(node.data.schema.tables).toHaveLength(1);
    expect(node.data.schema.tables[0].columns[0].isPK).toBe(true);
  });

  it('cascades x position for each additional table', () => {
    store.getState().addTable('n1');
    store.getState().addTable('n1');
    const [t1, t2] = store.getState().nodes[0].data.schema.tables;
    expect(t2.position.x).toBeGreaterThan(t1.position.x);
  });

  it('does not affect other nodes', () => {
    addNode(store, 'n2');
    store.getState().addTable('n1');
    const n2 = store.getState().nodes.find(n => n.id === 'n2');
    expect(n2.data.schema).toBeUndefined();
  });
});

describe('schemaSlice › renameTable / moveTable', () => {
  let store, tableId;
  beforeEach(() => {
    store = makeStore();
    addNode(store, 'n1');
    store.getState().addTable('n1');
    tableId = store.getState().nodes[0].data.schema.tables[0].id;
  });

  it('renames the table', () => {
    store.getState().renameTable('n1', tableId, 'users');
    expect(store.getState().nodes[0].data.schema.tables[0].name).toBe('users');
  });

  it('moves the table', () => {
    store.getState().moveTable('n1', tableId, { x: 500, y: 200 });
    expect(store.getState().nodes[0].data.schema.tables[0].position).toEqual({ x: 500, y: 200 });
  });
});

describe('schemaSlice › deleteTable', () => {
  it('removes the table and clears dangling FKs on other tables that pointed at it', () => {
    const store = makeStore();
    addNode(store, 'n1');
    store.getState().addTable('n1'); // users
    store.getState().addTable('n1'); // orders
    let [users, orders] = store.getState().nodes[0].data.schema.tables;
    store.getState().addColumn('n1', orders.id);
    orders = store.getState().nodes[0].data.schema.tables[1];
    const fkColumn = orders.columns[orders.columns.length - 1];
    store.getState().updateColumn('n1', orders.id, fkColumn.id, { fk: { tableId: users.id, columnId: users.columns[0].id } });

    store.getState().deleteTable('n1', users.id);

    const schema = store.getState().nodes[0].data.schema;
    expect(schema.tables).toHaveLength(1);
    expect(schema.tables[0].columns.find(c => c.id === fkColumn.id).fk).toBeNull();
  });
});

describe('schemaSlice › addColumn / updateColumn / deleteColumn', () => {
  let store, tableId;
  beforeEach(() => {
    store = makeStore();
    addNode(store, 'n1');
    store.getState().addTable('n1');
    tableId = store.getState().nodes[0].data.schema.tables[0].id;
  });

  it('adds a column', () => {
    store.getState().addColumn('n1', tableId);
    expect(store.getState().nodes[0].data.schema.tables[0].columns).toHaveLength(2);
  });

  it('updates a column', () => {
    store.getState().addColumn('n1', tableId);
    const col = store.getState().nodes[0].data.schema.tables[0].columns[1];
    store.getState().updateColumn('n1', tableId, col.id, { name: 'email', type: 'varchar' });
    const updated = store.getState().nodes[0].data.schema.tables[0].columns[1];
    expect(updated).toMatchObject({ name: 'email', type: 'varchar' });
  });

  it('deletes a column, and clears any other column\'s FK that referenced it', () => {
    store.getState().addColumn('n1', tableId); // second table's own extra column, used as the FK target below
    let table = store.getState().nodes[0].data.schema.tables[0];
    const targetCol = table.columns[1];

    store.getState().addTable('n1');
    const secondTableId = store.getState().nodes[0].data.schema.tables[1].id;
    store.getState().addColumn('n1', secondTableId);
    let second = store.getState().nodes[0].data.schema.tables[1];
    const fkCol = second.columns[second.columns.length - 1];
    store.getState().updateColumn('n1', secondTableId, fkCol.id, { fk: { tableId, columnId: targetCol.id } });

    store.getState().deleteColumn('n1', tableId, targetCol.id);

    const schema = store.getState().nodes[0].data.schema;
    expect(schema.tables[0].columns.find(c => c.id === targetCol.id)).toBeUndefined();
    expect(schema.tables[1].columns.find(c => c.id === fkCol.id).fk).toBeNull();
  });
});

describe('schemaSlice › toggleRelationshipOverride', () => {
  let store;
  beforeEach(() => {
    store = makeStore();
    addNode(store, 'n1');
    store.getState().addTable('n1');
  });

  it('records an override the first time, then clears it back to auto on a second toggle', () => {
    const relationship = { id: 'a->b', cardinality: '1:N', autoDetected: true };

    store.getState().toggleRelationshipOverride('n1', relationship);
    let overrides = store.getState().nodes[0].data.schema.relationshipOverrides;
    expect(overrides['a->b']).toEqual({ cardinality: '1:1' });

    const overridden = { id: 'a->b', cardinality: '1:1', autoDetected: false };
    store.getState().toggleRelationshipOverride('n1', overridden);
    overrides = store.getState().nodes[0].data.schema.relationshipOverrides;
    expect(overrides['a->b']).toBeUndefined();
  });
});
