import { db } from './db.ts';
import type { Order, OrderItem } from '../src/types/index.ts';

// Test SKUs provided by Qikink for sandbox testing
export const QIKINK_SANDBOX_TEST_SKUS = ['MRnHs-Bk-L', 'MVnHs-Bk-M', 'MRnHs-Nb-S'];

interface QikinkConfig {
  clientId: string;
  clientSecret: string;
  sandboxSecret: string;
  isSandbox: boolean;
  baseUrl: string;
}

// Basic transliteration table for common Indic characters/accents
function toAsciiString(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    // replace emojis and non-ascii
    .replace(/[^\x20-\x7E]/g, ' ')
    // clean multiple spaces
    .replace(/\s+/g, ' ')
    .trim();
}

class QikinkService {
  private cachedToken: string | null = null;
  private tokenExpiresAt: number = 0;
  private requestTimestamps: number[] = [];

  getConfig(): QikinkConfig {
    const isSandbox = (process.env.QIKINK_SANDBOX_MODE ?? 'true').toLowerCase() === 'true';
    const clientId = process.env.QIKINK_CLIENT_ID?.trim() || '';
    const liveSecret = process.env.QIKINK_CLIENT_SECRET?.trim() || '';
    const sandboxSecret = process.env.QIKINK_SANDBOX_SECRET?.trim() || liveSecret;
    const clientSecret = isSandbox ? sandboxSecret : liveSecret;
    const baseUrl = isSandbox ? 'https://sandbox.qikink.com/api' : 'https://api.qikink.com/api';

    return {
      clientId,
      clientSecret,
      sandboxSecret,
      isSandbox,
      baseUrl
    };
  }

  isConfigured(): boolean {
    const cfg = this.getConfig();
    return Boolean(cfg.clientId && cfg.clientSecret);
  }

  // Rate Limiting: Max 30 requests per minute
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    // Keep timestamps from the last 60 seconds
    this.requestTimestamps = this.requestTimestamps.filter(t => now - t < 60000);

    if (this.requestTimestamps.length >= 30) {
      const oldestInWindow = this.requestTimestamps[0];
      const waitMs = Math.max(0, 60000 - (now - oldestInWindow) + 100);
      console.warn(`[Qikink Rate Limit] Waiting ${waitMs}ms to respect 30 req/min limit`);
      await new Promise(resolve => setTimeout(resolve, waitMs));
    }

