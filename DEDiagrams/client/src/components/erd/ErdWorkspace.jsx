import { useMemo, useCallback } from 'react';
import ReactFlow, { ReactFlowProvider, Background, BackgroundVariant, Controls, Panel } from 'reactflow';
import { ArrowLeft, ChevronRight, Plus } from 'lucide-react';
import useStore from '../../store';
import { COMPONENTS } from '../../data/componentLibrary';
import { computeRelationships } from '../../data/erd';
import TableNode from './nodes/TableNode';
import RelationshipEdge from './edges/RelationshipEdge';

const nodeTypes = { table: TableNode };
const edgeTypes = { relationship: RelationshipEdge };

function ErdWorkspaceInner({ nodeId }) {
  const { nodes, closeErdWorkspace, addTable, moveTable, currentDiagramName } = useStore();
  const pipelineNode = nodes.find(n => n.id === nodeId);
  const schema = pipelineNode?.data?.schema || { tables: [], relationshipOverrides: {} };
  const component = COMPONENTS[pipelineNode?.data?.componentType] || {};

  const flowNodes = useMemo(() => schema.tables.map(table => ({
    id: table.id,
    type: 'table',
    position: table.position,
    dragHandle: '.table-node-drag-handle',
    data: { nodeId, table },
  })), [schema.tables, nodeId]);

  const relationships = useMemo(
    () => computeRelationships(schema.tables, schema.relationshipOverrides || {}),
    [schema.tables, schema.relationshipOverrides],
  );

  const flowEdges = useMemo(() => relationships.map(rel => ({
    id: rel.id,
    type: 'relationship',
    source: rel.sourceTableId,
    sourceHandle: `${rel.sourceColumnId}-source`,
    target: rel.targetTableId,
    targetHandle: `${rel.targetColumnId}-target`,
    data: { relationship: rel, nodeId },
  })), [relationships, nodeId]);

  const onNodesChange = useCallback((changes) => {
    for (const change of changes) {
      if (change.type === 'position' && change.position && change.dragging === false) {
        moveTable(nodeId, change.id, change.position);
      }
    }
  }, [nodeId, moveTable]);

  if (!pipelineNode) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', background: '#1C1815', fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, height: 48, padding: '0 14px', borderBottom: '1px solid #453B2F', flexShrink: 0 }}>
        <button
          onClick={closeErdWorkspace}
          title="Back to pipeline"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 4, border: 'none', background: 'none', color: '#9C8F7C', cursor: 'pointer' }}
        >
          <ArrowLeft size={15} />
        </button>
        <div style={{ width: 1, height: 20, background: '#453B2F' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
          <span style={{ color: '#9C8F7C' }}>{currentDiagramName}</span>
          <ChevronRight size={12} color="#6E6355" />
          <span style={{ color: '#E8DFD0', fontWeight: 600 }}>{pipelineNode.data?.label || component.label} — Schema</span>
        </div>
        <div style={{ flex: 1 }} />
        <button
          onClick={() => addTable(nodeId)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 3,
            border: '1px solid #D2C6AF', fontSize: 12, fontWeight: 600, cursor: 'pointer',
            background: '#F7F2E7', color: '#2B2926',
          }}
        >
          <Plus size={12} /> Add Table
        </button>
      </div>

      <div style={{ flex: 1, position: 'relative' }}>
        <ReactFlow
          nodes={flowNodes}
          edges={flowEdges}
          onNodesChange={onNodesChange}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          nodesConnectable={false}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          minZoom={0.3}
          maxZoom={2}
          deleteKeyCode={null}
          style={{ background: '#171310' }}
        >
          <Background variant={BackgroundVariant.Dots} gap={30} size={1} color="#3A2E22" />
          <Controls
            style={{ background: '#241E18', border: '1px solid #4A3B2C', borderRadius: 8 }}
            showInteractive={false}
          />

          {schema.tables.length === 0 && (
            <Panel position="top-center">
              <div style={{ marginTop: 80, textAlign: 'center', pointerEvents: 'none' }}>
                <p style={{ fontSize: 13, fontWeight: 500, color: '#9C8F7C' }}>No tables yet</p>
                <p style={{ fontSize: 12, color: '#6E6355', marginTop: 4 }}>Add a table, then mark a column as a foreign key to auto-detect its relationship</p>
              </div>
            </Panel>
          )}
        </ReactFlow>
      </div>
    </div>
  );
}

export default function ErdWorkspace() {
  const erdWorkspaceNodeId = useStore(s => s.erdWorkspaceNodeId);
  if (!erdWorkspaceNodeId) return null;
  return (
    <ReactFlowProvider>
      <ErdWorkspaceInner nodeId={erdWorkspaceNodeId} />
    </ReactFlowProvider>
  );
}
