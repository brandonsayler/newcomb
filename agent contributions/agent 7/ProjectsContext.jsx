// ============================================
// Agent 7 of 10 — Projects Context
// Manages project groupings for tasks.
// ============================================

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { projectsApi } from './api';

const ProjectsContext = createContext(null);

export function ProjectsProvider({ children }) {
  const [projects, setProjects] = useState([]);
  const [activeProject, setActiveProject] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const data = await projectsApi.getAll();
      setProjects(data.projects || data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const createProject = useCallback(async (project) => {
    const created = await projectsApi.create(project);
    setProjects((prev) => [...prev, created]);
    return created;
  }, []);

  const updateProject = useCallback(async (id, updates) => {
    const updated = await projectsApi.update(id, updates);
    setProjects((prev) => prev.map((p) => (p.id === id ? updated : p)));
    if (activeProject?.id === id) setActiveProject(updated);
    return updated;
  }, [activeProject]);

  const deleteProject = useCallback(async (id) => {
    await projectsApi.delete(id);
    setProjects((prev) => prev.filter((p) => p.id !== id));
    if (activeProject?.id === id) setActiveProject(null);
  }, [activeProject]);

  const value = {
    projects,
    activeProject,
    setActiveProject,
    loading,
    error,
    fetchProjects,
    createProject,
    updateProject,
    deleteProject,
  };

  return <ProjectsContext.Provider value={value}>{children}</ProjectsContext.Provider>;
}

export function useProjects() {
  const context = useContext(ProjectsContext);
  if (!context) {
    throw new Error('useProjects must be used within a ProjectsProvider');
  }
  return context;
}

export default ProjectsContext;