    this.requestTimestamps.push(Date.now());
  }

  // Obtains Access Token via POST /token
  async getAccessToken(forceRefresh = false): Promise<string> {
    const cfg = this.getConfig();
    if (!cfg.clientId || !cfg.clientSecret) {
      throw new Error('Qikink credentials not configured. Please set QIKINK_CLIENT_ID and client secret in environment.');
    }

    const now = Date.now();
    if (!forceRefresh && this.cachedToken && this.tokenExpiresAt > now + 60000) {
      return this.cachedToken;
    }

    await this.enforceRateLimit();

    const start = Date.now();
    const tokenUrl = `${cfg.baseUrl}/token`;
    const formBody = new URLSearchParams();
    formBody.append('ClientId', cfg.clientId);
    formBody.append('client_secret', cfg.clientSecret);

    let res: Response;
    let data: any = null;
    let errorMsg: string | undefined;

    try {
      res = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: formBody.toString()
      });

      const text = await res.text();
      try {
        data = JSON.parse(text);
      } catch {
        data = { raw: text };
      }

      if (!res.ok) {
        errorMsg = data?.message || `HTTP ${res.status}: ${res.statusText}`;
      } else if (data?.status === 0 || data?.error) {
        errorMsg = data?.message || data?.error || 'Token request returned failure';
      }
    } catch (err: any) {
      errorMsg = err.message || 'Network error connecting to Qikink';
      res = { status: 500 } as any;
    }

    const duration = Date.now() - start;

    // Log the API attempt with masked secrets
    db.addLog({
      service: 'QIKINK',
      endpoint: `${tokenUrl}`,
      method: 'POST',
      status: res.status || 500,
      durationMs: duration,
      requestSnippet: `ClientId: ${cfg.clientId.slice(0, 4)}***, client_secret: ***`,
      responseSnippet: data?.token ? `Token obtained (starts with ${data.token.slice(0, 6)}...)` : JSON.stringify(data).slice(0, 300),
      error: errorMsg
    });

    if (errorMsg || !data?.token) {
      throw new Error(errorMsg || 'Failed to retrieve access token from Qikink');
    }

    this.cachedToken = data.token;
    // Tokens typically last hours; cache for 50 minutes to be safe
    this.tokenExpiresAt = Date.now() + 50 * 60 * 1000;
    return this.cachedToken!;
  }

  // Ping Qikink token endpoint to verify connection
  async ping(): Promise<{ ok: boolean; status: number; message: string; mode: string; details?: any }> {
    const cfg = this.getConfig();
    if (!this.isConfigured()) {
      return {
        ok: false,
        status: 400,
        mode: cfg.isSandbox ? 'SANDBOX' : 'LIVE',
        message: 'Qikink credentials not configured. Please set QIKINK_CLIENT_ID and QIKINK_CLIENT_SECRET or QIKINK_SANDBOX_SECRET in environment.'
      };
    }

    try {
      const token = await this.getAccessToken(true);
      return {
        ok: true,
        status: 200,
        mode: cfg.isSandbox ? 'SANDBOX' : 'LIVE',
        message: `Successfully connected to Qikink ${cfg.isSandbox ? 'Sandbox' : 'Live'} API. Token obtained.`,
        details: { tokenPreview: `${token.slice(0, 8)}...` }
      };
    } catch (err: any) {
      return {
        ok: false,
        status: 502,
        mode: cfg.isSandbox ? 'SANDBOX' : 'LIVE',
        message: err.message || 'Failed to ping Qikink API'
      };
    }
  }

  // Push an order to Qikink (POST /order/create) with retries (max 3)
  async pushOrder(order: Order): Promise<{ success: boolean; qikinkOrderId?: string; awb?: string; error?: string; rawResponse?: any }> {
    const cfg = this.getConfig();

    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'Qikink integration is not configured. Add credentials in environment variables.'
      };
    }

    let attempt = 0;
    const maxAttempts = 3;
    let lastError = '';

    while (attempt < maxAttempts) {
      attempt++;
      try {
        const token = await this.getAccessToken(attempt > 1);
        await this.enforceRateLimit();

        // Prepare line items
        const lineItems = order.items.map((item, index) => {
          if (cfg.isSandbox) {
            // Map to verified sandbox test SKUs in round-robin fashion
            const testSku = QIKINK_SANDBOX_TEST_SKUS[index % QIKINK_SANDBOX_TEST_SKUS.length];
            return {
              search_from_my_products: 0,
              sku: testSku,
              quantity: String(item.quantity),
              price: String(item.unitPrice)
            };
          } else {
            // Live mode uses merchant's storeSku or productSku
            const sku = item.storeSku?.trim() || item.productSku?.trim();
            return {
              search_from_my_products: 1,
              sku: sku,
              quantity: String(item.quantity),
              price: String(item.unitPrice)
            };
          }
        });

        // Ensure order_number <= 15 chars
        const orderNumberClean = order.orderNumber.slice(0, 15);

        // Sanitize shipping info to pure ASCII
        const address = order.shippingAddress;
        const sanitizedAddress = {
          first_name: toAsciiString(address.fullName.split(' ')[0] || 'Customer'),
          last_name: toAsciiString(address.fullName.split(' ').slice(1).join(' ') || '-'),
          address1: toAsciiString(address.addressLine1).slice(0, 100),
          address2: toAsciiString(address.addressLine2 || address.landmark || '').slice(0, 100),
          city: toAsciiString(address.city),
          state: toAsciiString(address.state),
          country: 'India',
          zip: toAsciiString(address.pincode),
          phone: address.phone.replace(/[^0-9]/g, '').slice(-10),
          email: address.email.trim()
        };

        const payload = {
          order_number: orderNumberClean,
          payment_mode: order.paymentMethod === 'COD' ? 'COD' : 'PREPAID',
          total_order_value: String(Math.round(order.totalAmount)),
          line_items: lineItems,
          shipping_address: sanitizedAddress
        };

        const start = Date.now();
        const createUrl = `${cfg.baseUrl}/order/create`;

        const res = await fetch(createUrl, {
          method: 'POST',
          headers: {
            'ClientId': cfg.clientId,
            'Accesstoken': token,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        const text = await res.text();
        let data: any = {};
        try {
          data = JSON.parse(text);
        } catch {
          data = { raw: text };
        }

        const duration = Date.now() - start;

        // Log the call with masked payload
        db.addLog({
          service: 'QIKINK',
          endpoint: createUrl,
          method: 'POST',
          status: res.status,
          durationMs: duration,
          requestSnippet: `Order ${orderNumberClean}, items: ${lineItems.length}, mode: ${payload.payment_mode}`,
          responseSnippet: JSON.stringify(data).slice(0, 400),
          error: !res.ok || data?.status === 0 ? (data?.message || `HTTP ${res.status}`) : undefined
        });

        // Check response
        // Qikink returns status: 1 or success on success, or order_id
        if (res.ok && (data?.status === 1 || data?.success === true || data?.order_id || data?.id)) {
          const qOrderId = String(data.order_id || data.id || data.data?.order_id || '');
          const awb = data.awb_number || data.awb || data.data?.awb || undefined;
          return {
            success: true,
            qikinkOrderId: qOrderId,
            awb: awb,
            rawResponse: data
          };
        } else {
          lastError = data?.message || data?.error || data?.errors?.[0] || `Qikink rejected order with status ${res.status}`;
          // If token expired, force refresh on next retry
          if (res.status === 401 || (typeof data?.message === 'string' && data.message.toLowerCase().includes('token'))) {
            this.cachedToken = null;
          }
        }
      } catch (err: any) {
        lastError = err.message || 'Network error sending to Qikink';
      }

      // Short delay before retry
      if (attempt < maxAttempts) {
        await new Promise(r => setTimeout(r, attempt * 1000));
      }
    }

    return {
      success: false,
      error: lastError || 'Max retries exceeded without success'
    };
  }
}

export const qikink = new QikinkService();
