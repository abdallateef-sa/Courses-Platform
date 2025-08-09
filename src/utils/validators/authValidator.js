import { body } from 'express-validator';
import { validatorMiddleware } from "../../middlewares/validatorMiddleware.js";

export const registerRules = [
  body('fullName').trim().notEmpty().withMessage('Full name is required'),
  body('email').trim().isEmail().withMessage('Valid email is required'),
  body('phone').trim().isMobilePhone().withMessage('Valid phone is required'),
  body('password').trim().isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('year').isInt({ min: 1, max: 10 }).withMessage('Valid academic year is required'),
  body('departmentType').trim().isIn(['public', 'private']).withMessage('Department type must be public or private'),
  body('university').trim().notEmpty().withMessage('University is required'),
  body('role').optional().isIn(['student', 'admin']),
  validatorMiddleware
];