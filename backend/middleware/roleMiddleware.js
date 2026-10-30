/**
 * Role-Based Access Control Middleware (RBAC)
 * Validates whether the authenticated user has one of the allowed roles.
 */
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: User authentication required.'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Access restricted. Role '${req.user.role}' lacks permission for this action. Allowed roles: [${allowedRoles.join(', ')}]`
      });
    }

    next();
  };
}

module.exports = {
  authorize
};
