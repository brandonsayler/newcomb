/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  KANBAN BOARD — 10-Agent Collaborative Build                ║
 * ║  Schelling Point Project: Each agent builds component N     ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * AGENT 1 (this file's primary author): App Shell & Integration Hub
 *   - Top-level layout, app chrome, view routing
 *   - Orchestrates all child components
 *   - Defines shared interfaces/contracts
 *
 * Other agents provide their components (marked with ═══ AGENT N ═══)
 * Each section below is a placeholder that agent N would fully build.
 */

import { useState, useReducer, useRef, useCallback, useEffect, createContext, useContext, useMemo } from "react";

// ═══════════════════════════════════════════════════════════════
// AGENT 10 — Seed Data & Persistence
// ═══════════════════════════════════════════════════════════════
const SEED_DATA = {
  columns: [
    { id: "col-backlog", title: "Backlog", color: "#8b5cf6" },
    { id: "col-todo", title: "To Do", color: "#f59e0b" },
    { id: "col-progress", title: "In Progress", color: "#3b82f6" },
    { id: "col-review", title: "Review", color: "#ec4899" },
    { id: "col-done", title: "Done", color: "#10b981" },
  ],
  tasks: [
    { id: "t1", columnId: "col-backlog", title: "Research competitor landscape", desc: "Analyze top 5 competitors", priority: "low", tags: ["research"] },
    { id: "t2", columnId: "col-backlog", title: "Design token system", desc: "Create design tokens for spacing, color, type", priority: "medium", tags: ["design"] },
    { id: "t3", columnId: "col-todo", title: "Set up CI/CD pipeline", desc: "GitHub Actions for build, test, deploy", priority: "high", tags: ["devops"] },
    { id: "t4", columnId: "col-todo", title: "Write API documentation", desc: "OpenAPI spec for all endpoints", priority: "medium", tags: ["docs"] },
    { id: "t5", columnId: "col-progress", title: "Implement auth flow", desc: "OAuth2 + magic link sign-in", priority: "high", tags: ["backend", "auth"] },
    { id: "t6", columnId: "col-progress", title: "Build dashboard charts", desc: "Revenue, users, engagement metrics", priority: "medium", tags: ["frontend"] },
    { id: "t7", columnId: "col-review", title: "Accessibility audit", desc: "WCAG 2.1 AA compliance check", priority: "high", tags: ["qa"] },
    { id: "t8", columnId: "col-done", title: "Project kickoff meeting", desc: "Align team on Q1 goals", priority: "low", tags: ["planning"] },
    { id: "t9", columnId: "col-done", title: "Set up monorepo", desc: "Turborepo with shared packages", priority: "medium", tags: ["devops"] },
    { id: "t10", columnId: "col-backlog", title: "User interview synthesis", desc: "Compile insights from 12 interviews", priority: "high", tags: ["research", "ux"] },
    { id: "t11", columnId: "col-todo", title: "Mobile responsive pass", desc: "Ensure all views work on 375px+", priority: "medium", tags: ["frontend"] },
    { id: "t12", columnId: "col-progress", title: "Database migration script", desc: "Migrate from Postgres 14 to 16", priority: "low", tags: ["backend", "devops"] },
  ],
};

// ═══════════════════════════════════════════════════════════════
// AGENT 9 — Theme & Style Constants
// ═══════════════════════════════════════════════════════════════
const THEME = {
  bg: "#0f0f12",
  surface: "#1a1a22",
  surfaceHover: "#22222e",
  border: "#2a2a3a",
  borderLight: "#35354a",
  text: "#e4e4ef",
  textMuted: "#8888a4",
  textDim: "#5c5c78",
  accent: "#6d5aff",
  accentGlow: "rgba(109,90,255,0.25)",
  danger: "#ef4444",
  success: "#10b981",
  warning: "#f59e0b",
  fontMono: "'JetBrains Mono', 'Fira Code', monospace",
  fontSans: "'DM Sans', 'Segoe UI', sans-serif",
  fontDisplay: "'Space Grotesk', 'DM Sans', sans-serif",
  radius: "10px",
  radiusSm: "6px",
  shadow: "0 4px 24px rgba(0,0,0,0.4)",
  shadowSm: "0 2px 8px rgba(0,0,0,0.3)",
  transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
};

const PRIORITY_COLORS = {
  low: { bg: "#10b98120", text: "#10b981", dot: "#10b981" },
  medium: { bg: "#f59e0b20", text: "#f59e0b", dot: "#f59e0b" },
  high: { bg: "#ef444420", text: "#ef4444", dot: "#ef4444" },
};

// ═══════════════════════════════════════════════════════════════
// AGENT 2 — State Management (useReducer store)
// ═══════════════════════════════════════════════════════════════
const AppContext = createContext(null);

const ACTION = {
  ADD_TASK: "ADD_TASK",
  DELETE_TASK: "DELETE_TASK",
  MOVE_TASK: "MOVE_TASK",
  UPDATE_TASK: "UPDATE_TASK",
  SET_FILTER: "SET_FILTER",
  SET_SEARCH: "SET_SEARCH",
  SET_DRAGGING: "SET_DRAGGING",
  ADD_COLUMN: "ADD_COLUMN",
};

function appReducer(state, action) {
  switch (action.type) {
    case ACTION.ADD_TASK:
      return { ...state, tasks: [...state.tasks, { ...action.payload, id: "t" + Date.now() }] };
    case ACTION.DELETE_TASK:
      return { ...state, tasks: state.tasks.filter((t) => t.id !== action.payload) };
    case ACTION.MOVE_TASK:
      return {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === action.payload.taskId ? { ...t, columnId: action.payload.columnId } : t
        ),
      };
    case ACTION.UPDATE_TASK:
      return {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === action.payload.id ? { ...t, ...action.payload } : t
        ),
      };
    case ACTION.SET_FILTER:
      return { ...state, filter: action.payload };
    case ACTION.SET_SEARCH:
      return { ...state, search: action.payload };
    case ACTION.SET_DRAGGING:
      return { ...state, dragging: action.payload };
    default:
      return state;
  }
}

