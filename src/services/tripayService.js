const crypto = require('crypto');
const axios = require('axios');

class TripayService {
  constructor() {
    this.apiKey = process.env.TRIPAY_API_KEY;
    this.privateKey = process.env.TRIPAY_PRIVATE_KEY;
    this.merchantCode = process.env.TRIPAY_MERCHANT_CODE;
    this.mode = process.env.TRIPAY_MODE || 'SANDBOX';
    
    this.baseUrl = this.mode === 'PRODUCTION' 
      ? 'https://tripay.co.id/api' 
      : 'https://tripay.co.id/api-sandbox';
  }

  generateSignature(merchantRef, amount) {
    const signatureStr = `${this.merchantCode}${merchantRef}${amount}`;
    return crypto.createHmac('sha256', this.privateKey)
      .update(signatureStr)
      .digest('hex');
  }

  async requestTransaction({ merchantRef, amount, method, customerName, customerEmail, customerPhone, orderItems, returnUrl }) {
    try {
      const signature = this.generateSignature(merchantRef, amount);
      
      const payload = {
        method, // e.g. 'BRIVA', 'QRISC'
        merchant_ref: merchantRef,
        amount,
        customer_name: customerName,
        customer_email: customerEmail || 'customer@example.com',
        customer_phone: customerPhone,
        order_items: orderItems,
        return_url: returnUrl,
        expired_time: (Math.floor(Date.now() / 1000) + (24 * 60 * 60)), // 24 hours
        signature
      };

      const response = await axios.post(`${this.baseUrl}/transaction/create`, payload, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      return response.data;
    } catch (error) {
      console.error('Tripay API Error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Gagal memproses pembayaran Tripay');
    }
  }

  verifyCallbackSignature(json, signature) {
    const expectedSignature = crypto.createHmac('sha256', this.privateKey)
      .update(json)
      .digest('hex');
    return expectedSignature === signature;
  }
}

module.exports = new TripayService();
