// Email service using Resend
// Note: In production, emails are sent from API routes, not client-side

export interface OrderEmailData {
  orderId: string;
  customerEmail: string;
  customerName: string;
  productName: string;
  productImage?: string;
  productPrice: number;
  totalUsdc: number;
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  txHash?: string;
  trackingNumber?: string;
  carrier?: string;
}

export type EmailType = 'order_confirmed' | 'order_shipped' | 'order_delivered';

// Email templates as HTML strings
export const emailTemplates = {
  order_confirmed: (data: OrderEmailData) => ({
    subject: `Order Confirmed - ${data.orderId}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Confirmed</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #111; border-radius: 16px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 32px; text-align: center;">
              <h1 style="margin: 0; color: #000; font-size: 28px; font-weight: 800;">Order Confirmed! 🎉</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              <p style="color: #fff; font-size: 18px; margin: 0 0 8px;">Hey ${data.customerName},</p>
              <p style="color: #9ca3af; font-size: 14px; margin: 0 0 24px;">Your USDC payment has been locked in escrow. We're processing your order now.</p>
              
              <!-- Order ID -->
              <div style="background-color: #1a1a1a; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
                <p style="color: #6b7280; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 4px;">Order ID</p>
                <p style="color: #10b981; font-size: 24px; font-weight: 700; margin: 0; font-family: monospace;">${data.orderId}</p>
              </div>
              
              <!-- Product -->
              <div style="background-color: #1a1a1a; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    ${data.productImage ? `<td width="80" style="vertical-align: top;">
                      <img src="${data.productImage}" alt="" width="64" height="64" style="border-radius: 8px; object-fit: cover;">
                    </td>` : ''}
                    <td style="vertical-align: top; padding-left: ${data.productImage ? '16px' : '0'};">
                      <p style="color: #fff; font-size: 16px; font-weight: 600; margin: 0 0 4px;">${data.productName}</p>
                      <p style="color: #6b7280; font-size: 12px; margin: 0;">TikTok Shop</p>
                    </td>
                    <td style="text-align: right; vertical-align: top;">
                      <p style="color: #10b981; font-size: 20px; font-weight: 700; margin: 0;">$${data.totalUsdc.toFixed(2)}</p>
                      <p style="color: #6b7280; font-size: 11px; margin: 0;">USDC</p>
                    </td>
                  </tr>
                </table>
              </div>
              
              <!-- Shipping -->
              <div style="background-color: #1a1a1a; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
                <p style="color: #6b7280; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 8px;">Shipping To</p>
                <p style="color: #fff; font-size: 14px; margin: 0;">${data.customerName}</p>
                <p style="color: #9ca3af; font-size: 13px; margin: 4px 0 0;">
                  ${data.shippingAddress.street}<br>
                  ${data.shippingAddress.city}, ${data.shippingAddress.state} ${data.shippingAddress.zip}
                </p>
              </div>
              
              <!-- CTA -->
              <a href="https://soltok-bridge.vercel.app/order/${data.orderId}" 
                 style="display: block; background-color: #10b981; color: #000; text-align: center; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 14px;">
                Track Your Order
              </a>
              
              ${data.txHash ? `
              <p style="color: #4b5563; font-size: 11px; text-align: center; margin: 16px 0 0;">
                TX: <a href="https://solscan.io/tx/${data.txHash}?cluster=devnet" style="color: #6b7280;">${data.txHash.slice(0, 16)}...</a>
              </p>
              ` : ''}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #0a0a0a; padding: 24px; text-align: center; border-top: 1px solid #222;">
              <p style="color: #4b5563; font-size: 12px; margin: 0;">
                Powered by <span style="color: #10b981; font-weight: 600;">SolTok Bridge</span>
              </p>
              <p style="color: #374151; font-size: 11px; margin: 8px 0 0;">
                TikTok Shop + Solana USDC
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  }),

  order_shipped: (data: OrderEmailData) => ({
    subject: `Your Order Has Shipped! - ${data.orderId}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Shipped</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #111; border-radius: 16px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); padding: 32px; text-align: center;">
              <h1 style="margin: 0; color: #fff; font-size: 28px; font-weight: 800;">Your Order Has Shipped! 📦</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              <p style="color: #fff; font-size: 18px; margin: 0 0 8px;">Great news, ${data.customerName}!</p>
              <p style="color: #9ca3af; font-size: 14px; margin: 0 0 24px;">Your package is on its way. Here's your tracking info:</p>
              
              <!-- Tracking -->
              <div style="background-color: #1a1a1a; border-radius: 12px; padding: 20px; margin-bottom: 24px; border: 1px solid #8b5cf6;">
                <p style="color: #6b7280; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 8px;">Tracking Number</p>
                <p style="color: #8b5cf6; font-size: 20px; font-weight: 700; margin: 0; font-family: monospace;">${data.trackingNumber || 'Processing...'}</p>
                ${data.carrier ? `<p style="color: #9ca3af; font-size: 13px; margin: 8px 0 0;">Carrier: ${data.carrier}</p>` : ''}
              </div>
              
              <!-- Order Summary -->
              <div style="background-color: #1a1a1a; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td>
                      <p style="color: #6b7280; font-size: 11px; margin: 0;">Order</p>
                      <p style="color: #fff; font-size: 14px; font-weight: 600; margin: 4px 0 0;">${data.orderId}</p>
                    </td>
                    <td style="text-align: right;">
                      <p style="color: #6b7280; font-size: 11px; margin: 0;">Product</p>
                      <p style="color: #fff; font-size: 14px; margin: 4px 0 0;">${data.productName}</p>
                    </td>
                  </tr>
                </table>
              </div>
              
              <!-- CTA -->
              <a href="https://soltok-bridge.vercel.app/order/${data.orderId}" 
                 style="display: block; background-color: #8b5cf6; color: #fff; text-align: center; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 14px;">
                Track Shipment
              </a>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #0a0a0a; padding: 24px; text-align: center; border-top: 1px solid #222;">
              <p style="color: #4b5563; font-size: 12px; margin: 0;">
                Powered by <span style="color: #10b981; font-weight: 600;">SolTok Bridge</span>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  }),

  order_delivered: (data: OrderEmailData) => ({
    subject: `Order Delivered! - ${data.orderId}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Delivered</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #111; border-radius: 16px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 32px; text-align: center;">
              <h1 style="margin: 0; color: #000; font-size: 28px; font-weight: 800;">Package Delivered! ✅</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              <p style="color: #fff; font-size: 18px; margin: 0 0 8px;">Hey ${data.customerName},</p>
              <p style="color: #9ca3af; font-size: 14px; margin: 0 0 24px;">Your order has been delivered! We hope you love your new ${data.productName}.</p>
              
              <!-- Order Complete -->
              <div style="background-color: #10b981; background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%); border: 1px solid #10b981; border-radius: 12px; padding: 24px; margin-bottom: 24px; text-align: center;">
                <p style="color: #10b981; font-size: 48px; margin: 0;">✓</p>
                <p style="color: #10b981; font-size: 18px; font-weight: 700; margin: 8px 0 0;">Order Complete</p>
                <p style="color: #6ee7b7; font-size: 13px; margin: 4px 0 0;">Escrow has been released</p>
              </div>
              
              <!-- Order Summary -->
              <div style="background-color: #1a1a1a; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td>
                      <p style="color: #6b7280; font-size: 11px; margin: 0;">Order ID</p>
                      <p style="color: #10b981; font-size: 16px; font-weight: 600; margin: 4px 0 0; font-family: monospace;">${data.orderId}</p>
                    </td>
                    <td style="text-align: right;">
                      <p style="color: #6b7280; font-size: 11px; margin: 0;">Total Paid</p>
                      <p style="color: #fff; font-size: 16px; font-weight: 600; margin: 4px 0 0;">$${data.totalUsdc.toFixed(2)} USDC</p>
                    </td>
                  </tr>
                </table>
              </div>
              
              <p style="color: #6b7280; font-size: 13px; text-align: center; margin: 0;">
                Thanks for using SolTok Bridge! 🌉
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #0a0a0a; padding: 24px; text-align: center; border-top: 1px solid #222;">
              <p style="color: #4b5563; font-size: 12px; margin: 0;">
                Powered by <span style="color: #10b981; font-weight: 600;">SolTok Bridge</span>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  }),
};

// Client-side function to trigger email via API
export async function sendOrderEmail(type: EmailType, data: OrderEmailData): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, data }),
    });

    const result = await response.json();
    
    if (!response.ok) {
      return { success: false, error: result.error || 'Failed to send email' };
    }

    return { success: true };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, error: 'Network error' };
  }
}
