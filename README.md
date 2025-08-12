# IAM CFO - Financial Management Platform

A comprehensive financial management platform designed specifically for rental property businesses, integrating property management with advanced financial analytics.

![IAM CFO Dashboard](https://img.shields.io/badge/Built%20with-React%20%7C%20TypeScript%20%7C%20Tailwind-blue)

## 🚀 Features

### 📊 Real-Time Dashboard
- **360° Business Intelligence** - Complete overview of your rental business
- **Cross-Platform Integration** - Airbnb, Guesty, QuickBooks, Xero
- **Property Performance Metrics** - Revenue, occupancy, ADR tracking
- **Interactive Charts** - Revenue trends, booking analytics, financial health

### 💰 Financial Management
- **Profit & Loss Statements** - Real-time P&L with expandable account details
- **Cash Flow Analysis** - Detailed income and expense tracking
- **Balance Sheet** - Complete financial position overview

### 🏨 Reservation Management
- **Booking Calendar** - Visual occupancy tracking with guest details
- **Revenue Reconciliation** - Platform fees, reserves, and payout calculations
- **Multi-Property Support** - Manage multiple listings across platforms

### 👥 Payroll & HR Management
- **Employee Management** - Complete staff database with benefits tracking
- **Payroll Processing** - Automated payroll runs with tax calculations
- **Tax Center** - Federal, state, and local tax liability management

### 📄 Owner Statements
- **Automated Generation** - Professional owner statements
- **Custom Templates** - Multiple statement formats
- **Revenue Breakdown** - Detailed income and expense reporting

## 🛠️ Technology Stack

- **Frontend**: React 18 with TypeScript
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Icons**: Lucide React

## 🚦 Getting Started

\`\`\`bash
# Clone the repository
git clone https://github.com/GPober/iam-cfo-app.git
cd iam-cfo-app

# Install dependencies
npm install

# Start the development server
npm start

```

## 🤖 AI CFO Synopsis

This project includes an AI-powered synopsis endpoint that provides CFO-style insights for selected financial data. To use it:

1. Set your OpenAI API key in an environment variable:

   ```bash
   export OPENAI_API_KEY="your_api_key_here"
   ```

2. Send a POST request to `/api/financial-synopsis` with a JSON body containing the financial information to review:

   ```bash
   curl -X POST \
     -H "Content-Type: application/json" \
   -d '{"data": "<financial details here>"}' \
    http://localhost:3000/api/financial-synopsis
   ```

The request payload should be kept small—only key revenue, expense, cash‑flow, and alert metrics are necessary. The API trims input to 10 kB and returns a 413 status if the payload exceeds this limit. 

The response includes a `synopsis` field summarizing alerts and insights like a CFO. On the application's Overview page, this synopsis is generated automatically and shown at the top for quick review.
