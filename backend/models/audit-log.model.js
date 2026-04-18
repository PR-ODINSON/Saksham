import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  actorId:          { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  actorRole:        String,
  action:           String,
  targetCollection: String,
  targetId:         mongoose.Schema.Types.ObjectId,
  metadata:         mongoose.Schema.Types.Mixed,
  ip:               String,
  userAgent:        String,
  createdAt:        { type: Date, default: Date.now, expires: 7776000 },
}, {
  collection: 'auditlogs',
  _id: true,
  timestamps: false,
});

auditLogSchema.index({ actorId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);
export default AuditLog;
