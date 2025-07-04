import User from '../models/User.js';
import asyncHandler from 'express-async-handler';
import fs from 'fs';
import path from 'path';

export const searchUser = asyncHandler(async (req, res) => {
  const { emailOrPhone } = req.body; 
  if (!emailOrPhone) return res.status(400).json({ message: 'User Email Or Phone is required' });

  const user = await User.findOne({
    $or: [
      { email: emailOrPhone },
      { phone: emailOrPhone },
    ]
  }).select('-password -__v');

  if (!user) return res.status(404).json({ message: 'User not found' });

  res.status(200).json({ user });
});

export const deleteUser = asyncHandler(async (req, res) => {
  const { emailOrPhone } = req.body; 

  if (!emailOrPhone) return res.status(400).json({ message: 'User Email Or Phone is required' });

  const user = await User.findOne({
    $or: [
      { email: emailOrPhone },
      { phone: emailOrPhone },
    ]
  });
  if (!user) return res.status(404).json({ message: 'User not found' });

  if (user.cardImage) {
    const imagePath = path.join('src/uploads/images', user.cardImage);
    fs.unlink(imagePath, (err) => {
      if (err) console.error('Failed to delete image:', err.message);
    });
  }

  await user.deleteOne();

  res.status(200).json({ message: 'User deleted successfully' });
});



// export const deleteUser = asyncHandler(async (req, res) => {
//   const { emailOrPhone } = req.body;

//   if (!emailOrPhone) return res.status(400).json({ message: 'User Email Or Phone is required' });

//   const user = await User.findOne({
//     $or: [
//       { email: emailOrPhone },
//       { phone: emailOrPhone },
//     ]
//   });

//   if (!user) return res.status(404).json({ message: 'User not found' });

//   if (user.cardImage) {
//     const imagePath = path.join('src/uploads/images', user.cardImage);
//     fs.unlink(imagePath, (err) => {
//       if (err) console.error('Failed to delete image:', err.message);
//     });
//   }

//   await user.deleteOne();

//   res.status(200).json({ message: 'User deleted successfully' });
// });