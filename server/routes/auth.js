const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const authenticateToken = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    // Authenticate user with Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return res.status(401).json({ error: error.message });
    }

    // Retrieve user's role profile information from the profiles table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('name, role')
      .eq('id', data.user.id)
      .single();

    if (profileError) {
      console.warn('Failed to query profiles table for logged-in user:', profileError);
    }

    // Return session variables and user profiles to front-end
    res.json({
      session: {
        access_token: data.session.access_token,
        expires_at: data.session.expires_at
      },
      user: {
        id: data.user.id,
        email: data.user.email,
        name: profile?.name || data.user.email.split('@')[0],
        role: profile?.role || 'cashier' // Default to cashier if role not set
      }
    });
  } catch (err) {
    console.error('Login route error:', err);
    res.status(500).json({ error: 'Internal server error during login' });
  }
});

// POST /api/auth/logout
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    // Log out user session globally
    const { error } = await supabase.auth.signOut();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    console.error('Logout route error:', err);
    res.status(500).json({ error: 'Internal server error during logout' });
  }
});

// GET /api/auth/me (Utility to verify token validity and get current details)
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('name, role')
      .eq('id', req.user.id)
      .single();

    res.json({
      user: {
        id: req.user.id,
        email: req.user.email,
        name: profile?.name || req.user.email.split('@')[0],
        role: profile?.role || 'cashier'
      }
    });
  } catch (err) {
    console.error('Get profile me route error:', err);
    res.status(500).json({ error: 'Internal server error retrieving user context' });
  }
});

module.exports = router;
