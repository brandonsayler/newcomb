/**
 * TaskService — Core business logic for task management.
 *
 * Interfaces with Agent 2's Task model.
 * Called by Agent 3's /api/tasks routes.
 */

const { NotFoundError, ForbiddenError, ValidationError } = require('./errors');

// Valid task statuses and their allowed transitions
const STATUS_FLOW = {
  backlog: ['todo'],
  todo: ['in_progress', 'backlog'],
  in_progress: ['review', 'todo', 'blocked'],
  blocked: ['in_progress', 'todo'],
  review: ['done', 'in_progress'],
  done: ['todo'], // reopen
};

const PRIORITIES = ['critical', 'high', 'medium', 'low', 'none'];

class TaskService {
  /**
   * @param {object} deps — injected dependencies
   * @param {object} deps.db — database models (from Agent 2)
   * @param {object} deps.notificationService — NotificationService instance
   */
  constructor({ db, notificationService }) {
    this.db = db;
    this.notify = notificationService;
  }

  // ── Queries ──────────────────────────────────────────────

  async getById(taskId, requestingUserId) {
    const task = await this.db.Task.findByPk(taskId, {
      include: ['assignee', 'project', 'comments', 'subtasks'],
    });
    if (!task) throw new NotFoundError('Task', taskId);
    await this._assertCanView(task, requestingUserId);
    return task;
  }

  async list({ projectId, status, assigneeId, priority, search, page = 1, limit = 25 }) {
    const where = {};
    if (projectId) where.projectId = projectId;
    if (status) where.status = status;
    if (assigneeId) where.assigneeId = assigneeId;
    if (priority) where.priority = priority;
    if (search) where.title = { $iLike: `%${search}%` };

    const offset = (page - 1) * limit;
    const { rows, count } = await this.db.Task.findAndCountAll({
      where,
      include: ['assignee', 'project'],
      order: [['updatedAt', 'DESC']],
      limit,
      offset,
    });

    return { tasks: rows, total: count, page, totalPages: Math.ceil(count / limit) };
  }

  // ── Commands ─────────────────────────────────────────────

  async create(data, creatorId) {
    this._validateCreate(data);

    const task = await this.db.Task.create({
      ...data,
      status: data.status || 'backlog',
      priority: data.priority || 'medium',
      creatorId,
    });

    if (data.assigneeId && data.assigneeId !== creatorId) {
      await this.notify.send({
        userId: data.assigneeId,
        type: 'task_assigned',
        payload: { taskId: task.id, title: task.title },
      });
    }

    return task;
  }

  async update(taskId, data, requestingUserId) {
    const task = await this.getById(taskId, requestingUserId);
    await this._assertCanEdit(task, requestingUserId);

    // If status is changing, enforce the state machine
    if (data.status && data.status !== task.status) {
      this._assertValidTransition(task.status, data.status);
    }

    if (data.priority && !PRIORITIES.includes(data.priority)) {
      throw new ValidationError([{ field: 'priority', message: `Must be one of: ${PRIORITIES.join(', ')}` }]);
    }

    const previousAssignee = task.assigneeId;
    await task.update(data);

    // Notify on reassignment
    if (data.assigneeId && data.assigneeId !== previousAssignee) {
      await this.notify.send({
        userId: data.assigneeId,
        type: 'task_assigned',
        payload: { taskId: task.id, title: task.title },
      });
    }

    // Notify on completion
    if (data.status === 'done' && task.creatorId !== requestingUserId) {
      await this.notify.send({
        userId: task.creatorId,
        type: 'task_completed',
        payload: { taskId: task.id, title: task.title },
      });
    }

    return task;
  }

  async delete(taskId, requestingUserId) {
    const task = await this.getById(taskId, requestingUserId);
    await this._assertCanEdit(task, requestingUserId);
    await task.destroy();
    return { deleted: true };
  }

  async moveToStatus(taskId, newStatus, requestingUserId) {
    return this.update(taskId, { status: newStatus }, requestingUserId);
  }

  async bulkUpdateStatus(taskIds, newStatus, requestingUserId) {
    const results = await Promise.allSettled(
      taskIds.map((id) => this.moveToStatus(id, newStatus, requestingUserId))
    );
    return {
      succeeded: results.filter((r) => r.status === 'fulfilled').map((r) => r.value),
      failed: results
        .filter((r) => r.status === 'rejected')
        .map((r, i) => ({ taskId: taskIds[i], error: r.reason.message })),
    };
  }

  // ── Subtasks ─────────────────────────────────────────────

  async addSubtask(parentId, data, creatorId) {
    const parent = await this.getById(parentId, creatorId);
    return this.create({ ...data, parentId: parent.id, projectId: parent.projectId }, creatorId);
  }

  // ── Internal helpers ─────────────────────────────────────

  _validateCreate(data) {
    const errors = [];
    if (!data.title || data.title.trim().length < 1) {
      errors.push({ field: 'title', message: 'Title is required' });
    }
    if (data.title && data.title.length > 255) {
      errors.push({ field: 'title', message: 'Title must be 255 characters or fewer' });
    }
    if (data.priority && !PRIORITIES.includes(data.priority)) {
      errors.push({ field: 'priority', message: `Must be one of: ${PRIORITIES.join(', ')}` });
    }
    if (data.dueDate && new Date(data.dueDate) < new Date()) {
      errors.push({ field: 'dueDate', message: 'Due date cannot be in the past' });
    }
    if (errors.length) throw new ValidationError(errors);
  }

  _assertValidTransition(from, to) {
    const allowed = STATUS_FLOW[from];
    if (!allowed || !allowed.includes(to)) {
      throw new ValidationError(
        `Invalid status transition: "${from}" → "${to}". Allowed: ${(allowed || []).join(', ')}`
      );
    }
  }

  async _assertCanView(task, userId) {
    // For now, any project member can view. Agent 4 handles auth at the edge.
    // In the future, integrate with Agent 4's RBAC.
    return true;
  }

  async _assertCanEdit(task, userId) {
    const project = await this.db.Project.findByPk(task.projectId);
    if (!project) throw new NotFoundError('Project', task.projectId);

    const membership = await this.db.ProjectMember.findOne({
      where: { projectId: project.id, userId },
    });

    if (!membership || membership.role === 'viewer') {
      throw new ForbiddenError('Only project editors and admins can modify tasks');
    }
  }
}

module.exports = TaskService;
