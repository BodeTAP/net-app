const { query } = require('../config/db');
const bcrypt = require('bcrypt');

const getUsers = async (req, res, next) => {
  try {
    const result = await query(`
      SELECT id, username, role, fullname, is_active 
      FROM users 
      ORDER BY role ASC, fullname ASC
    `);
    
    res.status(200).json({
      status: 'success',
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
};

const createUser = async (req, res, next) => {
  try {
    const { username, password, role, fullname } = req.body;
    
    if (!username || !password || !role || !fullname) {
      return res.status(400).json({ status: 'error', message: 'Semua field (username, password, role, fullname) wajib diisi' });
    }

    const validRoles = ['SUPERADMIN', 'ADMIN_BILLING', 'TECHNICIAN'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ status: 'error', message: 'Role tidak valid' });
    }

    // Check username uniqueness
    const userCheck = await query('SELECT id FROM users WHERE username = $1', [username]);
    if (userCheck.rows.length > 0) {
      return res.status(400).json({ status: 'error', message: 'Username sudah digunakan' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await query(`
      INSERT INTO users (username, password_hash, role, fullname, is_active)
      VALUES ($1, $2, $3, $4, TRUE)
      RETURNING id, username, role, fullname, is_active
    `, [username, passwordHash, role, fullname]);

    res.status(201).json({
      status: 'success',
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { fullname, role, is_active, password } = req.body;

    let updateFields = [];
    let params = [];
    let paramIndex = 1;

    if (fullname) { updateFields.push(`fullname = $${paramIndex}`); params.push(fullname); paramIndex++; }
    if (role) { updateFields.push(`role = $${paramIndex}`); params.push(role); paramIndex++; }
    if (is_active !== undefined) { updateFields.push(`is_active = $${paramIndex}`); params.push(is_active); paramIndex++; }
    
    if (password) {
      const passwordHash = await bcrypt.hash(password, 10);
      updateFields.push(`password_hash = $${paramIndex}`); 
      params.push(passwordHash); 
      paramIndex++;
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ status: 'error', message: 'Tidak ada data yang diubah' });
    }

    params.push(id);
    const result = await query(
      `UPDATE users SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING id, username, role, fullname, is_active`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Karyawan tidak ditemukan' });
    }

    res.status(200).json({ status: 'success', data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Soft delete
    const result = await query('UPDATE users SET is_active = FALSE WHERE id = $1 RETURNING id, username', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Karyawan tidak ditemukan' });
    }

    res.status(200).json({ status: 'success', message: 'Karyawan berhasil dinonaktifkan' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getUsers, createUser, updateUser, deleteUser };
