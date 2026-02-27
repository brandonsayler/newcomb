/**
 * ============================================================
 * AGENT 5 — Core Business Logic / Service Layer
 * ============================================================
 * Task Management Dashboard — Collaborative Build
 *
 * This module contains all business logic, decoupled from
 * the transport layer (Agent 3's routes) and the data layer
 * (Agent 2's models). It expects:
 *
 *   - Agent 2 provides: Task, Project, User, Comment models
 *     via a shared ORM (assumed: Prisma or Sequelize-style)
 *   - Agent 4 provides: auth middleware that attaches `req.user`
 *   - Agent 3 calls these services from route handlers
 *
 * Exports all services for use by other agents' components.
 * ============================================================
 */

const TaskService = require('./taskService');
const ProjectService = require('./projectService');
const UserService = require('./userService');
const CommentService = require('./commentService');
const NotificationService = require('./notificationService');
const AnalyticsService = require('./analyticsService');
const { ServiceError, NotFoundError, ForbiddenError, ValidationError } = require('./errors');

module.exports = {
  TaskService,
  ProjectService,
  UserService,
  CommentService,
  NotificationService,
  AnalyticsService,
  ServiceError,
  NotFoundError,
  ForbiddenError,
  ValidationError,
};
