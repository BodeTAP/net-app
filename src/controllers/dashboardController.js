const { query } = require('../config/db');

const getDashboardStats = async (req, res, next) => {
  try {
    const activeClientsQuery = await query('SELECT COUNT(*) FROM clients WHERE is_active = true');
    const totalODPQuery = await query('SELECT COUNT(*) FROM odps');
    const openTicketsQuery = await query("SELECT COUNT(*) FROM tickets WHERE status = 'OPEN'");
    const revenueQuery = await query("SELECT COALESCE(SUM(amount), 0) as total FROM invoices WHERE status = 'PAID'");

    const activeClients = parseInt(activeClientsQuery.rows[0].count, 10);
    const totalODPs = parseInt(totalODPQuery.rows[0].count, 10);
    const openTickets = parseInt(openTicketsQuery.rows[0].count, 10);
    const revenue = parseFloat(revenueQuery.rows[0].total);

    res.status(200).json({
      status: 'success',
      data: {
        activeClients,
        totalODPs,
        openTickets,
        revenue
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getDashboardStats };
