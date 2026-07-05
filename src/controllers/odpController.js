const { query } = require('../config/db');
const crypto = require('crypto');

// --- Mobile Scanner APIs ---

const scanODP = async (req, res, next) => {
  try {
    const { token } = req.params; // qr_token of ODP
    
    const odpResult = await query('SELECT * FROM odps WHERE qr_token = $1', [token]);
    if (odpResult.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'ODP not found' });
    }
    
    const odp = odpResult.rows[0];
    
    const portsResult = await query(`
      SELECT p.id, p.port_number, p.client_id, p.status, c.fullname as client_name, c.address, c.whatsapp, c.is_active as client_status
      FROM port_assignments p
      LEFT JOIN clients c ON p.client_id = c.id
      WHERE p.odp_id = $1
      ORDER BY p.port_number ASC
    `, [odp.id]);
    
    res.status(200).json({ status: 'success', data: { odp, ports: portsResult.rows } });
  } catch (error) {
    next(error);
  }
};

const assignPort = async (req, res, next) => {
  try {
    const { odp_id, port_number, client_id } = req.body;
    
    // Check if client is already assigned to ANY port
    const checkClient = await query('SELECT odp_id, port_number FROM port_assignments WHERE client_id = $1', [client_id]);
    if (checkClient.rows.length > 0) {
      return res.status(400).json({ status: 'error', message: `Pelanggan ini sudah terhubung ke ODP ${checkClient.rows[0].odp_id} Port ${checkClient.rows[0].port_number}` });
    }
    
    const checkPort = await query('SELECT status FROM port_assignments WHERE odp_id = $1 AND port_number = $2', [odp_id, port_number]);
    if (checkPort.rows.length > 0 && checkPort.rows[0].status !== 'FREE') {
      return res.status(400).json({ status: 'error', message: 'Port is already assigned' });
    }
    
    if (checkPort.rows.length === 0) {
      await query(
        'INSERT INTO port_assignments (odp_id, port_number, client_id, status) VALUES ($1, $2, $3, $4)',
        [odp_id, port_number, client_id, 'IN_USE']
      );
    } else {
      await query(
        'UPDATE port_assignments SET client_id = $1, status = $2 WHERE odp_id = $3 AND port_number = $4',
        [client_id, 'IN_USE', odp_id, port_number]
      );
    }
    
    res.status(200).json({ status: 'success', message: `Client successfully assigned to Port ${port_number}` });
  } catch (error) {
    next(error);
  }
};

const releasePort = async (req, res, next) => {
  try {
    const { odp_id, port_number } = req.body;
    
    await query('DELETE FROM port_assignments WHERE odp_id = $1 AND port_number = $2', [odp_id, port_number]);
    
    res.status(200).json({ status: 'success', message: `Port ${port_number} successfully released` });
  } catch (error) {
    next(error);
  }
};


// --- Admin Dashboard APIs ---

const getOdps = async (req, res, next) => {
  try {
    const result = await query(`
      SELECT o.id, o.qr_token, o.name, o.total_ports, o.coordinates, o.created_at, o.odc_id,
        COUNT(p.id) as used_ports
      FROM odps o
      LEFT JOIN port_assignments p ON o.id = p.odp_id AND p.status != 'FREE'
      GROUP BY o.id
      ORDER BY o.created_at DESC
    `);
    
    res.status(200).json({
      status: 'success',
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
};

const createOdp = async (req, res, next) => {
  try {
    const { name, total_ports, coordinates, odc_id } = req.body; // coordinates: { lat, lng }
    
    if (!name || !coordinates || coordinates.lat === undefined || coordinates.lng === undefined) {
      return res.status(400).json({ status: 'error', message: 'Nama dan koordinat wajib diisi' });
    }

    const id = `ODP-${Date.now()}`;
    const qr_token = crypto.randomUUID();
    
    // Postgres POINT is (lng, lat)
    const pointStr = `(${coordinates.lng}, ${coordinates.lat})`;

    const result = await query(`
      INSERT INTO odps (id, qr_token, name, total_ports, coordinates, odc_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [id, qr_token, name, total_ports || 8, pointStr, odc_id || null]);

    res.status(201).json({
      status: 'success',
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

const getOdpDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const odpResult = await query('SELECT * FROM odps WHERE id = $1', [id]);
    if (odpResult.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'ODP tidak ditemukan' });
    }
    
    const odp = odpResult.rows[0];
    
    const portsResult = await query(`
      SELECT p.id, p.port_number, p.client_id, p.status, c.fullname as client_name, c.whatsapp
      FROM port_assignments p
      LEFT JOIN clients c ON p.client_id = c.id
      WHERE p.odp_id = $1
      ORDER BY p.port_number ASC
    `, [id]);
    
    res.status(200).json({
      status: 'success',
      data: {
        odp,
        ports: portsResult.rows
      }
    });
  } catch (error) {
    next(error);
  }
};

const deleteOdp = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const result = await query('DELETE FROM odps WHERE id = $1 RETURNING id', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'ODP tidak ditemukan' });
    }

    res.status(200).json({ status: 'success', message: 'ODP berhasil dihapus' });
  } catch (error) {
    next(error);
  }
};

module.exports = { scanODP, assignPort, releasePort, getOdps, createOdp, getOdpDetails, deleteOdp };
