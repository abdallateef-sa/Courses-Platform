import User from '../models/User.js';
import asyncHandler from 'express-async-handler';

export const searchUser = asyncHandler(async (req, res) => {
  const { query } = req.query;
  if (!query) return res.status(400).json({ message: 'Please provide search query' });

  const user = await User.findOne({
    $or: [
      { email: query },
      { phone: query },
    ]
  }).select('-password -__v');

  if (!user) return res.status(404).json({ message: 'User not found' });

  res.status(200).json({ user });
});