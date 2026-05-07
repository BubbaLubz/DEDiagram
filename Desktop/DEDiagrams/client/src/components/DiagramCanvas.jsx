import { useCallback, useRef, useEffect } from 'react';
import ReactFlow, {
  Background, Controls, MiniMap, BackgroundVariant,
  useReactFlow, MarkerType, Panel,
} from 'reactflow';
import { graphlib as dagreGraphlib, layout as dagreLayout } from '@dagrejs/dagre';
import { v4 as uuidv4 } from 'uuid';
import 'reactflow/dist/style.css';
import ComponentNode from './nodes/ComponentNode';
import LabeledEdge from './edges/LabeledEdge';
import useStore from '../store';

const nodeTypes = { component: ComponentNode };
const edgeTypes = { labeled: LabeledEdge };

const defaultEdgeOptions = {
  type: 'labeled',
  markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: '#94a3b8' },
  data: { label: 'batch', edgeType: 'batch' },
};

const NODE_WIDTH = 200;
const NODE_HEIGHT = 90;

function getAutoLayoutedElements(nodes, edges) {
  const g = new dagreGraphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'LR', ranksep: 100, nodesep: 60, marginx: 80, marginy: 60 });

  nodes.forEach(node => g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT }));
  edges.forEach(edge => g.setEdge(edge.source, edge.target));

  dagreLayout(g);

  return {
    nodes: nodes.map(node => {
      const { x, y } = g.node(node.id);
      return { ...node, position: { x: x - NODE_WIDTH / 2, y: y - NODE_HEIGHT / 2 } };
    }),
    edges,
  };
}

export default function DiagramCanvas() {
  const {
    nodes, edges,
    onNodesChange, onEdgesChange, onConnect,
    addNode, selectNode,
    openSaveModal,
  } = useStore();

  const reactFlowWrapper = useRef(null);
  const { fitView, setNodes, setEdges, getViewport } = useReactFlow();

  const onNodeClick = useCallback((_, node) => {
    selectNode(node);
    fitView({ nodes: [node], duration: 600, padding: 0.5 });
  }, [selectNode, fitView]);

  const onPaneClick = useCallback(() => {
    selectNode(null);
  }, [selectNode]);

  const onDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData('application/de-component');
    if (!raw) return;

    const { componentType, label } = JSON.parse(raw);
    const wrapper = reactFlowWrapper.current;
    if (!wrapper) return;

    const rect = wrapper.getBoundingClientRect();
    const viewport = getViewport();
    const position = {
      x: (e.clientX - rect.left - viewport.x) / viewport.zoom - NODE_WIDTH / 2,
      y: (e.clientY - rect.top - viewport.y) / viewport.zoom - NODE_HEIGHT / 2,
    };

    addNode({
      id: uuidv4(),
      type: 'component',
      position,
      data: { componentType, label },
    });
  }, [addNode, getViewport]);

  const handleAutoLayout = useCallback(() => {
    const { nodes: ln, edges: le } = getAutoLayoutedElements(nodes, edges);
    setNodes(ln);
    setEdges(le);
    setTimeout(() => fitView({ duration: 600, padding: 0.1 }), 50);
  }, [nodes, edges, setNodes, setEdges, fitView]);

  const handleFitView = useCallback(() => {
    fitView({ duration: 600, padding: 0.1 });
  }, [fitView]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        openSaveModal();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [openSaveModal]);

  // Expose layout/fitView handlers via a global ref (for Toolbar)
  useEffect(() => {
    window.__deAutoLayout = handleAutoLayout;
    window.__deFitView = handleFitView;
  }, [handleAutoLayout, handleFitView]);

  return (
    <div ref={reactFlowWrapper} className="flex-1 h-full relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onDrop={onDrop}
        onDragOver={onDragOver}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        snapToGrid
        snapGrid={[15, 15]}
        minZoom={0.2}
        maxZoom={3}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        deleteKeyCode="Delete"
        multiSelectionKeyCode="Shift"
        style={{ background: '#0d1117' }}
        connectionLineStyle={{ stroke: '#4f5462', strokeWidth: 2 }}
        connectionLineType="bezier"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={30}
          size={1}
          color="#1f2937"
        />

        <Controls
          style={{
            background: '#161b22',
            border: '1px solid #30363d',
            borderRadius: 8,
          }}
          showInteractive={false}
        />

        <MiniMap
          style={{
            background: '#0d1117',
            border: '1px solid #30363d',
            borderRadius: 8,
          }}
          nodeColor={(n) => {
            const componentType = n.data?.componentType;
            if (!componentType) return '#30363d';
            const colors = {
              source: '#3b82f6', ingestion: '#f97316', streaming: '#f59e0b',
              processing: '#a855f7', orchestration: '#06b6d4', storage: '#22c55e',
              warehouse: '#29b5e8', serving: '#ec4899',
            };
            const categories = {
              postgresql: 'source', mysql: 'source', mongodb: 'source',
              rest_api: 'source', files_s3: 'source',
              debezium: 'ingestion', fivetran: 'ingestion', airbyte: 'ingestion', kinesis: 'ingestion',
              kafka: 'streaming', rabbitmq: 'streaming',
              spark: 'processing', flink: 'processing', dbt: 'processing',
              databricks: 'processing', aws_glue: 'processing',
              airflow: 'orchestration', prefect: 'orchestration', dagster: 'orchestration',
              s3: 'storage', adls: 'storage', delta_lake: 'storage', iceberg: 'storage', hdfs: 'storage',
              snowflake: 'warehouse', bigquery: 'warehouse', redshift: 'warehouse', azure_synapse: 'warehouse',
              tableau: 'serving', looker: 'serving', power_bi: 'serving', superset: 'serving', redis: 'serving',
            };
            return colors[categories[componentType]] || '#30363d';
          }}
          maskColor="rgba(0,0,0,0.6)"
        />

        {/* Empty state */}
        {nodes.length === 0 && (
          <Panel position="top-center">
            <div className="mt-20 text-center pointer-events-none select-none">
              <div className="inline-flex flex-col items-center gap-3 px-8 py-6 rounded-2xl border border-slate-700 bg-slate-900/60 backdrop-blur">
                <svg viewBox="0 0 48 48" className="w-12 h-12 opacity-30" fill="none">
                  <rect x="4" y="14" width="14" height="10" rx="3" stroke="#6366f1" strokeWidth="2"/>
                  <rect x="20" y="10" width="14" height="10" rx="3" stroke="#6366f1" strokeWidth="2"/>
                  <rect x="20" y="28" width="14" height="10" rx="3" stroke="#6366f1" strokeWidth="2"/>
                  <rect x="36" y="18" width="8" height="12" rx="2" stroke="#6366f1" strokeWidth="2"/>
                  <path d="M18 19h2m16 5h2M34 15v3m0 7v3" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <div>
                  <p className="text-slate-400 font-medium text-sm">Start building your pipeline</p>
                  <p className="text-slate-600 text-xs mt-1">Drag components from the left sidebar, or load a starter template</p>
                </div>
              </div>
            </div>
          </Panel>
        )}
      </ReactFlow>
    </div>
  );
}

export { getAutoLayoutedElements };
