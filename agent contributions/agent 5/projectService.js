/**
 * ProjectService — Business logic for project management.
 */

const { NotFoundError, ForbiddenError, ValidationError } = require('./errors');

const MEMBER_ROLES = ['admin', 'editor', 'viewer'];

class ProjectService {
  constructor({ db, notificationService }) {
    this.db = db;
    this.notify = notificationService;
  }

  async getById(projectId, requestingUserId) {
    const project = await this.db.Project.findByPk(projectId, {
      include: ['members', 'tasks'],
    });
    if (!project) throw new NotFoundError('Project', projectId);
    await this._assertIsMember(projectId, requestingUserId);
    return project;
  }

  async listForUser(userId, { page = 1, limit = 20 } = {}) {
    const memberships = await this.db.ProjectMember.findAll({
      where: { userId },
      attributes: ['projectId'],
    });
    const projectIds = memberships.map((m) => m.projectId);

    const offset = (page - 1) * limit;
    const { rows, count } = await this.db.Project.findAndCountAll({
      where: { id: projectIds },
      order: [['updatedAt', 'DESC']],
      limit,
      offset,
    });

    return { projects: rows, total: count, page, totalPages: Math.ceil(count / limit) };
  }

  async create(data, creatorId) {
    if (!data.name || data.name.trim().length < 1) {
      throw new ValidationError([{ field: 'name', message: 'Project name is required' }]);
    }

    const project = await this.db.Project.create({
      ...data,
      ownerId: creatorId,
    });

    // Creator becomes admin
    await this.db.ProjectMember.create({
      projectId: project.id,
      userId: creatorId,
      role: 'admin',
    });

    return project;
  }

  async update(projectId, data, requestingUserId) {
    await this._assertIsAdmin(projectId, requestingUserId);
    const project = await this.db.Project.findByPk(projectId);
    if (!project) throw new NotFoundError('Project', projectId);
    await project.update(data);
    return project;
  }

  async delete(projectId, requestingUserId) {
    await this._assertIsAdmin(projectId, requestingUserId);
    const project = await this.db.Project.findByPk(projectId);
    if (!project) throw new NotFoundError('Project', projectId);
    await project.destroy(); // cascades to tasks, members
    return { deleted: true };
  }

  // ── Membership ───────────────────────────────────────────

  async addMember(projectId, userId, role, requestingUserId) {
    await this._assertIsAdmin(projectId, requestingUserId);
    if (!MEMBER_ROLES.includes(role)) {
      throw new ValidationError(`Role must be one of: ${MEMBER_ROLES.join(', ')}`);
    }

    const existing = await this.db.ProjectMember.findOne({
      where: { projectId, userId },
    });
    if (existing) {
      throw new ValidationError('User is already a member of this project');
    }

    const membership = await this.db.ProjectMember.create({ projectId, userId, role });

    await this.notify.send({
      userId,
      type: 'project_invite',
      payload: { projectId },
    });

    return membership;
  }

  async removeMember(projectId, userId, requestingUserId) {
    await this._assertIsAdmin(projectId, requestingUserId);
    const membership = await this.db.ProjectMember.findOne({
      where: { projectId, userId },
    });
    if (!membership) throw new NotFoundError('ProjectMember', userId);
    await membership.destroy();
    return { removed: true };
  }

  async updateMemberRole(projectId, userId, newRole, requestingUserId) {
    await this._assertIsAdmin(projectId, requestingUserId);
    if (!MEMBER_ROLES.includes(newRole)) {
      throw new ValidationError(`Role must be one of: ${MEMBER_ROLES.join(', ')}`);
    }
    const membership = await this.db.ProjectMember.findOne({
      where: { projectId, userId },
    });
    if (!membership) throw new NotFoundError('ProjectMember', userId);
    await membership.update({ role: newRole });
    return membership;
  }

  // ── Stats (used by Agent 5's AnalyticsService) ──────────

  async getStats(projectId, requestingUserId) {
    await this._assertIsMember(projectId, requestingUserId);
    const tasks = await this.db.Task.findAll({ where: { projectId } });

    const byStatus = {};
    const byPriority = {};
    tasks.forEach((t) => {
      byStatus[t.status] = (byStatus[t.status] || 0) + 1;
      byPriority[t.priority] = (byPriority[t.priority] || 0) + 1;
    });

    return {
      totalTasks: tasks.length,
      byStatus,
      byPriority,
      completionRate: tasks.length ? (byStatus.done || 0) / tasks.length : 0,
    };
  }

  // ── Internal ─────────────────────────────────────────────

  async _assertIsMember(projectId, userId) {
    const m = await this.db.ProjectMember.findOne({ where: { projectId, userId } });
    if (!m) throw new ForbiddenError('You are not a member of this project');
  }

  async _assertIsAdmin(projectId, userId) {
    const m = await this.db.ProjectMember.findOne({ where: { projectId, userId } });
    if (!m || m.role !== 'admin') {
      throw new ForbiddenError('Only project admins can perform this action');
    }
  }
}

module.exports = ProjectService;
