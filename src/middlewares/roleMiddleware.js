export const isAdmin = (req, res, next) => {
  // Allow both admin and superadmin to access admin routes
  const role = req.user?.role;
  if (role !== "admin" && role !== "superadmin") {
    return res.status(403).json({ message: "You are not authorized" });
  }
  // If actual admin, ensure account is active; superadmin bypasses this
  if (role === "admin" && req.user.adminActive === false) {
    return res.status(403).json({ message: "Admin account is deactivated" });
  }
  next();
};
