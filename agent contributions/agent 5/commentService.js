/**
 * CommentService — Business logic for task comments/discussion.
 */

const { NotFoundError, ForbiddenError, ValidationError } = require('./errors');

class CommentService {
  constructor({ db, notificationService }) {
    this.db = db;
    this.notify = notificationService;
  }

  async listForTask(taskId, { page = 1, limit = 50 } = {}) {
    const offset = (page - 1) * limit;
    const { rows, count } = await this.db.Comment.findAndCountAll({
      where: { taskId },
      include: ['author'],
      order: [['createdAt', 'ASC']],
      limit,
      offset,
    });
    return { comments: rows, total: count, page, totalPages: Math.ceil(count / limit) };
  }

  async create(taskId, body, authorId) {
    if (!body || body.trim().length < 1) {
      throw new ValidationError([{ field: 'body', message: 'Comment body is required' }]);
    }

    const task = await this.db.Task.findByPk(taskId);
    if (!task) throw new NotFoundError('Task', taskId);

    const comment = await this.db.Comment.create({ taskId, body: body.trim(), authorId });

    // Parse @mentions and notify
    const mentions = this._parseMentions(body);
    for (const mentionedUserId of mentions) {
      if (mentionedUserId !== authorId) {
        await this.notify.send({
          userId: mentionedUserId,
          type: 'comment_mention',
          payload: { taskId, commentId: comment.id },
        });
      }
    }

    // Notify task assignee if they didn't write the comment
    if (task.assigneeId && task.assigneeId !== authorId && !mentions.includes(task.assigneeId)) {
      await this.notify.send({
        userId: task.assigneeId,
        type: 'comment_added',
        payload: { taskId, commentId: comment.id },
      });
    }

    return comment;
  }

  async update(commentId, body, requestingUserId) {
    const comment = await this.db.Comment.findByPk(commentId);
    if (!comment) throw new NotFoundError('Comment', commentId);
    if (comment.authorId !== requestingUserId) {
      throw new ForbiddenError('You can only edit your own comments');
    }
    await comment.update({ body: body.trim(), editedAt: new Date() });
    return comment;
  }

  async delete(commentId, requestingUserId) {
    const comment = await this.db.Comment.findByPk(commentId);
    if (!comment) throw new NotFoundError('Comment', commentId);
    if (comment.authorId !== requestingUserId) {
      throw new ForbiddenError('You can only delete your own comments');
    }
    await comment.destroy();
    return { deleted: true };
  }

  /**
   * Extract @user-id patterns from comment body.
   * Convention: @[userId] e.g. @[abc-123]
   */
  _parseMentions(body) {
    const regex = /@\[([a-zA-Z0-9-]+)\]/g;
    const ids = [];
    let match;
    while ((match = regex.exec(body)) !== null) {
      ids.push(match[1]);
    }
    return [...new Set(ids)];
  }
}

module.exports = CommentService;
