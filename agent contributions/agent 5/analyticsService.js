/**
 * AnalyticsService — Aggregations and metrics for the dashboard.
 *
 * Powers Agent 7's charts and Agent 6's dashboard views.
 */

class AnalyticsService {
  constructor({ db }) {
    this.db = db;
  }

  /**
   * Per-project summary: burn-down data, velocity, bottlenecks.
   */
  async getProjectAnalytics(projectId, { days = 30 } = {}) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const tasks = await this.db.Task.findAll({ where: { projectId } });

    const completedInWindow = tasks.filter(
      (t) => t.status === 'done' && new Date(t.updatedAt) >= since
    );

    const createdInWindow = tasks.filter(
      (t) => new Date(t.createdAt) >= since
    );

    // Build daily burn-down data points
    const burnDown = this._buildBurnDown(tasks, days);

    // Average cycle time (created → done) for completed tasks
    const cycleTimes = completedInWindow
      .filter((t) => t.createdAt && t.updatedAt)
      .map((t) => (new Date(t.updatedAt) - new Date(t.createdAt)) / (1000 * 60 * 60));

    const avgCycleTimeHours = cycleTimes.length
      ? cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length
      : null;

    return {
      period: { days, since: since.toISOString() },
      totals: {
        all: tasks.length,
        open: tasks.filter((t) => t.status !== 'done').length,
        done: tasks.filter((t) => t.status === 'done').length,
        blocked: tasks.filter((t) => t.status === 'blocked').length,
      },
      velocity: {
        created: createdInWindow.length,
        completed: completedInWindow.length,
        net: createdInWindow.length - completedInWindow.length,
      },
      avgCycleTimeHours: avgCycleTimeHours ? Math.round(avgCycleTimeHours * 10) / 10 : null,
      burnDown,
    };
  }

  /**
   * Per-user productivity metrics for a given project.
   */
  async getMemberMetrics(projectId) {
    const members = await this.db.ProjectMember.findAll({
      where: { projectId },
      include: ['user'],
    });

    const tasks = await this.db.Task.findAll({ where: { projectId } });

    return members.map((m) => {
      const userTasks = tasks.filter((t) => t.assigneeId === m.userId);
      const completed = userTasks.filter((t) => t.status === 'done');
      return {
        userId: m.userId,
        displayName: m.user?.displayName || 'Unknown',
        role: m.role,
        assigned: userTasks.length,
        completed: completed.length,
        inProgress: userTasks.filter((t) => t.status === 'in_progress').length,
        blocked: userTasks.filter((t) => t.status === 'blocked').length,
        completionRate: userTasks.length ? completed.length / userTasks.length : 0,
      };
    });
  }

  /**
   * Global summary across all of a user's projects (for personal dashboard).
   */
  async getUserSummary(userId) {
    const memberships = await this.db.ProjectMember.findAll({ where: { userId } });
    const projectIds = memberships.map((m) => m.projectId);

    const tasks = await this.db.Task.findAll({
      where: { assigneeId: userId },
    });

    const dueSoon = tasks.filter((t) => {
      if (!t.dueDate || t.status === 'done') return false;
      const diff = new Date(t.dueDate) - new Date();
      return diff > 0 && diff < 48 * 60 * 60 * 1000; // within 48h
    });

    const overdue = tasks.filter(
      (t) => t.dueDate && t.status !== 'done' && new Date(t.dueDate) < new Date()
    );

    return {
      projectCount: projectIds.length,
      totalAssigned: tasks.length,
      openTasks: tasks.filter((t) => t.status !== 'done').length,
      completedTasks: tasks.filter((t) => t.status === 'done').length,
      overdue: overdue.length,
      dueSoon: dueSoon.length,
    };
  }

  // ── Helpers ──────────────────────────────────────────────

  _buildBurnDown(tasks, days) {
    const points = [];
    const now = new Date();

    for (let i = days; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      date.setHours(23, 59, 59, 999);

      // Count tasks that were open on that date
      const openOnDate = tasks.filter((t) => {
        const created = new Date(t.createdAt);
        if (created > date) return false;
        if (t.status !== 'done') return true;
        const completed = new Date(t.updatedAt);
        return completed > date;
      });

      points.push({
        date: date.toISOString().slice(0, 10),
        openTasks: openOnDate.length,
      });
    }

    return points;
  }
}

module.exports = AnalyticsService;
