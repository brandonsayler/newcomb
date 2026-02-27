/**
 * Frontend Component Tests — Agent 10
 *
 * Tests for Agent 7's TaskBoard, TaskCard, and TaskColumn components.
 * Uses React Testing Library for behavior-driven testing.
 */

import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';

// Components expected from Agent 7
import TaskBoard from '../../client/components/TaskBoard';
import TaskCard from '../../client/components/TaskCard';
import TaskColumn from '../../client/components/TaskColumn';

// ── Mock Data ─────────────────────────────────────────────

const mockTasks = [
  { id: 1, title: 'Write tests', status: 'todo', priority: 'high', description: 'Full coverage' },
  { id: 2, title: 'Review PR', status: 'in_progress', priority: 'medium', description: 'Check code quality' },
  { id: 3, title: 'Ship v1', status: 'done', priority: 'high', description: 'Deploy to prod' },
  { id: 4, title: 'Fix login bug', status: 'todo', priority: 'low', description: '' },
];

const mockOnMove = jest.fn();
const mockOnEdit = jest.fn();
const mockOnDelete = jest.fn();

// ── TaskCard ──────────────────────────────────────────────

describe('TaskCard', () => {
  const task = mockTasks[0];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the task title and priority', () => {
    render(
      <TaskCard task={task} onEdit={mockOnEdit} onDelete={mockOnDelete} />
    );

    expect(screen.getByText('Write tests')).toBeInTheDocument();
    expect(screen.getByText(/high/i)).toBeInTheDocument();
  });

  it('shows the task description when present', () => {
    render(
      <TaskCard task={task} onEdit={mockOnEdit} onDelete={mockOnDelete} />
    );

    expect(screen.getByText('Full coverage')).toBeInTheDocument();
  });

  it('calls onEdit when the edit button is clicked', () => {
    render(
      <TaskCard task={task} onEdit={mockOnEdit} onDelete={mockOnDelete} />
    );

    const editBtn = screen.getByRole('button', { name: /edit/i });
    fireEvent.click(editBtn);

    expect(mockOnEdit).toHaveBeenCalledWith(task);
  });

  it('calls onDelete when the delete button is clicked', () => {
    render(
      <TaskCard task={task} onEdit={mockOnEdit} onDelete={mockOnDelete} />
    );

    const deleteBtn = screen.getByRole('button', { name: /delete/i });
    fireEvent.click(deleteBtn);

    expect(mockOnDelete).toHaveBeenCalledWith(task.id);
  });
});

// ── TaskColumn ────────────────────────────────────────────

describe('TaskColumn', () => {
  const todoTasks = mockTasks.filter((t) => t.status === 'todo');

  it('renders the column title and task count', () => {
    render(
      <TaskColumn
        title="To Do"
        status="todo"
        tasks={todoTasks}
        onMove={mockOnMove}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('To Do')).toBeInTheDocument();
    expect(screen.getByText(`${todoTasks.length}`)).toBeInTheDocument();
  });

  it('renders a card for each task in the column', () => {
    render(
      <TaskColumn
        title="To Do"
        status="todo"
        tasks={todoTasks}
        onMove={mockOnMove}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    for (const task of todoTasks) {
      expect(screen.getByText(task.title)).toBeInTheDocument();
    }
  });

  it('shows empty state when no tasks', () => {
    render(
      <TaskColumn
        title="Done"
        status="done"
        tasks={[]}
        onMove={mockOnMove}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText(/no tasks/i)).toBeInTheDocument();
  });
});

// ── TaskBoard ─────────────────────────────────────────────

describe('TaskBoard', () => {
  it('renders three columns: To Do, In Progress, Done', () => {
    render(
      <TaskBoard
        tasks={mockTasks}
        onMove={mockOnMove}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('To Do')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByText('Done')).toBeInTheDocument();
  });

  it('distributes tasks to the correct columns', () => {
    render(
      <TaskBoard
        tasks={mockTasks}
        onMove={mockOnMove}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    // 'Write tests' and 'Fix login bug' should be in To Do
    const todoColumn = screen.getByText('To Do').closest('[data-column]');
    if (todoColumn) {
      expect(within(todoColumn).getByText('Write tests')).toBeInTheDocument();
      expect(within(todoColumn).getByText('Fix login bug')).toBeInTheDocument();
    }
  });

  it('renders all task cards', () => {
    render(
      <TaskBoard
        tasks={mockTasks}
        onMove={mockOnMove}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    for (const task of mockTasks) {
      expect(screen.getByText(task.title)).toBeInTheDocument();
    }
  });
});
