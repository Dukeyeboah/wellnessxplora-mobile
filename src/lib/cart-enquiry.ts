import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

import type { CartLineItem } from '@/lib/cart-types';

const APP_NAME = 'WellnessXplora';

function formatItemLines(items: CartLineItem[]): string[] {
  return items.map((item) => {
    const qtyPart = item.quantity > 1 ? ` × ${item.quantity}` : '';
    const price =
      typeof item.price === 'number' && item.price > 0
        ? ` — ${item.currency ?? 'GHS'} ${item.price}${item.quantity > 1 ? ' each' : ''}`
        : '';
    return `• ${item.listingTitle}${qtyPart}${price}`;
  });
}

/** Prefilled WhatsApp body for a vendor cart checkout. */
export function buildCartEnquiryMessage(
  vendorName: string,
  items: CartLineItem[],
  userNote?: string,
  senderName?: string,
): string {
  const lines = [
    'Hello!',
    '',
    `I'm placing an order through ${APP_NAME} for ${vendorName.trim() || 'your store'}:`,
    '',
    ...formatItemLines(items),
    '',
    `This order was submitted via the ${APP_NAME} app.`,
    '',
  ];

  const note = userNote?.trim();
  if (note) {
    lines.push(note, '');
  } else {
    lines.push(
      "Please let me know availability, total price, and how you'd like to arrange payment or delivery.",
      '',
    );
  }

  lines.push('Thank you,');
  const signOff = senderName?.trim();
  if (signOff) lines.push(signOff);
  return lines.join('\n');
}

export function buildCartWhatsAppUrl(phoneE164: string, message: string): string {
  const digits = phoneE164.replace(/\D/g, '');
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

function buildNativeWhatsAppUrl(phoneE164: string, message: string): string {
  const digits = phoneE164.replace(/\D/g, '');
  return `whatsapp://send?phone=${digits}&text=${encodeURIComponent(message)}`;
}

/**
 * Open WhatsApp with a prefilled cart order message.
 * Tries the native WhatsApp scheme first on iOS/Android, then falls back to wa.me.
 */
export async function openCartWhatsAppOrder(
  phoneE164: string,
  vendorName: string,
  items: CartLineItem[],
  userNote?: string,
  senderName?: string,
): Promise<void> {
  const digits = phoneE164.replace(/\D/g, '');
  if (!digits) {
    throw new Error('Vendor WhatsApp number is not valid.');
  }

  const message = buildCartEnquiryMessage(vendorName, items, userNote, senderName);
  const candidates =
    Platform.OS === 'ios' || Platform.OS === 'android'
      ? [buildNativeWhatsAppUrl(phoneE164, message), buildCartWhatsAppUrl(phoneE164, message)]
      : [buildCartWhatsAppUrl(phoneE164, message)];

  for (const url of candidates) {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
        return;
      }
    } catch {
      /* try next */
    }
  }

  await Linking.openURL(buildCartWhatsAppUrl(phoneE164, message));
}

/** Pick the best WhatsApp number from vendor contact fields for checkout. */
export function resolveVendorWhatsAppForOrder(contact: {
  whatsapp?: string;
  phone?: string;
  showWhatsappPublic?: boolean;
}): string | undefined {
  const whatsapp = contact.whatsapp?.trim();
  if (whatsapp && contact.showWhatsappPublic !== false) return whatsapp;
  const phone = contact.phone?.trim();
  if (phone && contact.showWhatsappPublic !== false) return phone;
  return whatsapp || phone || undefined;
}
