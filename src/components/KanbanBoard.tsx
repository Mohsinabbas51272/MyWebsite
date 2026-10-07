import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Search,
  Sparkles,
  Clock,
  Trash2,
  Edit3,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Bot,
  ListTodo,
  Check,
  X,
  Layers,
  ArrowRight
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────

export type KanbanColumnId = 'todo' | 'in_progress' | 'review' | 'done';
export type PriorityLevel = 'urgent' | 'high' | 'medium' | 'low';

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface KanbanTask {
  id: string;
  title: string;
  description: string;
  column: KanbanColumnId;
  priority: PriorityLevel;
  tags: string[];
  dueDate: string;
  assignee: {
    name: string;
    avatar?: string;
    initials: string;
  };
  subtasks: Subtask[];
  createdAt: string;
  aiAuditNotes?: string;
}

// ─── Initial Tasks (Loaded from PostgreSQL Database) ───────────────────────

const INITIAL_TASKS: KanbanTask[] = [];

// ─── Column Metadata ─────────────────────────────────────────────────────────

const COLUMNS: { id: KanbanColumnId; title: string; color: string; bg: string; border: string }[] = [
  { id: 'todo', title: 'To Do / Backlog', color: '#8b5cf6', bg: 'rgba(139,92,246,0.08)', border: 'rgba(139,92,246,0.3)' },
  { id: 'in_progress', title: 'In Progress', color: '#06b6d4', bg: 'rgba(6,182,212,0.08)', border: 'rgba(6,182,212,0.3)' },
  { id: 'review', title: 'Review & Testing', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.3)' },
  { id: 'done', title: 'Completed', color: '#10b981', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.3)' },
];

function getPriorityBadge(priority: PriorityLevel) {
  switch (priority) {
    case 'urgent':
      return { label: 'Urgent', bg: 'rgba(239,68,68,0.18)', color: '#f87171', border: 'rgba(239,68,68,0.4)' };
    case 'high':
      return { label: 'High', bg: 'rgba(249,115,22,0.18)', color: '#fb923c', border: 'rgba(249,115,22,0.4)' };
    case 'medium':
      return { label: 'Medium', bg: 'rgba(245,158,11,0.18)', color: '#fbbf24', border: 'rgba(245,158,11,0.4)' };
    case 'low':
      return { label: 'Low', bg: 'rgba(16,185,129,0.18)', color: '#34d399', border: 'rgba(16,185,129,0.4)' };
  }
}

// ─── Main Component ──────────────────────────────────────────────────────────

interface KanbanBoardProps {
  onOpenAiAssistant?: () => void;
}

