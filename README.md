# Terapia Online — Sistema de Agendamento e Pagamento

Sistema completo de agendamento para sessões de terapia online com integração ao Mercado Pago (PIX e cartão de crédito), painel administrativo e reserva temporária de 10 minutos.

---

## Visão Geral da Arquitetura

```
┌─────────────────────────────────────────────────────────┐
│                        Cliente                          │
│  / (calendário)  →  /pagamento/[id]  →  /confirmacao/[id]│
└────────────────────────────┬────────────────────────────┘
                             │ HTTP/API
┌────────────────────────────▼────────────────────────────┐
│                   Next.js App (API Routes)               │
│  /api/slots        — Consultar horários disponíveis      │
│  /api/bookings     — Criar reserva (bloqueia 10 min)     │
│  /api/payments/create  — Gerar PIX ou checkout           │
│  /api/payments/webhook — Receber confirmação do MP       │
│  /api/admin/*      — Endpoints protegidos (JWT)          │
└────────────────────────────┬────────────────────────────┘
                             │ Prisma ORM
┌────────────────────────────▼────────────────────────────┐
│                      PostgreSQL                         │
│  Admin · AvailableSlot · Booking · Payment              │
└─────────────────────────────────────────────────────────┘
                             │ API REST
┌────────────────────────────▼────────────────────────────┐
│                    Mercado Pago                         │
│  PIX (pagamento direto)  ·  Checkout (cartão)           │
│  Webhook → /api/payments/webhook                        │
└─────────────────────────────────────────────────────────┘
```

---

## Estrutura de Pastas

```
terapia-online/
├── prisma/
│   ├── schema.prisma        # Modelos do banco
│   └── seed.ts              # Dados iniciais
├── src/
│   ├── app/
│   │   ├── page.tsx         # Página de agendamento (cliente)
│   │   ├── pagamento/[id]/  # Página de pagamento com cronômetro
│   │   ├── confirmacao/[id]/# Confirmação de sessão
│   │   ├── admin/
│   │   │   ├── page.tsx     # Login do admin
│   │   │   └── dashboard/   # Painel completo
│   │   └── api/
│   │       ├── slots/       # CRUD de horários
│   │       ├── bookings/    # Criação de reservas
│   │       ├── payments/
│   │       │   ├── create/  # Criar PIX ou preferência MP
│   │       │   └── webhook/ # Receber notificação MP
│   │       ├── admin/       # Endpoints admin protegidos
│   │       └── auth/        # NextAuth
│   ├── lib/
│   │   ├── prisma.ts        # Singleton Prisma
│   │   ├── mercadopago.ts   # Funções de pagamento
│   │   ├── auth.ts          # Configuração NextAuth
│   │   └── utils.ts         # Helpers
│   ├── middleware.ts         # Proteção de rotas admin
│   └── types/               # TypeScript types
├── .env.example
├── next.config.ts
├── tailwind.config.ts
└── package.json
```

---

## Modelagem do Banco (Prisma)

### AvailableSlot
Horários que a terapeuta disponibiliza. Criados manualmente via painel admin.

| Campo    | Tipo     | Descrição                     |
|----------|----------|-------------------------------|
| id       | CUID     | Identificador único           |
| date     | DateTime | Data e hora de início (UTC)   |
| duration | Int      | Duração em minutos (padrão 60)|
| isActive | Boolean  | Se está ativo                 |

### Booking
Reserva feita pelo cliente. Status: `PENDING_PAYMENT → CONFIRMED | EXPIRED | CANCELLED`

| Campo       | Tipo     | Descrição                          |
|-------------|----------|------------------------------------|
| id          | CUID     | Identificador único                |
| slotId      | FK       | Referência ao horário              |
| clientName  | String   | Nome completo                      |
| clientEmail | String   | E-mail do cliente                  |
| clientPhone | String   | Telefone                           |
| status      | Enum     | Status atual da reserva            |
| expiresAt   | DateTime | Expiração do bloqueio (10 min)     |

### Payment
Dados do pagamento via Mercado Pago.

