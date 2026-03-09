// src/types/index.ts
import { BookingStatus } from "@prisma/client";

export type { BookingStatus };

export interface SlotDTO {
  id: string;
  date: string;
  duration: number;
}

export interface BookingDTO {
  id: string;
  slotId: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  clientNote?: string | null;
  status: BookingStatus;
  expiresAt: string;
  createdAt: string;
  slot: SlotDTO;
  payment?: PaymentDTO | null;
}

export interface PaymentDTO {
  mpPaymentId?: string | null;
  mpPreferenceId?: string | null;
  mpStatus?: string | null;
  paymentMethod?: string | null;
  pixQrCode?: string | null;
  pixQrCodeBase64?: string | null;
  amount: number;
  paidAt?: string | null;
}
