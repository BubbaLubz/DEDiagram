import { createTable, createColumn, toggleRelationshipCardinality } from '../data/erd';

// Table cards cascade left-to-right on first creation, mirroring the pipeline
// canvas's x-increment-of-300 layout convention (see DiagramCanvas.jsx).
const TABLE_X_STEP = 340;
const TABLE_X_START = 60;
const TABLE_Y = 120;

function getSchema(node) {
  return node?.data?.schema || { tables: [], relationshipOverrides: {} };
}

export const createSchemaSlice = (set, get) => ({
  // Which node's schema is open in the ERD workspace overlay, or null.
  erdWorkspaceNodeId: null,

  openErdWorkspace: (nodeId) => set({ erdWorkspaceNodeId: nodeId }),
  closeErdWorkspace: () => set({ erdWorkspaceNodeId: null }),

  // Applies `updater(schema) -> schema` to one node's schema, routed through
  // the existing updateNodeData (undo snapshot + collab sync already live there).
  updateNodeSchema: (nodeId, updater) => {
    const node = get().nodes.find(n => n.id === nodeId);
    get().updateNodeData(nodeId, { schema: updater(getSchema(node)) });
  },

  addTable: (nodeId) => {
    get().updateNodeSchema(nodeId, (schema) => {
      const position = { x: TABLE_X_START + schema.tables.length * TABLE_X_STEP, y: TABLE_Y };
      return { ...schema, tables: [...schema.tables, createTable({ position })] };
    });
  },

  renameTable: (nodeId, tableId, name) => {
    get().updateNodeSchema(nodeId, (schema) => ({
      ...schema,
      tables: schema.tables.map(t => t.id === tableId ? { ...t, name } : t),
    }));
  },

  moveTable: (nodeId, tableId, position) => {
    get().updateNodeSchema(nodeId, (schema) => ({
      ...schema,
      tables: schema.tables.map(t => t.id === tableId ? { ...t, position } : t),
    }));
  },

  // Removing a table also clears any FK on another table that pointed at it,
  // so no column is left referencing a table that no longer exists.
  deleteTable: (nodeId, tableId) => {
    get().updateNodeSchema(nodeId, (schema) => ({
      ...schema,
      tables: schema.tables
        .filter(t => t.id !== tableId)
        .map(t => ({
          ...t,
          columns: t.columns.map(c => c.fk?.tableId === tableId ? { ...c, fk: null } : c),
        })),
    }));
  },

  addColumn: (nodeId, tableId) => {
    get().updateNodeSchema(nodeId, (schema) => ({
      ...schema,
      tables: schema.tables.map(t => t.id === tableId
        ? { ...t, columns: [...t.columns, createColumn()] }
        : t),
    }));
  },

  updateColumn: (nodeId, tableId, columnId, updates) => {
    get().updateNodeSchema(nodeId, (schema) => ({
      ...schema,
      tables: schema.tables.map(t => t.id === tableId
        ? { ...t, columns: t.columns.map(c => c.id === columnId ? { ...c, ...updates } : c) }
        : t),
    }));
  },

  // Removing a column also clears any other column's FK that pointed at it.
  deleteColumn: (nodeId, tableId, columnId) => {
    get().updateNodeSchema(nodeId, (schema) => ({
      ...schema,
      tables: schema.tables.map(t => ({
        ...t,
        columns: t.id === tableId
          ? t.columns.filter(c => c.id !== columnId)
          : t.columns.map(c => c.fk?.columnId === columnId ? { ...c, fk: null } : c),
      })),
    }));
  },

  // Cycles a relationship's cardinality override — see toggleRelationshipCardinality.
  toggleRelationshipOverride: (nodeId, relationship) => {
    get().updateNodeSchema(nodeId, (schema) => {
      const next = toggleRelationshipCardinality(relationship);
      const overrides = { ...(schema.relationshipOverrides || {}) };
      if (next === null) delete overrides[relationship.id];
      else overrides[relationship.id] = { cardinality: next };
      return { ...schema, relationshipOverrides: overrides };
    });
  },
});
