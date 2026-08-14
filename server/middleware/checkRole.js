const supabase = require('../config/supabase');

/**
 * Middleware to restrict route access by user role.
 * Depends on auth middleware running beforehand (which populates req.user).
 * @param {Array<string>} allowedRoles - Roles allowed to access the route (e.g. ['admin'])
 */
const checkRole = (allowedRoles) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required' });
    }

    try {
      // Query the user's profile to retrieve their role
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', req.user.id)
        .single();

      if (error || !profile) {
        console.error('CheckRole middleware - profile query error:', error);
        return res.status(403).json({ error: 'Access Denied: Could not retrieve user permissions' });
      }

      if (!allowedRoles.includes(profile.role)) {
        return res.status(403).json({ error: 'Forbidden: Insufficient privileges' });
      }

      // Attach profile info to request for subsequent handlers if needed
      req.user.role = profile.role;
      next();
    } catch (err) {
      console.error('Role check middleware error:', err);
      return res.status(500).json({ error: 'Internal server error during authorization check' });
    }
  };
};

module.exports = checkRole;
