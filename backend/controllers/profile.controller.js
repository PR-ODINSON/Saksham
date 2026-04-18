import User from '../models/user.model.js';
import { hashPassword, comparePassword } from '../Methods/bcryptPassword.js';

export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password').populate('schoolId', 'name district');
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { name, phone, district } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { name, phone, district },
      { new: true, runValidators: true }
    ).select('-password');
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id);

    if (!(await comparePassword(currentPassword, user.password))) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }

    user.password = await hashPassword(newPassword);
    await user.save();
    res.json({ success: true, message: 'Password updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
