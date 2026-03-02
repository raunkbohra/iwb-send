export enum Channel {
  SMS = 'SMS',
  EMAIL = 'EMAIL',
  WHATSAPP = 'WHATSAPP',
  VOICE = 'VOICE',
}

export enum Purpose {
  TRANSACTIONAL = 'TRANSACTIONAL',
  MARKETING = 'MARKETING',
  OTP = 'OTP',
  NOTIFICATION = 'NOTIFICATION',
}

export enum Provider {
  SPARROW = 'SPARROW',
  AAKASH = 'AAKASH',
  TELNYX = 'TELNYX',
  SES = 'SES',
  META_WA = 'META_WA',
}

export enum MessageStatus {
  QUEUED = 'QUEUED',
  SENDING = 'SENDING',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
}

export enum EventType {
  QUEUED = 'QUEUED',
  SENDING = 'SENDING',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
  BOUNCED = 'BOUNCED',
  COMPLAINED = 'COMPLAINED',
}

export enum WalletEntryType {
  CREDIT = 'CREDIT',
  DEBIT = 'DEBIT',
  REFUND = 'REFUND',
  ADJUSTMENT = 'ADJUSTMENT',
}
