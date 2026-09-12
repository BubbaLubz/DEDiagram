// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ReactFlowProvider } from 'reactflow';
import ComponentNode from '../ComponentNode';
import useStore from '../../../store';

afterEach(cleanup);

function renderNode(data) {
  return render(
    <ReactFlowProvider>
      <ComponentNode id="node-1" data={data} selected={false} />
    </ReactFlowProvider>,
  );
}

beforeEach(() => {
  useStore.setState({ erdWorkspaceNodeId: null, nodes: [], docCells: [], activeCellId: null });
});

describe('ComponentNode › schema badge', () => {
  it('shows the empty (dashed "+") affordance and no table-count row when there is no schema', () => {
    renderNode({ componentType: 'postgresql' });
    expect(screen.getByTitle('Add a schema')).toBeInTheDocument();
    expect(screen.queryByText(/table/)).not.toBeInTheDocument();
  });

  it('shows the filled badge and table-count row once a schema is attached', () => {
    renderNode({ componentType: 'postgresql', schema: { tables: [{ id: 't1' }, { id: 't2' }] } });
    expect(screen.getByTitle('Open ERD — 2 tables')).toBeInTheDocument();
    expect(screen.getByText('2 tables')).toBeInTheDocument();
    expect(screen.getByText('Open ERD')).toBeInTheDocument();
  });

  it('singularizes the count for exactly one table', () => {
    renderNode({ componentType: 'postgresql', schema: { tables: [{ id: 't1' }] } });
    expect(screen.getByText('1 table')).toBeInTheDocument();
  });

  it('opens the ERD workspace scoped to this node when the badge is clicked', () => {
    renderNode({ componentType: 'postgresql' });
    fireEvent.click(screen.getByTitle('Add a schema'));
    expect(useStore.getState().erdWorkspaceNodeId).toBe('node-1');
  });

  it('opens the ERD workspace when the table-count row is clicked', () => {
    renderNode({ componentType: 'postgresql', schema: { tables: [{ id: 't1' }] } });
    fireEvent.click(screen.getByText('Open ERD'));
    expect(useStore.getState().erdWorkspaceNodeId).toBe('node-1');
  });
});