// ═══════════════════════════════════════════════════════════════
// AGENT 8 — Search & Filter Bar
// ═══════════════════════════════════════════════════════════════
function SearchFilterBar() {
  const { state, dispatch } = useContext(AppContext);
  const allTags = useMemo(() => {
    const s = new Set();
    state.tasks.forEach((t) => t.tags?.forEach((tag) => s.add(tag)));
    return [...s].sort();
  }, [state.tasks]);

  return (
    <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
      <div style={{ position: "relative", flex: "1 1 200px", maxWidth: "320px" }}>
        <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: THEME.textDim, fontSize: "14px" }}>⌕</span>
        <input
          type="text"
          placeholder="Search tasks..."
          value={state.search || ""}
          onChange={(e) => dispatch({ type: ACTION.SET_SEARCH, payload: e.target.value })}
          style={{
            width: "100%",
            padding: "8px 12px 8px 34px",
            background: THEME.surface,
            border: `1px solid ${THEME.border}`,
            borderRadius: THEME.radiusSm,
            color: THEME.text,
            fontSize: "13px",
            outline: "none",
            transition: THEME.transition,
            boxSizing: "border-box",
          }}
        />
      </div>
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
        {["all", "high", "medium", "low"].map((f) => (
          <button
            key={f}
            onClick={() => dispatch({ type: ACTION.SET_FILTER, payload: f === "all" ? null : f })}
            style={{
              padding: "5px 12px",
              fontSize: "12px",
              fontWeight: 600,
              borderRadius: "20px",
              border: "1px solid",
              cursor: "pointer",
              textTransform: "capitalize",
              transition: THEME.transition,
              ...(state.filter === f || (f === "all" && !state.filter)
                ? { background: THEME.accent, borderColor: THEME.accent, color: "#fff" }
                : { background: "transparent", borderColor: THEME.border, color: THEME.textMuted }),
            }}
          >
            {f}
          </button>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// AGENT 5 — Card / Task Component
// ═══════════════════════════════════════════════════════════════
function TaskCard({ task, onDelete }) {
  const { dispatch, state } = useContext(AppContext);
  const p = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.low;
  const isDragging = state.dragging === task.id;

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", task.id);
        dispatch({ type: ACTION.SET_DRAGGING, payload: task.id });
      }}
      onDragEnd={() => dispatch({ type: ACTION.SET_DRAGGING, payload: null })}
      style={{
        background: THEME.surface,
        border: `1px solid ${isDragging ? THEME.accent : THEME.border}`,
        borderRadius: THEME.radius,
        padding: "14px",
        cursor: "grab",
        transition: THEME.transition,
        opacity: isDragging ? 0.5 : 1,
        transform: isDragging ? "rotate(2deg) scale(1.02)" : "none",
        boxShadow: isDragging ? `0 0 20px ${THEME.accentGlow}` : THEME.shadowSm,
      }}
      onMouseEnter={(e) => { if (!isDragging) e.currentTarget.style.borderColor = THEME.borderLight; }}
      onMouseLeave={(e) => { if (!isDragging) e.currentTarget.style.borderColor = THEME.border; }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
        <span
          style={{
            fontSize: "10px",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            padding: "2px 8px",
            borderRadius: "20px",
            background: p.bg,
            color: p.text,
          }}
        >
          {task.priority}
        </span>
        <button
          onClick={() => dispatch({ type: ACTION.DELETE_TASK, payload: task.id })}
          style={{
            background: "none",
            border: "none",
            color: THEME.textDim,
            cursor: "pointer",
            fontSize: "14px",
            padding: "0 2px",
            lineHeight: 1,
            transition: THEME.transition,
          }}
          onMouseEnter={(e) => (e.target.style.color = THEME.danger)}
          onMouseLeave={(e) => (e.target.style.color = THEME.textDim)}
        >
          ×
        </button>
      </div>
      <h4 style={{ margin: "0 0 6px 0", fontSize: "13.5px", fontWeight: 600, color: THEME.text, lineHeight: 1.35 }}>
        {task.title}
      </h4>
      {task.desc && (
        <p style={{ margin: "0 0 10px 0", fontSize: "12px", color: THEME.textMuted, lineHeight: 1.5 }}>
          {task.desc}
        </p>
      )}
      {task.tags?.length > 0 && (
        <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
          {task.tags.map((tag) => (
            <span
              key={tag}
              style={{
                fontSize: "10px",
                padding: "2px 7px",
                borderRadius: "4px",
                background: `${THEME.accent}18`,
                color: THEME.accent,
                fontWeight: 500,
                fontFamily: THEME.fontMono,
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// AGENT 6 — Add Task Modal / Form
// ═══════════════════════════════════════════════════════════════
function AddTaskModal({ columnId, onClose }) {
  const { dispatch, state } = useContext(AppContext);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [priority, setPriority] = useState("medium");
  const [tagStr, setTagStr] = useState("");
  const inputRef = useRef(null);

  useEffect(() => inputRef.current?.focus(), []);

  const handleSubmit = () => {
    if (!title.trim()) return;
    dispatch({
      type: ACTION.ADD_TASK,
      payload: {
        columnId,
        title: title.trim(),
        desc: desc.trim(),
        priority,
        tags: tagStr.split(",").map((s) => s.trim()).filter(Boolean),
      },
    });
    onClose();
  };

  const inputStyle = {
    width: "100%",
    padding: "10px 12px",
    background: THEME.bg,
    border: `1px solid ${THEME.border}`,
    borderRadius: THEME.radiusSm,
    color: THEME.text,
    fontSize: "13px",
    outline: "none",
    boxSizing: "border-box",
    fontFamily: THEME.fontSans,
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        animation: "fadeIn 0.15s ease",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: THEME.surface,
          border: `1px solid ${THEME.border}`,
          borderRadius: "14px",
          padding: "28px",
          width: "420px",
          maxWidth: "90vw",
          boxShadow: THEME.shadow,
        }}
      >
        <h3 style={{ margin: "0 0 20px", color: THEME.text, fontSize: "16px", fontWeight: 700 }}>
          New Task
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <input ref={inputRef} placeholder="Task title *" value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} onKeyDown={(e) => e.key === "Enter" && handleSubmit()} />
          <textarea placeholder="Description (optional)" value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} style={{ ...inputStyle, resize: "vertical" }} />
          <div style={{ display: "flex", gap: "8px" }}>
            {["low", "medium", "high"].map((p) => (
              <button
                key={p}
                onClick={() => setPriority(p)}
                style={{
                  flex: 1,
                  padding: "8px",
                  fontSize: "12px",
                  fontWeight: 600,
                  textTransform: "capitalize",
                  borderRadius: THEME.radiusSm,
                  cursor: "pointer",
                  border: "1px solid",
                  transition: THEME.transition,
                  ...(priority === p
                    ? { background: PRIORITY_COLORS[p].bg, borderColor: PRIORITY_COLORS[p].text, color: PRIORITY_COLORS[p].text }
                    : { background: "transparent", borderColor: THEME.border, color: THEME.textMuted }),
                }}
              >
                {p}
              </button>
            ))}
          </div>
          <input placeholder="Tags (comma-separated)" value={tagStr} onChange={(e) => setTagStr(e.target.value)} style={inputStyle} />
          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "6px" }}>
            <button
              onClick={onClose}
              style={{
                padding: "8px 18px",
                background: "transparent",
                border: `1px solid ${THEME.border}`,
                borderRadius: THEME.radiusSm,
                color: THEME.textMuted,
                cursor: "pointer",
                fontSize: "13px",
                transition: THEME.transition,
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              style={{
                padding: "8px 22px",
                background: THEME.accent,
                border: "none",
                borderRadius: THEME.radiusSm,
                color: "#fff",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: 600,
                transition: THEME.transition,
                opacity: title.trim() ? 1 : 0.5,
              }}
            >
              Create Task
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// AGENT 4 — Column Component (with AGENT 7 Drag & Drop zones)
// ═══════════════════════════════════════════════════════════════
function Column({ column, tasks }) {
  const { dispatch, state } = useContext(AppContext);
  const [addingTask, setAddingTask] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const taskId = e.dataTransfer.getData("text/plain");
    if (taskId) {
      dispatch({ type: ACTION.MOVE_TASK, payload: { taskId, columnId: column.id } });
      dispatch({ type: ACTION.SET_DRAGGING, payload: null });
    }
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      style={{
        flex: "0 0 280px",
        display: "flex",
        flexDirection: "column",
        maxHeight: "100%",
        background: dragOver ? `${column.color}08` : "transparent",
        borderRadius: "14px",
        border: dragOver ? `2px dashed ${column.color}55` : "2px dashed transparent",
        padding: "4px",
        transition: "all 0.2s ease",
      }}
    >
      {/* Column header */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 8px 14px", position: "sticky", top: 0 }}>
        <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: column.color, boxShadow: `0 0 8px ${column.color}66` }} />
        <h3 style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: THEME.text, letterSpacing: "0.03em", textTransform: "uppercase", fontFamily: THEME.fontMono }}>
          {column.title}
        </h3>
        <span style={{ fontSize: "11px", color: THEME.textDim, fontFamily: THEME.fontMono, fontWeight: 600 }}>{tasks.length}</span>
        <div style={{ flex: 1 }} />
        <button
          onClick={() => setAddingTask(true)}
          style={{
            background: "none",
            border: `1px solid ${THEME.border}`,
            borderRadius: "6px",
            color: THEME.textMuted,
            cursor: "pointer",
            fontSize: "16px",
            width: "26px",
            height: "26px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: THEME.transition,
            lineHeight: 1,
          }}
          onMouseEnter={(e) => { e.target.style.borderColor = THEME.accent; e.target.style.color = THEME.accent; }}
          onMouseLeave={(e) => { e.target.style.borderColor = THEME.border; e.target.style.color = THEME.textMuted; }}
        >
          +
        </button>
      </div>

      {/* Cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px", overflowY: "auto", paddingRight: "2px", flex: 1 }}>
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} />
        ))}
        {tasks.length === 0 && (
          <div style={{ padding: "30px 15px", textAlign: "center", color: THEME.textDim, fontSize: "12px", fontStyle: "italic" }}>
            Drop tasks here
          </div>
        )}
      </div>

      {addingTask && <AddTaskModal columnId={column.id} onClose={() => setAddingTask(false)} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// AGENT 3 — Board Component
// ═══════════════════════════════════════════════════════════════
function Board() {
  const { state } = useContext(AppContext);

  const filteredTasks = useMemo(() => {
    let result = state.tasks;
    if (state.filter) result = result.filter((t) => t.priority === state.filter);
    if (state.search) {
      const q = state.search.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.desc?.toLowerCase().includes(q) ||
          t.tags?.some((tag) => tag.toLowerCase().includes(q))
      );
    }
    return result;
  }, [state.tasks, state.filter, state.search]);

  return (
    <div
      style={{
        display: "flex",
        gap: "20px",
        overflowX: "auto",
        flex: 1,
        padding: "0 0 16px",
        minHeight: 0,
      }}
    >
      {state.columns.map((col) => (
        <Column key={col.id} column={col} tasks={filteredTasks.filter((t) => t.columnId === col.id)} />
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// AGENT 1 — App Shell, Layout & Integration Hub ⭐ (PRIMARY)
// ═══════════════════════════════════════════════════════════════
export default function App() {
  const [state, dispatch] = useReducer(appReducer, {
    columns: SEED_DATA.columns,
    tasks: SEED_DATA.tasks,
    filter: null,
    search: "",
    dragging: null,
  });

  const taskStats = useMemo(() => {
    const total = state.tasks.length;
    const done = state.tasks.filter((t) => t.columnId === "col-done").length;
    const inProgress = state.tasks.filter((t) => t.columnId === "col-progress").length;
    const high = state.tasks.filter((t) => t.priority === "high").length;
    return { total, done, inProgress, high };
  }, [state.tasks]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {/* Global Styles */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${THEME.border}; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: ${THEME.borderLight}; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div
        style={{
          fontFamily: THEME.fontSans,
          background: THEME.bg,
          color: THEME.text,
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* ─── TOP NAV BAR ─── */}
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 28px",
            borderBottom: `1px solid ${THEME.border}`,
            background: `${THEME.surface}cc`,
            backdropFilter: "blur(12px)",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                background: `linear-gradient(135deg, ${THEME.accent}, #a855f7)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "16px",
                fontWeight: 800,
                color: "#fff",
                boxShadow: `0 0 16px ${THEME.accentGlow}`,
              }}
            >
              K
            </div>
            <div>
              <h1
                style={{
                  fontSize: "17px",
                  fontWeight: 700,
                  fontFamily: THEME.fontDisplay,
                  letterSpacing: "-0.02em",
                  background: `linear-gradient(135deg, ${THEME.text}, ${THEME.accent})`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Kanban
              </h1>
              <p style={{ fontSize: "11px", color: THEME.textDim, marginTop: "1px", fontFamily: THEME.fontMono }}>
                10-agent collaborative build
              </p>
            </div>
          </div>

          {/* Quick stats */}
          <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
            {[
              { label: "Total", value: taskStats.total, color: THEME.textMuted },
              { label: "Active", value: taskStats.inProgress, color: "#3b82f6" },
              { label: "Urgent", value: taskStats.high, color: "#ef4444" },
              { label: "Done", value: taskStats.done, color: "#10b981" },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ textAlign: "center" }}>
                <div style={{ fontSize: "18px", fontWeight: 700, color, fontFamily: THEME.fontMono }}>{value}</div>
                <div style={{ fontSize: "10px", color: THEME.textDim, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
              </div>
            ))}
          </div>
        </header>

        {/* ─── TOOLBAR ─── */}
        <div
          style={{
            padding: "14px 28px",
            borderBottom: `1px solid ${THEME.border}08`,
            flexShrink: 0,
          }}
        >
          <SearchFilterBar />
        </div>

        {/* ─── MAIN BOARD AREA ─── */}
        <main style={{ flex: 1, padding: "20px 28px", overflow: "hidden", display: "flex" }}>
          <Board />
        </main>

        {/* ─── FOOTER ─── */}
        <footer
          style={{
            padding: "8px 28px",
            borderTop: `1px solid ${THEME.border}`,
            display: "flex",
            justifyContent: "space-between",
            fontSize: "10px",
            color: THEME.textDim,
            fontFamily: THEME.fontMono,
            flexShrink: 0,
          }}
        >
          <span>Agent 1 · App Shell & Integration Hub</span>
          <span>Schelling Kanban · 10 Agents · 0 Communication</span>
        </footer>
      </div>
    </AppContext.Provider>
  );
}
