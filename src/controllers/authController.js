const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');

const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ status: 'error', message: 'Username and password are required' });
    }

    const result = await query('SELECT id, username, password_hash, role, fullname, is_active FROM users WHERE username = $1', [username]);
    const user = result.rows[0];

    if (!user || !user.is_active) {
      return res.status(401).json({ status: 'error', message: 'Invalid credentials or inactive account' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    
    if (!isMatch) {
      return res.status(401).json({ status: 'error', message: 'Invalid credentials' });
    }

    const payload = {
      id: user.id,
      username: user.username,
      role: user.role,
      fullname: user.fullname
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '1d' });

    res.status(200).json({
      status: 'success',
      data: {
        token,
        user: payload
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { login };
