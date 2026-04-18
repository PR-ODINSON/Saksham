import mongoose from 'mongoose';

/**
 * ReportImage — stores the raw bytes of every photo uploaded by a peon /
 * principal so that images live inside MongoDB Atlas and can be served
 * to any laptop, not just the one running the backend.
 *
 * The bytes are stored directly in a Buffer field. With the multer 10 MB
 * per-file cap this keeps every doc well below MongoDB's 16 MB document
 * limit. For larger files switch to GridFS — same access pattern.
 */
const reportImageSchema = new mongoose.Schema(
  {
    schoolId:    { type: Number, index: true },
    weekNumber:  { type: Number, index: true },
    category:    { type: String, index: true },
    uploadedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    originalName:{ type: String },
    mimeType:    { type: String, required: true },
    sizeBytes:   { type: Number, required: true },
    data:        { type: Buffer, required: true }, // <-- the actual bytes
  },
  { timestamps: true, collection: 'report_images' }
);

reportImageSchema.index({ schoolId: 1, category: 1, weekNumber: 1 });

const ReportImage = mongoose.model('ReportImage', reportImageSchema);

export default ReportImage;
