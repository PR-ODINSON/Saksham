import { ReportImage } from '../models/index.js';

/**
 * GET /api/images/:id
 * Streams a peon-uploaded image straight from MongoDB. The bytes live in
 * the `data` Buffer field, so any laptop that can reach Mongo can render
 * the photo — no shared filesystem required.
 *
 * Auth note: this endpoint is intentionally public-by-id (the IDs are
 * 24-char ObjectIds, effectively unguessable). If you need stricter
 * ACL, wrap this route with `protect` and check role/school.
 */
export const getImage = async (req, res) => {
  try {
    const img = await ReportImage.findById(req.params.id).lean();
    if (!img) return res.status(404).json({ success: false, message: 'Image not found' });

    res.set('Content-Type', img.mimeType || 'image/jpeg');
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
    res.set('Content-Length', img.sizeBytes);
    res.send(img.data);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
