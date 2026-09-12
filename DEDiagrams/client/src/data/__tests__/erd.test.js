import { describe, it, expect } from 'vitest';
import {
  createTable, createColumn, computeRelationships,
  isJunctionTable, relationshipId, toggleRelationshipCardinality,
} from '../erd';

function withFk(table, columnId, fk) {
  return { ...table, columns: table.columns.map(c => c.id === columnId ? { ...c, fk } : c) };
}

describe('createTable / createColumn', () => {
  it('creates a table with a single PK "id" column by default', () => {
    const table = createTable({ name: 'users' });
    expect(table.name).toBe('users');
    expect(table.columns).toHaveLength(1);
    expect(table.columns[0].isPK).toBe(true);
  });

  it('gives every table and column a unique id', () => {
    const a = createTable();
    const b = createTable();
    expect(a.id).not.toBe(b.id);
  });
});

describe('computeRelationships', () => {
  it('detects a 1:N relationship from a plain FK column', () => {
    const users = createTable({ name: 'users' });
    const usersPk = users.columns[0];

    let orders = createTable({ name: 'orders', columns: [
      createColumn({ name: 'id', isPK: true }),
      createColumn({ name: 'user_id' }),
    ]});
    const fkCol = orders.columns[1];
    orders = withFk(orders, fkCol.id, { tableId: users.id, columnId: usersPk.id });

    const rels = computeRelationships([users, orders]);
    expect(rels).toHaveLength(1);
    expect(rels[0]).toMatchObject({
      sourceTableId: users.id,
      sourceColumnId: usersPk.id,
      targetTableId: orders.id,
      targetColumnId: fkCol.id,
      cardinality: '1:N',
      autoDetected: true,
    });
  });

  it('detects 1:1 when the FK column is itself unique', () => {
    const users = createTable({ name: 'users' });
    const usersPk = users.columns[0];

    let profiles = createTable({ name: 'profiles', columns: [
      createColumn({ name: 'id', isPK: true }),
      createColumn({ name: 'user_id', isUnique: true }),
    ]});
    const fkCol = profiles.columns[1];
    profiles = withFk(profiles, fkCol.id, { tableId: users.id, columnId: usersPk.id });

    const rels = computeRelationships([users, profiles]);
    expect(rels[0].cardinality).toBe('1:1');
  });

  it('ignores a dangling reference to a deleted table', () => {
    let orders = createTable({ name: 'orders', columns: [
      createColumn({ name: 'id', isPK: true }),
      createColumn({ name: 'user_id' }),
    ]});
    orders = withFk(orders, orders.columns[1].id, { tableId: 'missing-table', columnId: 'missing-col' });

    expect(computeRelationships([orders])).toEqual([]);
  });

  it('ignores a dangling reference to a deleted column on an existing table', () => {
    const users = createTable({ name: 'users' });
    let orders = createTable({ name: 'orders', columns: [
      createColumn({ name: 'id', isPK: true }),
      createColumn({ name: 'user_id' }),
    ]});
    orders = withFk(orders, orders.columns[1].id, { tableId: users.id, columnId: 'missing-col' });

    expect(computeRelationships([users, orders])).toEqual([]);
  });

  it('applies a manual override and marks the relationship as not auto-detected', () => {
    const users = createTable({ name: 'users' });
    const usersPk = users.columns[0];
    let orders = createTable({ name: 'orders', columns: [
      createColumn({ name: 'id', isPK: true }),
      createColumn({ name: 'user_id' }),
    ]});
    const fkCol = orders.columns[1];
    orders = withFk(orders, fkCol.id, { tableId: users.id, columnId: usersPk.id });

    const id = relationshipId(usersPk.id, fkCol.id);
    const rels = computeRelationships([users, orders], { [id]: { cardinality: '1:1' } });

    expect(rels[0].cardinality).toBe('1:1');
    expect(rels[0].autoDetected).toBe(false);
  });

  it('produces two 1:N relationships for a junction table rather than a single N:N edge', () => {
    const users = createTable({ name: 'users' });
    const products = createTable({ name: 'products' });

    let orderItems = createTable({ name: 'order_items', columns: [
      createColumn({ name: 'user_id', isPK: true }),
      createColumn({ name: 'product_id', isPK: true }),
    ]});
    orderItems = withFk(orderItems, orderItems.columns[0].id, { tableId: users.id, columnId: users.columns[0].id });
    orderItems = withFk(orderItems, orderItems.columns[1].id, { tableId: products.id, columnId: products.columns[0].id });

    const rels = computeRelationships([users, products, orderItems]);
    expect(rels).toHaveLength(2);
    expect(rels.every(r => r.cardinality === '1:N')).toBe(true);
  });
});

describe('isJunctionTable', () => {
  it('is false when fewer than two PK columns', () => {
    expect(isJunctionTable(createTable())).toBe(false);
  });

  it('is false when PK columns reference the same table', () => {
    const users = createTable({ name: 'users' });
    let t = createTable({ columns: [
      createColumn({ name: 'a', isPK: true }),
      createColumn({ name: 'b', isPK: true }),
    ]});
    t = withFk(t, t.columns[0].id, { tableId: users.id, columnId: users.columns[0].id });
    t = withFk(t, t.columns[1].id, { tableId: users.id, columnId: users.columns[0].id });
    expect(isJunctionTable(t)).toBe(false);
  });

  it('is true when composite PK is made of FKs to two distinct tables', () => {
    const users = createTable({ name: 'users' });
    const products = createTable({ name: 'products' });
    let t = createTable({ columns: [
      createColumn({ name: 'user_id', isPK: true }),
      createColumn({ name: 'product_id', isPK: true }),
    ]});
    t = withFk(t, t.columns[0].id, { tableId: users.id, columnId: users.columns[0].id });
    t = withFk(t, t.columns[1].id, { tableId: products.id, columnId: products.columns[0].id });
    expect(isJunctionTable(t)).toBe(true);
  });

  it('is false when one PK column has no FK at all', () => {
    const users = createTable({ name: 'users' });
    let t = createTable({ columns: [
      createColumn({ name: 'user_id', isPK: true }),
      createColumn({ name: 'seq', isPK: true }),
    ]});
    t = withFk(t, t.columns[0].id, { tableId: users.id, columnId: users.columns[0].id });
    expect(isJunctionTable(t)).toBe(false);
  });
});

describe('toggleRelationshipCardinality', () => {
  it('flips an auto-detected 1:N to a 1:1 override', () => {
    expect(toggleRelationshipCardinality({ cardinality: '1:N', autoDetected: true })).toBe('1:1');
  });

  it('flips an auto-detected 1:1 to a 1:N override', () => {
    expect(toggleRelationshipCardinality({ cardinality: '1:1', autoDetected: true })).toBe('1:N');
  });

  it('clears an existing override back to auto-detection', () => {
    expect(toggleRelationshipCardinality({ cardinality: '1:1', autoDetected: false })).toBeNull();
  });
});