| Campo           | Tipo    | Descrição                      |
|-----------------|---------|--------------------------------|
| mpPaymentId     | String? | ID do pagamento no MP          |
| mpPreferenceId  | String? | ID da preferência (checkout)   |
| mpStatus        | String? | approved, pending, rejected    |
| pixQrCode       | String? | Código PIX copia e cola        |
| pixQrCodeBase64 | String? | QR Code em base64              |

---

## Fluxo de Reserva e Pagamento

```
1. Cliente escolhe data e horário (calendário)
2. Preenche nome, e-mail, telefone
3. POST /api/bookings → cria Booking com status PENDING_PAYMENT
   └── expiresAt = agora + 10 minutos
   └── verificação de conflito por transação (atômica)
4. Redirecionado para /pagamento/[bookingId]
5. Escolhe PIX ou Cartão
   └── PIX: POST /api/payments/create (method=pix)
       └── Mercado Pago cria pagamento PIX
       └── Retorna qrCode + qrCodeBase64
   └── Cartão: POST /api/payments/create (method=card)
       └── Mercado Pago cria Preference
       └── Redireciona para checkout.mercadopago.com
6. Cronômetro regressivo (10min) na tela de pagamento
7. Polling a cada 5s consultando status da reserva
8. Webhook /api/payments/webhook recebe notificação do MP
   └── status=approved → booking.status = CONFIRMED
   └── status=rejected → booking.status = CANCELLED
9. Se expirar sem pagamento → status = EXPIRED, slot liberado
10. Cliente redirecionado para /confirmacao/[id]
```

---

## Instalação e Configuração

### 1. Clonar e instalar dependências

```bash
git clone <repositorio>
cd terapia-online
npm install
```

### 2. Configurar variáveis de ambiente

```bash
cp .env.example .env
```

Edite o `.env` com suas credenciais:

```env
DATABASE_URL="postgresql://usuario:senha@localhost:5432/terapia_online"
NEXTAUTH_SECRET="gere-com: openssl rand -base64 32"
NEXTAUTH_URL="http://localhost:3000"
MP_ACCESS_TOKEN="APP_USR-seu-token-aqui"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 3. Configurar banco de dados

```bash
# Criar e aplicar migrations
npm run db:push

# Ou com migrations controladas:
npm run db:migrate

# Popular com dados iniciais (admin + horários)
npm run db:seed
```

Credenciais padrão criadas pelo seed:
- **E-mail:** admin@terapia.com
- **Senha:** admin123

> ⚠️ **Troque a senha imediatamente em produção!**

### 4. Rodar em desenvolvimento

```bash
npm run dev
```

Acesse: http://localhost:3000

---

## Configuração do Mercado Pago

### 1. Criar conta de desenvolvedor
Acesse: https://www.mercadopago.com.br/developers/panel

### 2. Obter credenciais
- Acesse **Suas integrações → Criar aplicação**
- Copie o **Access Token** (começa com `APP_USR-`)
- Para testes: use as credenciais de **Sandbox** (começa com `TEST-`)

### 3. Configurar Webhook no painel MP
- URL do webhook: `https://seu-dominio.com/api/payments/webhook`
- Eventos: `payment` (essencial)

### 4. Testar com Sandbox
Use cartões de teste fornecidos pelo MP:
- **Aprovação:** 5031 7557 3453 0604 | CVV: 123 | Venc: 11/25
- **Rejeição:** 5031 7557 3453 0605

Para PIX em sandbox, o pagamento é aprovado automaticamente após alguns segundos.

---

## Deploy em Produção

### Opção A: Vercel (recomendado)

```bash
# Instalar CLI Vercel
npm i -g vercel

# Deploy
vercel

# Adicionar variáveis de ambiente no painel Vercel:
# DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL, MP_ACCESS_TOKEN, etc.
```

> **Importante:** A Vercel não persiste arquivos, mas o banco PostgreSQL deve ser externo.

### Opção B: VPS/DigitalOcean com Docker

