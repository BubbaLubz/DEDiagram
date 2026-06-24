import { useCallback, useRef, useEffect, useMemo } from 'react';
import ReactFlow, {
  Background, Controls, MiniMap, BackgroundVariant,
  useReactFlow, useViewport, MarkerType, Panel,
  getNodesBounds, getViewportForBounds,
} from 'reactflow';
import { toPng } from 'html-to-image';
import { graphlib as dagreGraphlib, layout as dagreLayout } from '@dagrejs/dagre';
import { v4 as uuidv4 } from 'uuid';
import 'reactflow/dist/style.css';
import ComponentNode from './nodes/ComponentNode';
import LabeledEdge from './edges/LabeledEdge';
import useStore from '../store';
import { CanvasActionsContext } from '../context/CanvasActionsContext';
import { useTheme } from '../theme';

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
    openSaveModal, undo,
  } = useStore();

  const {
    isDrawingMode, penColor, penWidth, drawingStrokes, addStroke,
  } = useStore();
  const P = useTheme();

  const reactFlowWrapper = useRef(null);
  const { fitView, setNodes, setEdges, getViewport, getNodes } = useReactFlow();
  const viewport = useViewport();

  // Drawing refs — avoid re-renders during pointer move
  const isDrawingRef   = useRef(false);
  const currentPtsRef  = useRef([]);
  const liveLineRef    = useRef(null);

  const toCanvasXY = useCallback((e) => {
    const rect = reactFlowWrapper.current.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - viewport.x) / viewport.zoom,
      y: (e.clientY - rect.top  - viewport.y) / viewport.zoom,
    };
  }, [viewport]);

  const ptsToStr = (pts) => pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  const onDrawPointerDown = useCallback((e) => {
    if (!isDrawingMode) return;
    e.preventDefault();
    isDrawingRef.current = true;
    const pt = toCanvasXY(e);
    currentPtsRef.current = [pt, pt]; // duplicate so polyline renders a dot
    if (liveLineRef.current) liveLineRef.current.setAttribute('points', ptsToStr(currentPtsRef.current));
    e.currentTarget.setPointerCapture(e.pointerId);
  }, [isDrawingMode, toCanvasXY]);

  const onDrawPointerMove = useCallback((e) => {
    if (!isDrawingRef.current) return;
    currentPtsRef.current.push(toCanvasXY(e));
    if (liveLineRef.current) liveLineRef.current.setAttribute('points', ptsToStr(currentPtsRef.current));
  }, [toCanvasXY]);

  const onDrawPointerUp = useCallback(() => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    if (currentPtsRef.current.length > 1) {
      addStroke({ points: [...currentPtsRef.current], color: penColor, width: penWidth });
    }
    currentPtsRef.current = [];
    if (liveLineRef.current) liveLineRef.current.setAttribute('points', '');
  }, [addStroke, penColor, penWidth]);

  const onNodeClick = useCallback((_, node) => {
    selectNode(node);
  }, [selectNode]);

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

  const handleExportImage = useCallback(() => {
    const imageWidth = 2560;
    const imageHeight = 1440;
    const nodesBounds = getNodesBounds(getNodes());
    const { x, y, zoom } = getViewportForBounds(nodesBounds, imageWidth, imageHeight, 0.5, 2, 80);
    const viewport = document.querySelector('.react-flow__viewport');
    if (!viewport) return;
    toPng(viewport, {
      backgroundColor: '#0d1117',
      width: imageWidth,
      height: imageHeight,
      style: {
        width: `${imageWidth}px`,
        height: `${imageHeight}px`,
        transform: `translate(${x}px, ${y}px) scale(${zoom})`,
      },
    }).then((dataUrl) => {
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${(useStore.getState().currentDiagramName || 'diagram').replace(/\s+/g, '-').toLowerCase()}.png`;
      a.click();
    });
  }, [getNodes]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      // Only defer to browser-native undo for text-entry fields.
      // Non-text inputs (type="color", type="range", etc.) don't have meaningful
      // native undo, so Ctrl+Z should always reach our canvas handler there.
      const TEXT_INPUT_TYPES = ['text', 'number', 'email', 'password', 'search', 'url', 'tel'];
      const inInput =
        (e.target.tagName === 'INPUT' && TEXT_INPUT_TYPES.includes(e.target.type)) ||
        e.target.tagName === 'TEXTAREA' ||
        e.target.isContentEditable;
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        openSaveModal();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !inInput) {
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [openSaveModal, undo]);

  const canvasActions = useMemo(() => ({
    autoLayout: handleAutoLayout,
    fitView: handleFitView,
    exportImage: handleExportImage,
  }), [handleAutoLayout, handleFitView, handleExportImage]);

  return (
    <CanvasActionsContext.Provider value={canvasActions}>
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
        panOnDrag={isDrawingMode ? false : [2]}
        panOnScroll={!isDrawingMode}
        panOnScrollMode="free"
        zoomOnPinch={true}
        selectionOnDrag={!isDrawingMode}
        nodesDraggable={!isDrawingMode}
        onPaneContextMenu={(e) => e.preventDefault()}
        snapToGrid
        snapGrid={[15, 15]}
        minZoom={0.2}
        maxZoom={3}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        deleteKeyCode="Delete"
        multiSelectionKeyCode="Shift"
        style={{ background: P.canvas }}
        connectionLineStyle={{ stroke: P.amber, strokeWidth: 2 }}
        connectionLineType="bezier"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={30}
          size={1}
          color={P.divider}
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
            if (!componentType) return P.divider;
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
            <div style={{ marginTop: 80, textAlign: 'center', pointerEvents: 'none', userSelect: 'none' }}>
              <div style={{
                display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 12,
                padding: '24px 32px', borderRadius: 12,
                border: `1px solid ${P.divider}`,
                background: P.surface + 'CC',
              }}>
                <svg viewBox="0 0 48 48" style={{ width: 48, height: 48, opacity: 0.4 }} fill="none">
                  <rect x="4" y="14" width="14" height="10" rx="3" stroke={P.amber} strokeWidth="2"/>
                  <rect x="20" y="10" width="14" height="10" rx="3" stroke={P.amber} strokeWidth="2"/>
                  <rect x="20" y="28" width="14" height="10" rx="3" stroke={P.amber} strokeWidth="2"/>
                  <rect x="36" y="18" width="8" height="12" rx="2" stroke={P.amber} strokeWidth="2"/>
                  <path d="M18 19h2m16 5h2M34 15v3m0 7v3" stroke={P.amber} strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 500, color: P.muted }}>Start building your pipeline</p>
                  <p style={{ fontSize: 12, color: P.faint, marginTop: 4 }}>Drag components from the left sidebar, or load a starter template</p>
                </div>
              </div>
            </div>
          </Panel>
        )}
      </ReactFlow>

      {/* Drawing overlay — sits above ReactFlow, transparent to events when not drawing */}
      <svg
        style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          pointerEvents: isDrawingMode ? 'all' : 'none',
          cursor: isDrawingMode ? 'crosshair' : 'default',
          zIndex: 10,
          touchAction: 'none',
        }}
        onPointerDown={onDrawPointerDown}
        onPointerMove={onDrawPointerMove}
        onPointerUp={onDrawPointerUp}
        onPointerLeave={onDrawPointerUp}
      >
        <g transform={`translate(${viewport.x},${viewport.y}) scale(${viewport.zoom})`}>
          {drawingStrokes.map((s, i) => (
            <polyline
              key={i}
              points={s.points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}
              fill="none"
              stroke={s.color}
              strokeWidth={s.width / viewport.zoom}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
          {/* Live stroke drawn imperatively via ref */}
          <polyline
            ref={liveLineRef}
            points=""
            fill="none"
            stroke={penColor}
            strokeWidth={penWidth / viewport.zoom}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      </svg>
    </div>
    </CanvasActionsContext.Provider>
  );
}

export { getAutoLayoutedElements };
