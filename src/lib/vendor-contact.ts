const APP_NAME = 'WellnessXplora';

export function vendorContactWhatsAppMessage(vendorName: string): string {
  const name = vendorName.trim() || 'there';
  return `Hello ${name}, I found you on ${APP_NAME} and would like to learn more about your services and products. Could you share more details?`;
}

export function buildVendorWhatsAppUrl(phoneE164: string, vendorName: string): string {
  const digits = phoneE164.replace(/\D/g, '');
  const params = new URLSearchParams();
  params.set('text', vendorContactWhatsAppMessage(vendorName));
  return `https://wa.me/${digits}?${params.toString()}`;
}
