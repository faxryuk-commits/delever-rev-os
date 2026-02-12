/**
 * Domain events catalog. One publisher per event; subscribers (Analytics, Commission, Automation, AI) consume.
 * In-process for now; can add outbox/queue later.
 */

export type DomainEventType =
  | 'LeadCreated'
  | 'LeadConverted'
  | 'DealStageChanged'
  | 'DealWon'
  | 'DealLost'
  | 'ContractCreated'
  | 'SubscriptionActivated'
  | 'SubscriptionCancelled'
  | 'InvoiceIssued'
  | 'PaymentReceived'
  | 'TaskCreated';

export interface BaseEvent {
  type: DomainEventType;
  at: string; // ISO
  userId?: string;
}

export interface LeadCreatedEvent extends BaseEvent {
  type: 'LeadCreated';
  leadId: string;
  sourceId?: string;
  campaignId?: string;
  territoryId?: string;
}

export interface LeadConvertedEvent extends BaseEvent {
  type: 'LeadConverted';
  leadId: string;
  dealId: string;
}

export interface DealStageChangedEvent extends BaseEvent {
  type: 'DealStageChanged';
  dealId: string;
  fromStageId: string;
  toStageId: string;
  pipelineId: string;
}

export interface DealWonEvent extends BaseEvent {
  type: 'DealWon';
  dealId: string;
  amount?: number;
}

export interface DealLostEvent extends BaseEvent {
  type: 'DealLost';
  dealId: string;
}

export interface ContractCreatedEvent extends BaseEvent {
  type: 'ContractCreated';
  contractId: string;
  dealId?: string;
  companyId: string;
}

export interface InvoiceIssuedEvent extends BaseEvent {
  type: 'InvoiceIssued';
  invoiceId: string;
  amount: number;
}

export interface PaymentReceivedEvent extends BaseEvent {
  type: 'PaymentReceived';
  paymentId: string;
  invoiceId: string;
  amount: number;
}

export interface SubscriptionActivatedEvent extends BaseEvent {
  type: 'SubscriptionActivated';
  subscriptionId: string;
  contractId: string;
  mrr: number;
}

export interface SubscriptionCancelledEvent extends BaseEvent {
  type: 'SubscriptionCancelled';
  subscriptionId: string;
  mrr: number;
}

export interface TaskCreatedEvent extends BaseEvent {
  type: 'TaskCreated';
  taskId: string;
  dealId?: string;
  leadId?: string;
}

export type DomainEvent =
  | LeadCreatedEvent
  | LeadConvertedEvent
  | DealStageChangedEvent
  | DealWonEvent
  | DealLostEvent
  | ContractCreatedEvent
  | InvoiceIssuedEvent
  | PaymentReceivedEvent
  | SubscriptionActivatedEvent
  | SubscriptionCancelledEvent
  | TaskCreatedEvent;

type Listener = (event: DomainEvent) => void | Promise<void>;

const listeners: Listener[] = [];

export function emit(event: DomainEvent): void {
  const payload = { ...event, at: event.at || new Date().toISOString() };
  for (const fn of listeners) {
    try {
      const r = fn(payload);
      if (r && typeof (r as Promise<unknown>).catch === 'function') {
        (r as Promise<void>).catch((err) => console.error('Event listener error', err));
      }
    } catch (err) {
      console.error('Event listener error', err);
    }
  }
}

export function subscribe(fn: Listener): () => void {
  listeners.push(fn);
  return () => {
    const i = listeners.indexOf(fn);
    if (i >= 0) listeners.splice(i, 1);
  };
}
