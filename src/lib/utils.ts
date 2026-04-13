import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(cents: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);
}

export function generateInvoiceNumber(sequence: number): string {
  const year = new Date().getFullYear();
  return `INV-${year}-${String(sequence).padStart(5, '0')}`;
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(date));
}
