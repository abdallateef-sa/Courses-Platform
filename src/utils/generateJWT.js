import jwt from 'jsonwebtoken';


export default function generateJWT(payload) {
  return jwt.sign(
    payload,
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}