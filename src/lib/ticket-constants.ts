/** Ticket constants shared by server code and client components (no DB imports here). */

export const STATUSES = ['OPEN', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'RESOLVED', 'CLOSED', 'REOPENED'] as const
export type TicketStatus = (typeof STATUSES)[number]

export const PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'URGENT'] as const
export type Priority = (typeof PRIORITIES)[number]

export const CHANNELS = ['WEB', 'PHONE', 'WALK_IN', 'WHATSAPP', 'OTHER'] as const
export type Channel = (typeof CHANNELS)[number]

export const STATUS_LABELS: Record<string, string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In progress',
  WAITING_CUSTOMER: 'Waiting for customer',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
  REOPENED: 'Reopened',
}

export const CHANNEL_LABELS: Record<string, string> = {
  WEB: 'Website',
  PHONE: 'Phone call',
  WALK_IN: 'Walk-in',
  WHATSAPP: 'WhatsApp',
  OTHER: 'Other',
}

/** Days after closing during which a customer may reopen their own ticket. */
export const CUSTOMER_REOPEN_WINDOW_DAYS = 7

/**
 * Allowed status moves. CLOSED can be reached from any open state - both the
 * customer and an admin can close a ticket directly.
 */
const TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  OPEN: ['IN_PROGRESS', 'WAITING_CUSTOMER', 'RESOLVED', 'CLOSED'],
  IN_PROGRESS: ['WAITING_CUSTOMER', 'RESOLVED', 'CLOSED'],
  WAITING_CUSTOMER: ['IN_PROGRESS', 'RESOLVED', 'CLOSED'],
  RESOLVED: ['IN_PROGRESS', 'CLOSED', 'REOPENED'],
  REOPENED: ['IN_PROGRESS', 'WAITING_CUSTOMER', 'RESOLVED', 'CLOSED'],
  CLOSED: ['REOPENED'],
}

export function allowedTransitions(from: string): TicketStatus[] {
  return TRANSITIONS[from as TicketStatus] ?? []
}