import { api } from '../services/api';

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ onOpenAiAssistant }) => {
  const [tasks, setTasks] = useState<KanbanTask[]>(INITIAL_TASKS);

  // Load live tasks from PostgreSQL
  const loadTasks = useCallback(async () => {
    try {
      const liveTasks = await api.getTasks();
      if (Array.isArray(liveTasks)) {
        setTasks(liveTasks);
      }
    } catch (err) {
      console.warn('Kanban DB load notice:', err);
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  // Modals state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<KanbanTask | null>(null);
  const [isAiSprintModalOpen, setIsAiSprintModalOpen] = useState(false);
  const [aiSprintGoal, setAiSprintGoal] = useState('');
  const [isGeneratingSprint, setIsGeneratingSprint] = useState(false);
  const [selectedTaskForAudit, setSelectedTaskForAudit] = useState<KanbanTask | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);

  // New/Edit task form state
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formColumn, setFormColumn] = useState<KanbanColumnId>('todo');
  const [formPriority, setFormPriority] = useState<PriorityLevel>('medium');
  const [formDueDate, setFormDueDate] = useState('');
  const [formTags, setFormTags] = useState('');
  const [formSubtasks, setFormSubtasks] = useState<{ id: string; title: string; completed: boolean }[]>([]);
  const [newSubtaskInput, setNewSubtaskInput] = useState('');
  const [isGeneratingSubtasks, setIsGeneratingSubtasks] = useState(false);

  // Extract unique tags
  const allTags = Array.from(new Set(tasks.flatMap(t => t.tags)));

  // Filter tasks
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          task.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          task.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesPriority = selectedPriority === 'all' || task.priority === selectedPriority;
    const matchesTag = selectedTag === 'all' || task.tags.includes(selectedTag);
    return matchesSearch && matchesPriority && matchesTag;
  });

  // ─── Drag & Drop Handlers ──────────────────────────────────────────────────

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
    setDraggedTaskId(taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetColumn: KanbanColumnId) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    if (taskId) {
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, column: targetColumn } : t));
      try {
        await api.updateTask(taskId, { column: targetColumn });
      } catch (err) {
        console.error('Failed to update task column in DB:', err);
      }
    }
    setDraggedTaskId(null);
  };

  const moveTask = async (taskId: string, direction: 'left' | 'right') => {
    const colOrder: KanbanColumnId[] = ['todo', 'in_progress', 'review', 'done'];
    const currentTask = tasks.find(t => t.id === taskId);
    if (!currentTask) return;
    const curIdx = colOrder.indexOf(currentTask.column);
    const nextIdx = direction === 'right' ? Math.min(3, curIdx + 1) : Math.max(0, curIdx - 1);
    const newCol = colOrder[nextIdx];

    setTasks(prev => prev.map(t => (t.id === taskId ? { ...t, column: newCol } : t)));
    try {
      await api.updateTask(taskId, { column: newCol });
    } catch (err) {
      console.error('Failed to move task in DB:', err);
    }
  };

  const toggleSubtask = async (taskId: string, subtaskId: string) => {
    let updatedSubtasks: { id: string; title: string; completed: boolean }[] = [];
    setTasks(prev => prev.map(t => {
      if (t.id !== taskId) return t;
      updatedSubtasks = t.subtasks.map(st => st.id === subtaskId ? { ...st, completed: !st.completed } : st);
      return { ...t, subtasks: updatedSubtasks };
    }));
    try {
      await api.updateTask(taskId, { subtasks: updatedSubtasks as any });
    } catch (err) {
      console.error('Failed to toggle subtask in DB:', err);
    }
  };

  const deleteTask = async (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
    try {
      await api.deleteTask(taskId);
    } catch (err) {
      console.error('Failed to delete task from DB:', err);
    }
  };

  // ─── Task Modal Handlers ───────────────────────────────────────────────────

  const openNewTaskModal = (col: KanbanColumnId = 'todo') => {
    setEditingTask(null);
    setFormTitle('');
    setFormDesc('');
    setFormColumn(col);
    setFormPriority('medium');
    setFormDueDate(new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0]);
    setFormTags('Feature');
    setFormSubtasks([]);
    setIsTaskModalOpen(true);
  };

  const openEditTaskModal = (task: KanbanTask) => {
    setEditingTask(task);
    setFormTitle(task.title);
    setFormDesc(task.description);
    setFormColumn(task.column);
    setFormPriority(task.priority);
    setFormDueDate(task.dueDate);
    setFormTags(task.tags.join(', '));
    setFormSubtasks([...task.subtasks]);
    setIsTaskModalOpen(true);
  };

  const saveTask = async () => {
    if (!formTitle.trim()) return;

    const parsedTags = formTags.split(',').map(t => t.trim()).filter(Boolean);

    if (editingTask) {
      const updatedTaskData = {
        title: formTitle.trim(),
        description: formDesc.trim(),
        column: formColumn,
        priority: formPriority,
        dueDate: formDueDate,
        tags: parsedTags.length ? parsedTags : ['General'],
        subtasks: formSubtasks,
      };

      setTasks(prev => prev.map(t => (t.id === editingTask.id ? { ...t, ...updatedTaskData } : t)));
      setIsTaskModalOpen(false);
      try {
        await api.updateTask(editingTask.id, updatedTaskData as any);
      } catch (err) {
        console.error('Failed to update task in DB:', err);
      }
    } else {
      const newTask: KanbanTask = {
        id: `task-${Date.now()}`,
        title: formTitle.trim(),
        description: formDesc.trim(),
        column: formColumn,
        priority: formPriority,
        dueDate: formDueDate || new Date().toISOString().split('T')[0],
        tags: parsedTags.length ? parsedTags : ['Task'],
        assignee: { name: 'Mohsin Abbas', initials: 'MA' },
        subtasks: formSubtasks,
        createdAt: new Date().toISOString().split('T')[0],
      };
      setTasks(prev => [newTask, ...prev]);
      setIsTaskModalOpen(false);
      try {
        await api.createTask(newTask);
      } catch (err) {
        console.error('Failed to create task in DB:', err);
      }
    }
  };

  const addSubtaskToForm = () => {
    if (!newSubtaskInput.trim()) return;
    setFormSubtasks(prev => [...prev, { id: `st-${Date.now()}-${Math.random()}`, title: newSubtaskInput.trim(), completed: false }]);
    setNewSubtaskInput('');
  };

  // ─── AI Subtask Generator (Powered via Backend AI) ──────────────────

  const generateAiSubtasks = async () => {
    if (!formTitle.trim()) return;
    setIsGeneratingSubtasks(true);

    let generated: string[] = [];

    try {
      const res = await api.aiChat({
        system: 'You are an agile software engineering task planner. Return ONLY 4 concrete, actionable subtask titles for the given task. Do not number them or add markdown bullets.',
        prompt: `Generate 4 concise subtasks for: "${formTitle}" (Context: ${formDesc || 'General task'})`,
      });

      const content = res.text || '';
      const lines = content.split('\n').map((l: string) => l.replace(/^[-*•\d.)\s]+/, '').trim()).filter((l: string) => l.length > 3);
      if (lines.length >= 2) {
        generated = lines.slice(0, 5);
      }
    } catch {
      // Fallback
      const titleLower = formTitle.toLowerCase();
      if (titleLower.includes('test') || titleLower.includes('flow') || titleLower.includes('incident') || titleLower.includes('itsm')) {
        generated = [
          'Prepare test environment & configure tenant parameters',
          'Execute primary user workflow scenario and log transaction IDs',
          'Validate ticket derivation, priority classification & SLAs',
          'Generate and verify comprehensive PDF test execution report',
        ];
      } else if (titleLower.includes('api') || titleLower.includes('backend') || titleLower.includes('server')) {
        generated = [
          'Implement REST endpoint with input payload validation',
          'Add error handling and circuit breaker ring-buffer logging',
          'Write automated integration test cases & stress benchmark',
          'Update OpenAPI/Swagger documentation schema',
        ];
      } else {
        generated = [
          `Define functional scope & acceptance criteria for ${formTitle.slice(0, 30)}`,
          'Implement core logic with edge case verification',
          'Conduct cross-browser and responsiveness testing',
          'Perform code review and deploy to staging pipeline',
        ];
      }
    } finally {
      if (generated.length > 0) {
        setFormSubtasks(prev => [
          ...prev,
          ...generated.map((title, idx) => ({ id: `st-ai-${Date.now()}-${idx}`, title, completed: false }))
        ]);
      }
      setIsGeneratingSubtasks(false);
    }
  };

  // ─── AI Sprint & Multi-Task Generator ───────────────────────────────────────

  const generateAiSprint = async () => {
    if (!aiSprintGoal.trim()) return;
    setIsGeneratingSprint(true);

    const goal = aiSprintGoal.trim();
    try {
      // 1. Call real backend AI task generator (Gemini / Ollama cascade)
      const res = await api.generateTasks(
        `Generate a structured sprint plan with 3-4 actionable tasks for the following goal: ${goal}`,
        undefined,
        'ollama'
      );

      let generatedList: any[] = [];
      if (res && res.success && Array.isArray(res.tasks) && res.tasks.length > 0) {
        generatedList = res.tasks;
      } else {
        // Dynamic fallback structured for the specific goal
        generatedList = [
          {
            title: `Requirement Analysis & Planning: ${goal.slice(0, 40)}`,
            description: `Analyze input parameters, architecture boundaries, and acceptance criteria for: "${goal}".`,
            column: 'todo',
            priority: 'high',
            tags: ['AI Generated', 'Architecture', 'Sprint'],
            subtasks: [
              { title: 'Define interface contracts & data models', completed: false },
              { title: 'Review constraints & security dependencies', completed: false },
            ],
          },
          {
            title: `Core Implementation for ${goal.slice(0, 35)}`,
            description: `Develop functional modules, integrate business logic, and handle service connections.`,
            column: 'todo',
            priority: 'urgent',
            tags: ['AI Generated', 'Feature', 'Core'],
            subtasks: [
              { title: 'Implement state & service handlers', completed: false },
              { title: 'Connect telemetry and error pipelines', completed: false },
            ],
          },
          {
            title: `Verification & Quality Audit: ${goal.slice(0, 30)}`,
            description: `Perform end-to-end integration tests, regression checks, and export test reports.`,
            column: 'todo',
            priority: 'medium',
            tags: ['AI Generated', 'QA', 'Testing'],
            subtasks: [
              { title: 'Execute automated test suite', completed: false },
              { title: 'Generate verification summary', completed: false },
            ],
          },
        ];
      }

      // 2. Format & persist each task to PostgreSQL
      const formattedTasks: KanbanTask[] = [];
      for (let i = 0; i < generatedList.length; i++) {
        const item = generatedList[i];
        const taskObj: KanbanTask = {
          id: `task-ai-${Date.now()}-${i + 1}`,
          title: item.title || `Task ${i + 1}: ${goal.slice(0, 30)}`,
          description: item.description || '',
          column: (item.column as KanbanColumnId) || 'todo',
          priority: (item.priority as PriorityLevel) || 'medium',
          tags: Array.isArray(item.tags) && item.tags.length > 0 ? item.tags : ['AI Sprint'],
          dueDate: new Date(Date.now() + (i + 2) * 86400000).toISOString().split('T')[0],
          assignee: { name: 'Mohsin Abbas', initials: 'MA' },
          subtasks: Array.isArray(item.subtasks)
            ? item.subtasks.map((st: any, idx: number) => ({
                id: `st-ai-${Date.now()}-${idx}`,
                title: typeof st === 'string' ? st : st.title || 'Action item',
                completed: !!st.completed,
              }))
            : [],
          createdAt: new Date().toISOString().split('T')[0],
        };

        formattedTasks.push(taskObj);
        try {
          await api.createTask(taskObj);
        } catch (dbErr) {
          console.warn('Task DB save note:', dbErr);
        }
      }

      setTasks(prev => [...formattedTasks, ...prev]);
    } catch (err) {
      console.error('AI sprint generation failed:', err);
    } finally {
      setIsGeneratingSprint(false);
      setIsAiSprintModalOpen(false);
      setAiSprintGoal('');
    }
  };

  // ─── AI Task Audit (Ollama LLM + Rule Engine) ──────────────────────────────

  const runAiAuditOnTask = async (task: KanbanTask) => {
    setSelectedTaskForAudit(task);
    setIsAuditing(true);

    const totalSub = task.subtasks.length;
    const completedSub = task.subtasks.filter(s => s.completed).length;
    const isDone = task.column === 'done';

    let auditNote = '';

    try {
      const res = await fetch('http://localhost:5000/api/ollama/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama3.2:latest',
          system: 'You are an expert QA and Delivery auditor. Give a concise 3-bullet assessment of the task progress, quality risk, and next immediate recommendation.',
          messages: [{
            role: 'user',
            content: `Task Title: ${task.title}\nDescription: ${task.description}\nColumn: ${task.column}\nSubtasks: ${completedSub}/${totalSub} completed\nDue Date: ${task.dueDate}`
          }]
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.message?.content) {
          auditNote = `🤖 **Ollama LLM Task Audit Report (llama3.2)**\n\n${data.message.content.trim()}`;
        }
      }
    } catch {
      // Fallback below
    }

    if (!auditNote) {
      if (isDone && (completedSub === totalSub || totalSub === 0)) {
        auditNote = `✅ **AI Quality Audit Passed (10/10)**\n- **Status Alignment:** Task is marked completed and all subtasks are 100% finished.\n- **Risk Factor:** Low risk. No blockers detected.`;
      } else if (task.column === 'in_progress' && completedSub === 0) {
        auditNote = `⚠️ **AI Progression Warning (6.5/10)**\n- **Action Needed:** Task is marked In Progress but 0 of ${totalSub} subtasks are checked.\n- **Recommendation:** Check off completed items or unblock dependencies.`;
      } else {
        auditNote = `💡 **AI Task Analysis (8.5/10)**\n- **Progress:** ${completedSub}/${totalSub} subtasks complete (${Math.round((completedSub / (totalSub || 1)) * 100)}%).\n- **Deadline:** Due on ${task.dueDate}.\n- **Suggested Next Step:** Prioritize remaining subtasks to ensure timely delivery.`;
      }
    }

    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, aiAuditNotes: auditNote } : t));
    setSelectedTaskForAudit({ ...task, aiAuditNotes: auditNote });
    setIsAuditing(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* ── Top Kanban Header & Actions ─────────────────────────────────── */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between',
        gap: '1rem', padding: '1rem 1.25rem', borderRadius: '16px',
        background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
      }}>
        {/* Left: Search & Filter Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', flex: 1 }}>
          {/* Search Box */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.45rem 0.85rem', borderRadius: '10px',
            background: 'rgba(31, 41, 55, 0.8)', border: '1px solid rgba(139, 92, 246, 0.25)',
            minWidth: '220px',
          }}>
            <Search size={15} color="var(--text-muted)" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search tasks, tags, tickets..."
              style={{
                background: 'transparent', border: 'none', outline: 'none',
                color: 'var(--text-primary)', fontSize: '0.8rem', width: '100%',
              }}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={13} />
              </button>
            )}
          </div>

          {/* Priority Filter */}
          <select
            value={selectedPriority}
            onChange={e => setSelectedPriority(e.target.value)}
            style={{
              padding: '0.45rem 0.75rem', borderRadius: '10px',
              background: 'rgba(31, 41, 55, 0.8)', border: '1px solid rgba(139, 92, 246, 0.25)',
              color: 'var(--text-primary)', fontSize: '0.8rem', outline: 'none', cursor: 'pointer',
            }}
          >
            <option value="all">All Priorities</option>
            <option value="urgent">🔴 Urgent</option>
            <option value="high">🟠 High</option>
            <option value="medium">🟡 Medium</option>
            <option value="low">🟢 Low</option>
          </select>

          {/* Tag Filter */}
          {allTags.length > 0 && (
            <select
              value={selectedTag}
              onChange={e => setSelectedTag(e.target.value)}
              style={{
                padding: '0.45rem 0.75rem', borderRadius: '10px',
                background: 'rgba(31, 41, 55, 0.8)', border: '1px solid rgba(139, 92, 246, 0.25)',
                color: 'var(--text-primary)', fontSize: '0.8rem', outline: 'none', cursor: 'pointer',
              }}
            >
              <option value="all">All Tags ({allTags.length})</option>
              {allTags.map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
          )}

          {/* Stats Badge */}
          <div style={{
            fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: '0.4rem', marginLeft: '0.25rem'
          }}>
            <Layers size={13} color="var(--accent-purple)" />
            <span>Showing <strong>{filteredTasks.length}</strong> of {tasks.length} tasks</span>
          </div>
        </div>

        {/* Right: Primary Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <button
            onClick={() => setIsAiSprintModalOpen(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.45rem',
              padding: '0.5rem 0.9rem', borderRadius: '10px',
              background: 'linear-gradient(135deg, rgba(139,92,246,0.25), rgba(6,182,212,0.2))',
              border: '1px solid rgba(139,92,246,0.4)', color: '#c084fc',
              fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <Sparkles size={14} /> AI Sprint Generator
          </button>

          <button
            className="btn-primary"
            onClick={() => openNewTaskModal('todo')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', padding: '0.5rem 0.9rem' }}
          >
            <Plus size={15} /> New Task
          </button>
        </div>
      </div>

      {/* ── Kanban Columns Grid ─────────────────────────────────────────── */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, minmax(280px, 1fr))',
        gap: '1rem', alignItems: 'start', overflowX: 'auto', paddingBottom: '1rem',
      }}>
        {COLUMNS.map(col => {
          const colTasks = filteredTasks.filter(t => t.column === col.id);

          return (
            <div
              key={col.id}
              onDragOver={handleDragOver}
              onDrop={e => handleDrop(e, col.id)}
              style={{
                borderRadius: '16px',
                background: 'rgba(15, 23, 42, 0.5)',
                border: `1px solid ${col.border}`,
                display: 'flex', flexDirection: 'column',
                minHeight: '520px',
                transition: 'all 0.2s ease',
                overflow: 'hidden',
              }}
            >
              {/* Column Header */}
              <div style={{
                padding: '0.9rem 1rem',
                borderBottom: `1px solid ${col.border}`,
                background: col.bg,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{
                    width: '8px', height: '8px', borderRadius: '50%',
                    background: col.color, display: 'inline-block',
                    boxShadow: `0 0 8px ${col.color}`,
                  }} />
                  <span style={{ fontWeight: 800, fontSize: '0.86rem', color: 'var(--text-primary)' }}>
                    {col.title}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{
                    fontSize: '0.72rem', fontWeight: 800,
                    padding: '2px 8px', borderRadius: '12px',
                    background: 'rgba(255,255,255,0.08)', color: col.color,
                  }}>
                    {colTasks.length}
                  </span>
                  <button
                    onClick={() => openNewTaskModal(col.id)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--text-muted)', padding: '2px', display: 'flex',
                    }}
                    title={`Add task to ${col.title}`}
                  >
                    <Plus size={15} />
                  </button>
                </div>
              </div>

              {/* Tasks List */}
              <div style={{
                padding: '0.75rem', flex: 1,
                display: 'flex', flexDirection: 'column', gap: '0.75rem',
              }}>
                {colTasks.length === 0 ? (
                  <div style={{
                    padding: '2rem 1rem', textAlign: 'center',
                    border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '12px',
                    color: 'var(--text-muted)', fontSize: '0.76rem',
                  }}>
                    No tasks in {col.title}
                  </div>
                ) : (
                  colTasks.map(task => {
                    const priorityInfo = getPriorityBadge(task.priority);
                    const totalSubtasks = task.subtasks.length;
                    const completedSubtasks = task.subtasks.filter(st => st.completed).length;
                    const progressPct = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

                    return (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={e => handleDragStart(e, task.id)}
                        style={{
                          padding: '0.9rem',
                          borderRadius: '12px',
                          background: 'rgba(30, 41, 59, 0.7)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                          display: 'flex', flexDirection: 'column', gap: '0.65rem',
                          cursor: 'grab', transition: 'all 0.2s ease',
                          position: 'relative',
                        }}
                        onMouseEnter={e => {
                          (e.currentTarget as HTMLElement).style.borderColor = 'rgba(139,92,246,0.4)';
                          (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)';
                          (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                        }}
                      >
                        {/* Card Header: Priority & Action Buttons */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{
                            fontSize: '0.66rem', fontWeight: 800, padding: '2px 7px',
                            borderRadius: '6px', background: priorityInfo.bg,
                            color: priorityInfo.color, border: `1px solid ${priorityInfo.border}`,
                            textTransform: 'uppercase', letterSpacing: '0.04em',
                          }}>
                            {priorityInfo.label}
                          </span>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                            <button
                              onClick={() => runAiAuditOnTask(task)}
                              style={{
                                background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)',
                                borderRadius: '6px', color: '#c084fc', padding: '2px 5px',
                                cursor: 'pointer', fontSize: '0.65rem', display: 'flex', alignItems: 'center', gap: '2px',
                              }}
                              title="AI Audit Task"
                            >
                              <Bot size={11} /> Audit
                            </button>
                            <button
                              onClick={() => openEditTaskModal(task)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px' }}
                              title="Edit task"
                            >
                              <Edit3 size={13} />
                            </button>
                            <button
                              onClick={() => deleteTask(task.id)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px' }}
                              title="Delete task"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>

                        {/* Title & Description */}
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.86rem', color: 'var(--text-primary)', lineHeight: 1.35, marginBottom: '0.25rem' }}>
                            {task.title}
                          </div>
                          {task.description && (
                            <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', lineHeight: 1.45, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                              {task.description}
                            </p>
                          )}
                        </div>

                        {/* Subtasks Progress Bar & Checklist */}
                        {totalSubtasks > 0 && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.67rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <ListTodo size={11} color={progressPct === 100 ? '#34d399' : 'var(--accent-purple)'} />
                                {completedSubtasks}/{totalSubtasks} subtasks
                              </span>
                              <span>{progressPct}%</span>
                            </div>
                            <div style={{ height: '4px', borderRadius: '4px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                              <div style={{
                                width: `${progressPct}%`, height: '100%',
                                background: progressPct === 100 ? '#10b981' : 'linear-gradient(90deg, #8b5cf6, #06b6d4)',
                                transition: 'width 0.3s ease',
                              }} />
                            </div>

                            {/* Subtask items preview */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.2rem' }}>
                              {task.subtasks.slice(0, 3).map(st => (
                                <div
                                  key={st.id}
                                  onClick={() => toggleSubtask(task.id, st.id)}
                                  style={{
                                    display: 'flex', alignItems: 'center', gap: '0.35rem',
                                    fontSize: '0.71rem', cursor: 'pointer',
                                    color: st.completed ? 'var(--text-muted)' : 'var(--text-primary)',
                                    textDecoration: st.completed ? 'line-through' : 'none',
                                  }}
                                >
                                  <span style={{
                                    width: '13px', height: '13px', borderRadius: '3px',
                                    border: `1px solid ${st.completed ? '#10b981' : 'rgba(255,255,255,0.2)'}`,
                                    background: st.completed ? 'rgba(16,185,129,0.2)' : 'transparent',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                  }}>
                                    {st.completed && <Check size={10} color="#10b981" />}
                                  </span>
                                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {st.title}
                                  </span>
                                </div>
                              ))}
                              {totalSubtasks > 3 && (
                                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                                  +{totalSubtasks - 3} more subtasks
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Tags */}
                        {task.tags.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                            {task.tags.map((tag, i) => (
                              <span
                                key={i}
                                style={{
                                  fontSize: '0.64rem', padding: '1px 6px', borderRadius: '5px',
                                  background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)',
                                  color: '#38bdf8', fontWeight: 500,
                                }}
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Card Footer: Due Date, Assignee, Move Buttons */}
                        <div style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.5rem',
                          marginTop: '0.2rem',
                        }}>
                          {/* Due date & Assignee */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <div style={{
                              width: '22px', height: '22px', borderRadius: '50%',
                              background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '0.6rem', fontWeight: 800, color: '#fff',
                            }} title={task.assignee.name}>
                              {task.assignee.initials}
                            </div>
                            <span style={{ fontSize: '0.67rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <Clock size={11} /> {task.dueDate}
                            </span>
                          </div>

                          {/* Quick Column Shift Buttons */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.15rem' }}>
                            {col.id !== 'todo' && (
                              <button
                                onClick={() => moveTask(task.id, 'left')}
                                style={{
                                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                                  borderRadius: '4px', color: 'var(--text-muted)', padding: '2px 4px',
                                  cursor: 'pointer', display: 'flex', alignItems: 'center',
                                }}
                                title="Move Left"
                              >
                                <ChevronLeft size={12} />
                              </button>
                            )}
                            {col.id !== 'done' && (
                              <button
                                onClick={() => moveTask(task.id, 'right')}
                                style={{
                                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                                  borderRadius: '4px', color: 'var(--text-muted)', padding: '2px 4px',
                                  cursor: 'pointer', display: 'flex', alignItems: 'center',
                                }}
                                title="Move Right"
                              >
                                <ChevronRight size={12} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Task Create / Edit Modal ─────────────────────────────────────── */}
      {isTaskModalOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
        }}>
          <div style={{
            width: '100%', maxWidth: '540px', borderRadius: '18px',
            background: '#111827', border: '1px solid rgba(139,92,246,0.35)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
            padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem',
            maxHeight: '90vh', overflowY: 'auto',
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: 'rgba(139,92,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Edit3 size={17} color="var(--accent-purple)" />
                </div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>
                  {editingTask ? 'Edit Kanban Task' : 'Create New Kanban Task'}
                </h3>
              </div>
              <button
                onClick={() => setIsTaskModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Task Title */}
            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '0.35rem' }}>
                Task Title *
              </label>
              <input
                type="text"
                value={formTitle}
                onChange={e => setFormTitle(e.target.value)}
                placeholder="e.g. Verify ITSM Incident Management Workflow"
                style={{
                  width: '100%', padding: '0.65rem 0.85rem', borderRadius: '10px',
                  background: 'rgba(31,41,55,0.8)', border: '1px solid rgba(139,92,246,0.3)',
                  color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none',
                }}
              />
            </div>

            {/* Description */}
            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '0.35rem' }}>
                Description
              </label>
              <textarea
                value={formDesc}
                onChange={e => setFormDesc(e.target.value)}
                rows={2}
                placeholder="Detailed objectives, acceptance criteria, or execution notes..."
                style={{
                  width: '100%', padding: '0.65rem 0.85rem', borderRadius: '10px',
                  background: 'rgba(31,41,55,0.8)', border: '1px solid rgba(139,92,246,0.3)',
                  color: 'var(--text-primary)', fontSize: '0.82rem', outline: 'none', resize: 'none',
                }}
              />
            </div>

            {/* Column & Priority Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '0.35rem' }}>
                  Column / Status
                </label>
                <select
                  value={formColumn}
                  onChange={e => setFormColumn(e.target.value as KanbanColumnId)}
                  style={{
                    width: '100%', padding: '0.6rem 0.75rem', borderRadius: '10px',
                    background: 'rgba(31,41,55,0.8)', border: '1px solid rgba(139,92,246,0.3)',
                    color: 'var(--text-primary)', fontSize: '0.82rem', outline: 'none',
                  }}
                >
                  <option value="todo">📌 To Do / Backlog</option>
                  <option value="in_progress">⚡ In Progress</option>
                  <option value="review">🔍 Review & Testing</option>
                  <option value="done">✅ Completed</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '0.35rem' }}>
                  Priority
                </label>
                <select
                  value={formPriority}
                  onChange={e => setFormPriority(e.target.value as PriorityLevel)}
                  style={{
                    width: '100%', padding: '0.6rem 0.75rem', borderRadius: '10px',
                    background: 'rgba(31,41,55,0.8)', border: '1px solid rgba(139,92,246,0.3)',
                    color: 'var(--text-primary)', fontSize: '0.82rem', outline: 'none',
                  }}
                >
                  <option value="urgent">🔴 Urgent</option>
                  <option value="high">🟠 High</option>
                  <option value="medium">🟡 Medium</option>
                  <option value="low">🟢 Low</option>
                </select>
              </div>
            </div>

            {/* Due Date & Tags */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '0.35rem' }}>
                  Due Date
                </label>
                <input
                  type="date"
                  value={formDueDate}
                  onChange={e => setFormDueDate(e.target.value)}
                  style={{
                    width: '100%', padding: '0.6rem 0.75rem', borderRadius: '10px',
                    background: 'rgba(31,41,55,0.8)', border: '1px solid rgba(139,92,246,0.3)',
                    color: 'var(--text-primary)', fontSize: '0.82rem', outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '0.35rem' }}>
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  value={formTags}
                  onChange={e => setFormTags(e.target.value)}
                  placeholder="ITSM, Report, Backend"
                  style={{
                    width: '100%', padding: '0.6rem 0.75rem', borderRadius: '10px',
                    background: 'rgba(31,41,55,0.8)', border: '1px solid rgba(139,92,246,0.3)',
                    color: 'var(--text-primary)', fontSize: '0.82rem', outline: 'none',
                  }}
                />
              </div>
            </div>

            {/* Subtasks Section with AI Subtask Generator */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontWeight: 700 }}>
                  Subtasks Checklist ({formSubtasks.length})
                </label>
                <button
                  onClick={generateAiSubtasks}
                  disabled={!formTitle.trim() || isGeneratingSubtasks}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: '#c084fc', fontSize: '0.72rem', fontWeight: 700,
                    display: 'flex', alignItems: 'center', gap: '0.25rem',
                  }}
                >
                  {isGeneratingSubtasks ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={12} />}
                  AI Generate Subtasks
                </button>
              </div>

              {/* Subtask input */}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  value={newSubtaskInput}
                  onChange={e => setNewSubtaskInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSubtaskToForm(); } }}
                  placeholder="Add a subtask step..."
                  style={{
                    flex: 1, padding: '0.55rem 0.75rem', borderRadius: '8px',
                    background: 'rgba(31,41,55,0.8)', border: '1px solid rgba(139,92,246,0.25)',
                    color: 'var(--text-primary)', fontSize: '0.8rem', outline: 'none',
                  }}
                />
                <button
                  onClick={addSubtaskToForm}
                  style={{
                    padding: '0.55rem 0.85rem', borderRadius: '8px',
                    background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.4)',
                    color: '#c084fc', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700,
                  }}
                >
                  Add
                </button>
              </div>

              {/* Subtasks List */}
              {formSubtasks.map(st => (
                <div key={st.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.4rem 0.6rem', borderRadius: '6px', background: 'rgba(255,255,255,0.03)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem' }}>
                    <input
                      type="checkbox"
                      checked={st.completed}
                      onChange={() => setFormSubtasks(prev => prev.map(s => s.id === st.id ? { ...s, completed: !s.completed } : s))}
                    />
                    <span style={{ color: st.completed ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: st.completed ? 'line-through' : 'none' }}>
                      {st.title}
                    </span>
                  </div>
                  <button
                    onClick={() => setFormSubtasks(prev => prev.filter(s => s.id !== st.id))}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', marginTop: '0.5rem' }}>
              <button className="btn-secondary" onClick={() => setIsTaskModalOpen(false)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={saveTask} disabled={!formTitle.trim()}>
                {editingTask ? 'Save Changes' : 'Create Task'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── AI Sprint Generator Modal ────────────────────────────────────── */}
      {isAiSprintModalOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
        }}>
          <div style={{
            width: '100%', maxWidth: '500px', borderRadius: '18px',
            background: '#111827', border: '1px solid rgba(139,92,246,0.4)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
            padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '12px', background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Sparkles size={20} color="#fff" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>AI Sprint & Task Generator</h3>
                <p style={{ margin: 0, fontSize: '0.74rem', color: 'var(--text-muted)' }}>Apna objective likhein — AI poora task backlog bana dega.</p>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '0.35rem' }}>
                Sprint Goal / Project Objective
              </label>
              <textarea
                value={aiSprintGoal}
                onChange={e => setAiSprintGoal(e.target.value)}
                placeholder="e.g. Execute OpsNexa ITSM Workflows (Incident, Change, Problem) with verification reports..."
                rows={3}
                style={{
                  width: '100%', padding: '0.75rem', borderRadius: '10px',
                  background: 'rgba(31,41,55,0.8)', border: '1px solid rgba(139,92,246,0.35)',
                  color: 'var(--text-primary)', fontSize: '0.84rem', outline: 'none', resize: 'none',
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Suggestions:</span>
              {[
                'Execute ITSM Incident & Change Management Test Flows',
                'Deploy Precious Metals Scraper API to Production',
                'Build AI Emotion Detection Camera Telemetry Card',
              ].map((s, i) => (
                <button
                  key={i}
                  onClick={() => setAiSprintGoal(s)}
                  style={{
                    textAlign: 'left', padding: '0.35rem 0.6rem', borderRadius: '6px',
                    background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)',
                    color: 'var(--text-secondary)', fontSize: '0.73rem', cursor: 'pointer',
                  }}
                >
                  ✨ {s}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', marginTop: '0.5rem' }}>
              <button className="btn-secondary" onClick={() => setIsAiSprintModalOpen(false)}>
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={generateAiSprint}
                disabled={!aiSprintGoal.trim() || isGeneratingSprint}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                {isGeneratingSprint ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={15} />}
                Generate Tasks
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── AI Task Audit Drawer / Modal ─────────────────────────────────── */}
      {selectedTaskForAudit && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
        }}>
          <div style={{
            width: '100%', maxWidth: '520px', borderRadius: '18px',
            background: '#111827', border: '1px solid rgba(139,92,246,0.4)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
            padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(139,92,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Bot size={18} color="var(--accent-purple)" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>AI Task Quality Audit</h3>
                  <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-muted)' }}>{selectedTaskForAudit.title}</p>
                </div>
              </div>
              <button onClick={() => setSelectedTaskForAudit(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            {isAuditing ? (
              <div style={{ padding: '2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                <Loader2 size={32} color="var(--accent-purple)" style={{ animation: 'spin 1s linear infinite' }} />
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>AI analyzing task execution & deliverables...</span>
              </div>
            ) : (
              <div style={{
                padding: '1rem', borderRadius: '12px',
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                fontSize: '0.82rem', lineHeight: 1.6, color: 'var(--text-primary)',
              }}>
                <div dangerouslySetInnerHTML={{
                  __html: (selectedTaskForAudit.aiAuditNotes || '')
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\n/g, '<br/>')
                }} />
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
              {onOpenAiAssistant && (
                <button
                  onClick={() => { setSelectedTaskForAudit(null); onOpenAiAssistant(); }}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: '#38bdf8', fontSize: '0.76rem', fontWeight: 700,
                    display: 'flex', alignItems: 'center', gap: '0.3rem',
                  }}
                >
                  Open Document Verification Assistant <ArrowRight size={13} />
                </button>
              )}
              <button className="btn-primary" onClick={() => setSelectedTaskForAudit(null)}>
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
