export const rateLimitMap = new Map();

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 5 * 60 * 1000; // 5 minutes

export const loginLimiter = (req, res, next) => {
  const identifier = req.body.emailOrPhone;
  if (!identifier) {
    return res.status(400).json({ message: 'emailOrPhone is required' });
  }

  const now = Date.now();
  const entry = rateLimitMap.get(identifier) || { attempts: 0, firstAttempt: now };

  // Reset if window expired
  if (now - entry.firstAttempt > WINDOW_MS) {
    rateLimitMap.set(identifier, { attempts: 1, firstAttempt: now });

    res.setHeader('X-RateLimit-Limit', MAX_ATTEMPTS);
    res.setHeader('X-RateLimit-Remaining', MAX_ATTEMPTS - 1);
    return next();
  }

  // Block if max attempts exceeded
  if (entry.attempts >= MAX_ATTEMPTS) {
    const retryAfter = Math.ceil((WINDOW_MS - (now - entry.firstAttempt)) / 1000);

    res.setHeader('Retry-After', retryAfter);
    res.setHeader('X-RateLimit-Limit', MAX_ATTEMPTS);
    res.setHeader('X-RateLimit-Remaining', 0);

    return res.status(429).json({
      message: `Too many login attempts. Try again after ${retryAfter} seconds.`,
    });
  }

  // Allow and update count
  entry.attempts += 1;
  rateLimitMap.set(identifier, entry);

  res.setHeader('X-RateLimit-Limit', MAX_ATTEMPTS);
  res.setHeader('X-RateLimit-Remaining', MAX_ATTEMPTS - entry.attempts);

  next();
};
