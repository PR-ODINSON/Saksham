import { SchoolConditionRecord } from '../models/index.js';

export const createRecord = async (req, res) => {
  try {
    const record = await SchoolConditionRecord.create(req.body);
    res.status(201).json({ success: true, data: record });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const getRecords = async (req, res) => {
  try {
    const records = await SchoolConditionRecord.find().sort({ assessmentDate: -1 });
    res.status(200).json({ success: true, data: records });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};
