// src/lib/mercadopago.ts
import MercadoPago from "mercadopago";

export const mp = new MercadoPago({
  accessToken: process.env.MP_ACCESS_TOKEN!,
});

export const SESSION_VALUE = 150.0;
export const SESSION_DESCRIPTION = "Sessão de Terapia Online - 1 hora";

export interface CreatePaymentParams {
  bookingId: string;
  clientName: string;
  clientEmail: string;
  amount?: number;
}

export interface CreatePreferenceParams extends CreatePaymentParams {
  successUrl: string;
  failureUrl: string;
  pendingUrl: string;
}

// Criar preferência de pagamento (checkout completo: PIX + cartão)
export async function createPreference(params: CreatePreferenceParams) {
  const { Preference } = await import("mercadopago");
  const preference = new Preference(mp);

  const result = await preference.create({
    body: {
      items: [
        {
          id: params.bookingId,
          title: SESSION_DESCRIPTION,
          quantity: 1,
          unit_price: params.amount ?? SESSION_VALUE,
          currency_id: "BRL",
        },
      ],
      payer: {
        name: params.clientName.split(" ")[0],
        surname: params.clientName.split(" ").slice(1).join(" ") || "-",
        email: params.clientEmail,
      },
      payment_methods: {
        excluded_payment_types: [],
        installments: 1, // sem parcelamento
      },
      back_urls: {
        success: params.successUrl,
        failure: params.failureUrl,
        pending: params.pendingUrl,
      },
      auto_return: "approved",
      external_reference: params.bookingId,
      notification_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/webhook`,
      expires: true,
      expiration_date_from: new Date().toISOString(),
      expiration_date_to: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 min
      statement_descriptor: "TERAPIA ONLINE",
    },
  });

  return result;
}

// Criar pagamento PIX direto
export async function createPixPayment(params: CreatePaymentParams) {
  const { Payment } = await import("mercadopago");
  const payment = new Payment(mp);

  const result = await payment.create({
    body: {
      transaction_amount: params.amount ?? SESSION_VALUE,
      description: SESSION_DESCRIPTION,
      payment_method_id: "pix",
      payer: {
        email: params.clientEmail,
        first_name: params.clientName.split(" ")[0],
        last_name: params.clientName.split(" ").slice(1).join(" ") || "-",
      },
      external_reference: params.bookingId,
      notification_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/webhook`,
    },
  });

  return result;
}

// Consultar status de um pagamento
export async function getPaymentStatus(paymentId: string) {
  const { Payment } = await import("mercadopago");
  const payment = new Payment(mp);
  return payment.get({ id: paymentId });
}
