# SurveyKe - Kenya's Premier Survey Platform

A fully functional survey application built with React, TypeScript, Tailwind CSS, and Supabase. Users can complete surveys, earn money, and withdraw via M-Pesa.

## Features

- **Authentication**: Secure signup/login with Supabase Auth
- **Auto-login**: After signup, users are automatically logged in
- **Survey System**: Multiple categories (Lifestyle, Tech, Health, Finance)
- **Free & Premium Surveys**: Free lifestyle surveys, paid categories unlockable
- **M-Pesa Integration**: STK push for payments and withdrawals
- **Account Activation**: One-time KSH 100 fee to activate withdrawals
- **Premium Packages**: Three tiers (Basic KSH 350, Standard KSH 500, Elite KSH 650)
- **Wallet System**: Track earnings, balance, and transaction history
- **Responsive Design**: Mobile-first with beautiful UI

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS, shadcn/ui components
- **Backend**: Supabase (PostgreSQL + Auth + Realtime)
- **State Management**: React Context API
- **Icons**: Lucide React
- **Notifications**: Sonner toast notifications

## Getting Started

### 1. Clone and Install

```bash
git clone <repo-url>
cd kenya-survey-hub
npm install
```

### 2. Supabase Setup

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Go to the SQL Editor
3. Run the contents of `supabase-setup.sql`
4. Run the contents of `seed-surveys.sql` to populate survey questions

### 3. Environment Variables

Create a `.env` file in the root:

```env
VITE_SUPABASE_URL=https://jhzpromgrkwqaotzihvx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpoenByb21ncmt3cWFvdHppaHZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzODIwNTAsImV4cCI6MjA5MTk1ODA1MH0.OW5HeOzk53Vm91UuUTsYsoQbNOHOo0w44u5h2rb-TMY
```

### 4. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:5173`

## Database Schema

### Tables

- **profiles**: User profiles with balance, earnings, premium status
- **categories**: Survey categories (lifestyle, tech, health, finance)
- **surveys**: Survey questions with options and rewards
- **user_surveys**: Tracks completed surveys per user
- **unlocked_categories**: Tracks paid category unlocks
- **transactions**: Financial transactions (earnings, withdrawals, upgrades)
- **premium_packages**: Available premium tiers
- **mpesa_payments**: M-Pesa payment records

### Key Features

1. **Row Level Security (RLS)**: Users can only access their own data
2. **Triggers**: Auto-create profile on user signup
3. **Relationships**: Foreign keys ensure data integrity

## Account Activation Flow

When a user tries to withdraw with an inactive account:

1. Shows stylish "Account Inactive" modal
2. User pays KSH 100 activation fee via M-Pesa STK push
3. On success, account becomes active
4. User can now withdraw instantly to M-Pesa

## Premium Upgrade Flow

1. User selects a package
2. Pays via M-Pesa STK push
3. Profile updated with premium status
4. Account automatically activated
5. Access to all premium features

## Survey Completion Flow

1. User clicks on available survey category
2. Answers questions (5 questions per task)
3. Earns reward after completing each task
4. Balance updated in real-time
5. Transaction recorded

## M-Pesa Integration

The app simulates M-Pesa STK push for:
- Account activation (KSH 100)
- Category unlocks (KSH 180-250)
- Premium upgrades (KSH 350-650)
- Withdrawals (min KSH 2500)

## Project Structure

```
src/
├── components/         # UI components
│   ├── ui/            # shadcn/ui components
│   ├── AccountActivationModal.tsx
│   ├── ProtectedRoute.tsx
│   └── ...
├── contexts/          # React contexts
│   └── AuthContext.tsx
├── lib/               # Utilities
│   ├── supabase.ts    # Supabase client
│   ├── utils.ts
│   └── store.ts       # Local data (legacy)
├── pages/             # Page components
│   ├── AuthPage.tsx
│   ├── Dashboard.tsx
│   ├── SurveyPage.tsx
│   ├── WalletPage.tsx
│   ├── ProfilePage.tsx
│   └── PremiumPage.tsx
└── App.tsx
```

## Customization

### Changing Survey Rewards

Edit the reward values in `seed-surveys.sql`:
- Lifestyle: 30 KSH per question (150 per 5-question task)
- Tech: 30 KSH per question
- Health: 40 KSH per question
- Finance: 50 KSH per question

### Changing Premium Packages

Edit the packages in `supabase-setup.sql` under the premium_packages insert statement.

### Changing Minimum Withdrawal

Edit the `minWithdraw` constant in `WalletPage.tsx` (default: 2500 KSH).

## Deployment

### Build for Production

```bash
npm run build
```

### Deploy to Netlify/Vercel

1. Connect your GitHub repo
2. Set environment variables in dashboard
3. Deploy!

## License

MIT License - Free for commercial and personal use.

## Support

For issues or feature requests, please create an issue on GitHub.

---

Built with ❤️ for the Kenyan market research community.
