import { v4 as uuidv4 } from 'uuid';

// A schema table: { id, name, position: {x,y}, columns: Column[] }
// A column: { id, name, type, isPK, isUnique, fk: {tableId, columnId} | null }

export function createColumn(overrides = {}) {
  return {
    id: uuidv4(),
    name: 'column',
    type: 'text',
    isPK: false,
    isUnique: false,
    fk: null,
    ...overrides,
  };
}

export function createTable(overrides = {}) {
  return {
    id: uuidv4(),
    name: 'new_table',
    position: { x: 0, y: 0 },
    columns: [createColumn({ name: 'id', type: 'uuid', isPK: true })],
    ...overrides,
  };
}

// Cardinality implied by a single FK -> referenced-column link: 1:1 only when
// the FK column is itself constrained unique (so at most one child per
// parent), otherwise the general 1:N case.
export function cardinalityForColumn(fkColumn) {
  return fkColumn.isUnique ? '1:1' : '1:N';
}

// A join/junction table (the standard shape behind a many-to-many): its
// primary key is made up of two or more FK columns pointing at distinct
// tables. Callers use this to flag the table in the UI rather than drawing a
// single N:N edge — the two 1:N edges below already represent it correctly.
export function isJunctionTable(table) {
  const pkColumns = table.columns.filter(c => c.isPK);
  if (pkColumns.length < 2) return false;
  if (!pkColumns.every(c => c.fk)) return false;
  const referencedTableIds = new Set(pkColumns.map(c => c.fk.tableId));
  return referencedTableIds.size >= 2;
}

// Derives every relationship implied by FK columns across a schema's tables.
// Purely a function of the tables (auto-detection) plus any manual
// `overrides` (keyed by relationship id) recorded when a user recasts a
// relationship's cardinality. Dangling references (the referenced table or
// column was deleted) are silently skipped rather than thrown.
export function computeRelationships(tables, overrides = {}) {
  const tablesById = new Map(tables.map(t => [t.id, t]));
  const relationships = [];

  for (const table of tables) {
    for (const column of table.columns) {
      if (!column.fk) continue;
      const refTable = tablesById.get(column.fk.tableId);
      if (!refTable) continue;
      const refColumn = refTable.columns.find(c => c.id === column.fk.columnId);
      if (!refColumn) continue;

      const id = relationshipId(refColumn.id, column.id);
      const override = overrides[id];

      relationships.push({
        id,
        sourceTableId: refTable.id,
        sourceColumnId: refColumn.id,
        targetTableId: table.id,
        targetColumnId: column.id,
        cardinality: override?.cardinality || cardinalityForColumn(column),
        autoDetected: !override,
      });
    }
  }
  return relationships;
}

export function relationshipId(sourceColumnId, targetColumnId) {
  return `${sourceColumnId}->${targetColumnId}`;
}

// Manual override cycle for a relationship's cardinality pill: auto-detected
// -> flip to the other cardinality (recorded as an override) -> back to auto.
// Returns the next cardinality string to store as an override, or null to
// clear the override and revert to auto-detection.
export function toggleRelationshipCardinality(relationship) {
  if (relationship.autoDetected) {
    return relationship.cardinality === '1:N' ? '1:1' : '1:N';
  }
  return null;
}
