/**
 * Service-layer error hierarchy.
 * Agent 3 (routes) should catch these and map to HTTP status codes:
 *   - ValidationError  → 400
 *   - NotFoundError    → 404
 *   - ForbiddenError   → 403
 *   - ServiceError     → 500
 */

class ServiceError extends Error {
  constructor(message, code = 'SERVICE_ERROR') {
    super(message);
    this.name = 'ServiceError';
    this.code = code;
  }
}

class NotFoundError extends ServiceError {
  constructor(resource, id) {
    super(`${resource} with id "${id}" not found`, 'NOT_FOUND');
    this.name = 'NotFoundError';
    this.resource = resource;
    this.resourceId = id;
  }
}

class ForbiddenError extends ServiceError {
  constructor(message = 'You do not have permission to perform this action') {
    super(message, 'FORBIDDEN');
    this.name = 'ForbiddenError';
  }
}

class ValidationError extends ServiceError {
  constructor(fields) {
    const msg = Array.isArray(fields)
      ? fields.map((f) => `${f.field}: ${f.message}`).join('; ')
      : fields;
    super(msg, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
    this.fields = fields;
  }
}

module.exports = { ServiceError, NotFoundError, ForbiddenError, ValidationError };