```dockerfile
# Dockerfile (adicionar ao projeto)
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    env_file: .env
    depends_on:
      - db
  db:
    image: postgres:16
    environment:
      POSTGRES_DB: terapia_online
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: senha_segura
    volumes:
      - pgdata:/var/lib/postgresql/data
volumes:
  pgdata:
```

### Banco de dados recomendado para produção
- **Supabase** (gratuito): https://supabase.com
- **Neon** (gratuito): https://neon.tech
- **Railway**: https://railway.app

---

## Webhook em Desenvolvimento (ngrok)

Para testar o webhook localmente:

```bash
# Instalar ngrok
npm install -g ngrok

# Em um terminal
npm run dev

# Em outro terminal
ngrok http 3000
```

Use a URL HTTPS do ngrok como `NEXT_PUBLIC_APP_URL` e configure no painel do Mercado Pago.

---

## Funcionalidades Implementadas

| Feature                              | Status |
|--------------------------------------|--------|
| Calendário de agendamento            | ✅     |
| Seleção de horário disponível        | ✅     |
| Formulário de dados do cliente       | ✅     |
| Reserva temporária (10 min)          | ✅     |
| Bloqueio atômico de vagas            | ✅     |
| Liberação automática após expiração  | ✅     |
| Cronômetro visual na tela de pagamento | ✅   |
| Pagamento PIX (QR Code + Copia/Cola) | ✅     |
| Pagamento por Cartão (checkout MP)   | ✅     |
| Webhook para confirmação automática  | ✅     |
| Polling de status (a cada 5s)        | ✅     |
| Página de confirmação                | ✅     |
| Painel admin (login seguro)          | ✅     |
| Admin: visão geral com métricas      | ✅     |
| Admin: gestão de agenda/horários     | ✅     |
| Admin: listagem de sessões           | ✅     |
| Proteção de rotas admin (JWT)        | ✅     |
| Design responsivo (mobile-first)     | ✅     |
| TypeScript end-to-end                | ✅     |
| Validação de dados (Zod)             | ✅     |

---

## Personalização

### Alterar valor da sessão
Edite `src/lib/mercadopago.ts`:
```ts
export const SESSION_VALUE = 150.00; // ← Altere aqui
```

### Alterar tempo de bloqueio
No arquivo `.env`:
```env
RESERVATION_TIMEOUT_MINUTES=10
```

### Adicionar e-mail de confirmação
No webhook (`src/app/api/payments/webhook/route.ts`), após `status === "approved"`:
```ts
// Descomente e implemente:
// await sendConfirmationEmail(booking);
```
Recomendo usar **Resend** (https://resend.com) ou **Nodemailer**.

### Personalizar nome/dados da terapeuta
- Nome: edite `src/app/layout.tsx` (metadata) e os componentes
- Cores: edite `tailwind.config.ts` e `src/app/globals.css`

---

## Segurança

- Senhas hasheadas com bcrypt (salt rounds: 12)
- Rotas admin protegidas por JWT (NextAuth)
- Middleware de autorização em todas as rotas `/admin/*`
- Transações atômicas no banco para evitar race conditions
- Validação de input com Zod em todas as APIs
- Verificação de assinatura do webhook MP (configurável)

---

## Stack Tecnológica

| Tecnologia     | Uso                              |
|----------------|----------------------------------|
| Next.js 14     | Framework React (App Router)     |
| TypeScript     | Tipagem estática                 |
| Prisma         | ORM e migrations                 |
| PostgreSQL      | Banco de dados relacional        |
| NextAuth.js    | Autenticação admin (JWT)         |
| Mercado Pago   | Processamento de pagamentos      |
| Tailwind CSS   | Estilização                      |
| date-fns       | Manipulação de datas             |
| Zod            | Validação de schemas             |
| react-hot-toast| Notificações                     |
| bcryptjs       | Hash de senhas                   |

---

## Suporte

Para dúvidas sobre a integração com Mercado Pago, consulte:
- Documentação oficial: https://www.mercadopago.com.br/developers/pt/docs
- PIX: https://www.mercadopago.com.br/developers/pt/docs/checkout-api/payment-methods/other-payment-methods/brazil/pix
- Webhook: https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks
