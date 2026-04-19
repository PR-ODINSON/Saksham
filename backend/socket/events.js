// Socket.IO event name constants — single source of truth for every channel
// emitted from the backend (and listened-to from the frontend useSocket hook).
//
// Both an EVENTS map and individual named exports are provided so callers may
// `import { TASK_ASSIGNED } from '../socket/events.js'` or
// `import { EVENTS } from '../socket/events.js'`.

export const REPORT_SUBMITTED        = 'report:submitted';
export const REPORT_REVIEWED         = 'report:reviewed';
export const REPORT_FORWARDED        = 'report:forwarded';
export const REPORT_FORWARDED_BUNDLE = 'report:forwarded:bundle';
export const MAINTENANCE_CREATED     = 'maintenance:created';
export const TASK_ASSIGNED           = 'task:assigned';
export const CONTRACTOR_DECISION     = 'contractor:decision';
export const TASK_COMPLETED          = 'task:completed';
export const AUDIT_EVENT             = 'audit:event';

export const EVENTS = {
  REPORT_SUBMITTED,
  REPORT_REVIEWED,
  REPORT_FORWARDED,
  REPORT_FORWARDED_BUNDLE,
  MAINTENANCE_CREATED,
  TASK_ASSIGNED,
  CONTRACTOR_DECISION,
  TASK_COMPLETED,
  AUDIT_EVENT,
};
