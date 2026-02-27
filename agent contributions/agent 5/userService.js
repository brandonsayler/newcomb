/**
 * UserService — Business logic for user profiles and preferences.
 * Authentication itself is handled by Agent 4; this covers
 * profile management and user-facing queries.
 */

const { NotFoundError, ValidationError } = require('./errors');

class UserService {
  constructor({ db }) {
    this.db = db;
  }

  async getById(userId) {
    const user = await this.db.User.findByPk(userId, {
      attributes: { exclude: ['passwordHash'] },
    });
    if (!user) throw new NotFoundError('User', userId);
    return user;
  }

  async updateProfile(userId, data) {
    const user = await this.getById(userId);
    const allowed = ['displayName', 'avatarUrl', 'timezone', 'theme'];
    const filtered = {};
    for (const key of allowed) {
      if (data[key] !== undefined) filtered[key] = data[key];
    }
    if (filtered.displayName && filtered.displayName.length > 100) {
      throw new ValidationError([{ field: 'displayName', message: 'Must be 100 chars or fewer' }]);
    }
    await user.update(filtered);
    return user;
  }

  async getDashboard(userId) {
    const [assignedTasks, recentActivity] = await Promise.all([
      this.db.Task.findAll({
        where: { assigneeId: userId, status: ['todo', 'in_progress', 'review', 'blocked'] },
        order: [['priority', 'ASC'], ['dueDate', 'ASC']],
        limit: 20,
        include: ['project'],
      }),
      this.db.Activity.findAll({
        where: { userId },
        order: [['createdAt', 'DESC']],
        limit: 15,
      }),
    ]);

    const overdue = assignedTasks.filter(
      (t) => t.dueDate && new Date(t.dueDate) < new Date()
    );

    return {
      assignedTasks,
      overdueTasks: overdue,
      recentActivity,
      taskCounts: {
        total: assignedTasks.length,
        overdue: overdue.length,
        inProgress: assignedTasks.filter((t) => t.status === 'in_progress').length,
        blocked: assignedTasks.filter((t) => t.status === 'blocked').length,
      },
    };
  }

  async search(query, { page = 1, limit = 10 } = {}) {
    const offset = (page - 1) * limit;
    const { rows, count } = await this.db.User.findAndCountAll({
      where: {
        $or: [
          { displayName: { $iLike: `%${query}%` } },
          { email: { $iLike: `%${query}%` } },
        ],
      },
      attributes: ['id', 'displayName', 'email', 'avatarUrl'],
      limit,
      offset,
    });
    return { users: rows, total: count };
  }
}

module.exports = UserService;
