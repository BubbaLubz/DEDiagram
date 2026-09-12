import { memo, useState, useRef, useEffect } from 'react';
import { Handle, Position } from 'reactflow';
import { Trash2, Plus, KeyRound, Fingerprint, GripVertical } from 'lucide-react';
import useStore from '../../../store';
import { isJunctionTable } from '../../../data/erd';

const ROW_HEIGHT = 34;

function Chip({ active, title, onClick, children, activeColor }) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="nodrag nopan"
      style={{
        width: 20, height: 20, borderRadius: 4, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: `1px solid ${active ? activeColor : '#453B2F'}`,
        background: active ? activeColor + '22' : 'transparent',
        color: active ? activeColor : '#6E6355',
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  );
}

function ColumnRow({ nodeId, table, column, otherColumns }) {
  const { updateColumn, deleteColumn } = useStore();
  const fkValue = column.fk ? `${column.fk.tableId}::${column.fk.columnId}` : '';

  const handleFkChange = (e) => {
    const val = e.target.value;
    if (!val) { updateColumn(nodeId, table.id, column.id, { fk: null }); return; }
    const [tableId, columnId] = val.split('::');
    updateColumn(nodeId, table.id, column.id, { fk: { tableId, columnId } });
  };

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderTop: '1px solid #453B2F', height: ROW_HEIGHT, boxSizing: 'border-box' }}>
      <Handle type="target" position={Position.Left} id={`${column.id}-target`} style={{ left: -6, top: '50%', transform: 'translateY(-50%)', background: '#4A3B2C', border: '2px solid #6E6355', width: 8, height: 8 }} />
      <Handle type="source" position={Position.Right} id={`${column.id}-source`} style={{ right: -6, top: '50%', transform: 'translateY(-50%)', background: '#4A3B2C', border: '2px solid #6E6355', width: 8, height: 8 }} />

      <input
        className="nodrag"
        value={column.name}
        onChange={(e) => updateColumn(nodeId, table.id, column.id, { name: e.target.value })}
        placeholder="column"
        style={{ flex: 1, minWidth: 0, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: '#E8DFD0', background: 'transparent', border: 'none', outline: 'none', padding: 0 }}
      />
      <input
        className="nodrag"
        value={column.type}
        onChange={(e) => updateColumn(nodeId, table.id, column.id, { type: e.target.value })}
        placeholder="type"
        style={{ width: 62, flexShrink: 0, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#9C8F7C', background: 'transparent', border: 'none', outline: 'none', padding: 0 }}
      />

      <Chip title="Primary key" active={column.isPK} activeColor="#E3A854" onClick={() => updateColumn(nodeId, table.id, column.id, { isPK: !column.isPK })}>
        <KeyRound size={11} />
      </Chip>
      <Chip title="Unique (marks the relationship 1:1 when this column is a foreign key)" active={column.isUnique} activeColor="#5B7A8C" onClick={() => updateColumn(nodeId, table.id, column.id, { isUnique: !column.isUnique })}>
        <Fingerprint size={11} />
      </Chip>

      <select
        className="nodrag"
        value={fkValue}
        onChange={handleFkChange}
        title="Foreign key reference"
        style={{
          width: 74, flexShrink: 0, fontSize: 9, fontWeight: 700, borderRadius: 3, padding: '2px 4px',
          background: column.fk ? '#5B7A8C22' : 'transparent',
          color: column.fk ? '#5B7A8C' : '#6E6355',
          border: `1px solid ${column.fk ? '#5B7A8C55' : '#453B2F'}`,
          cursor: 'pointer',
        }}
      >
        <option value="">FK —</option>
        {otherColumns.map(({ table: t, column: c }) => (
          <option key={`${t.id}::${c.id}`} value={`${t.id}::${c.id}`}>{t.name}.{c.name}</option>
        ))}
      </select>

      <button
        title="Delete column"
        onClick={() => deleteColumn(nodeId, table.id, column.id)}
        className="nodrag nopan"
        style={{ width: 16, height: 16, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'none', color: '#6E6355', cursor: 'pointer' }}
      >
        <Trash2 size={11} />
      </button>
    </div>
  );
}

function TableNode({ id, data, selected }) {
  const { renameTable, deleteTable, addColumn, nodes } = useStore();
  const [hovered, setHovered] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState('');
  const nameInputRef = useRef(null);
  const { nodeId, table } = data;

  useEffect(() => {
    if (editingName) { nameInputRef.current?.focus(); nameInputRef.current?.select(); }
  }, [editingName]);

  const startEditingName = () => { setNameValue(table.name); setEditingName(true); };
  const commitName = () => {
    const trimmed = nameValue.trim();
    if (trimmed) renameTable(nodeId, table.id, trimmed);
    setEditingName(false);
  };
  const handleNameKeyDown = (e) => {
    if (e.key === 'Enter') commitName();
    if (e.key === 'Escape') setEditingName(false);
  };

  const otherColumns = (() => {
    const parentNode = nodes.find(n => n.id === nodeId);
    const allTables = parentNode?.data?.schema?.tables || [];
    const opts = [];
    for (const t of allTables) {
      if (t.id === table.id) continue;
      for (const c of t.columns) opts.push({ table: t, column: c });
    }
    return opts;
  })();

  const junction = isJunctionTable(table);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: 300, borderRadius: 8, border: `2px solid ${selected ? '#E3A854' : '#4A3B2C'}`,
        background: '#2A2119', boxShadow: '0 2px 8px rgba(23,19,16,0.35)', overflow: 'hidden',
      }}
    >
      <div className="table-node-drag-handle" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderBottom: '1px solid #453B2F', cursor: 'grab' }}>
        <GripVertical size={13} color="#6E6355" style={{ flexShrink: 0 }} />
        <span style={{ width: 18, height: 18, borderRadius: 4, background: '#E3A854', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#1C1815" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="1"/><path d="M3 9h18"/><path d="M9 3v18"/></svg>
        </span>
        {editingName ? (
          <input
            ref={nameInputRef}
            className="nodrag"
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onBlur={commitName}
            onKeyDown={handleNameKeyDown}
            onMouseDown={(e) => e.stopPropagation()}
            style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, color: '#E8DFD0', background: 'transparent', border: 'none', outline: 'none', padding: 0 }}
          />
        ) : (
          <span
            onDoubleClick={startEditingName}
            title="Double-click to rename"
            style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, color: '#E8DFD0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          >
            {table.name}
          </span>
        )}
        {junction && (
          <span title="Junction table — represents a many-to-many relationship" style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 3, background: '#7D5A8822', color: '#7D5A88', border: '1px solid #7D5A8855', flexShrink: 0 }}>
            M:N JOIN
          </span>
        )}
        {hovered && (
          <button
            title="Delete table"
            onClick={() => deleteTable(nodeId, table.id)}
            className="nodrag nopan"
            style={{ width: 18, height: 18, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'none', color: '#9C8F7C', cursor: 'pointer' }}
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>

      {table.columns.map(column => (
        <ColumnRow key={column.id} nodeId={nodeId} table={table} column={column} otherColumns={otherColumns} />
      ))}

      <button
        onClick={() => addColumn(nodeId, table.id)}
        className="nodrag nopan"
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
          padding: '6px 10px', borderTop: '1px solid #453B2F', border: 'none',
          background: 'none', color: '#6E6355', fontSize: 11, cursor: 'pointer',
        }}
      >
        <Plus size={11} /> Add column
      </button>
    </div>
  );
}

export default memo(TableNode);
