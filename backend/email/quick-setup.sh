#!/bin/bash

# Quick setup script for testing Resend email replies
echo "🚀 Resend Email Reply Setup Helper"
echo "=================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "📋 Prerequisites Check:"
echo ""

# Check if Resend API key is set
if grep -q "RESEND_API_KEY" ../.env; then
    echo -e "${GREEN}✅ Resend API key found in .env${NC}"
else
    echo -e "${RED}❌ Resend API key not found in .env${NC}"
    echo "   Add: RESEND_API_KEY=\"your_key_here\""
fi

echo ""
echo "🔧 Setup Steps:"
echo ""
echo "1. START YOUR BACKEND (in a new terminal):"
echo "   cd backend && encore run"
echo ""
echo "2. FOR LOCAL TESTING with ngrok (in another terminal):"
echo "   ngrok http 4000"
echo "   Copy the HTTPS URL (e.g., https://abc123.ngrok.io)"
echo ""
echo "3. CONFIGURE RESEND WEBHOOK:"
echo "   - Go to: https://resend.com/webhooks"
echo "   - Create webhook with your ngrok URL + /webhooks/email/inbound"
echo "   - Select event: email.received"
echo ""
echo "4. TEST THE WEBHOOK:"
echo "   cd backend/email"
echo "   npx tsx test-webhook.ts [ticket-id] [user-email]"
echo ""
echo "5. CONFIGURE DNS (for production):"
echo "   Add MX record for your reply subdomain:"
echo "   reply.conductor.app MX 10 inbound-smtp.us-east-1.amazonaws.com"
echo ""

# Try to test the health endpoint
echo "🔍 Testing local webhook endpoint..."
if curl -s -f http://localhost:4000/webhooks/email/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Webhook health endpoint is responding!${NC}"
    echo "   Your backend is running correctly."
else
    echo -e "${YELLOW}⚠️  Backend not running or webhook not accessible${NC}"
    echo "   Start your backend first: cd backend && encore run"
fi

echo ""
echo "📝 Next Steps:"
echo "1. Log into Resend Dashboard: https://resend.com"
echo "2. Add your inbound domain (e.g., reply.conductor.app)"
echo "3. Configure the webhook with your endpoint URL"
echo "4. Test with: npx tsx test-webhook.ts"
echo ""
echo "Need more details? Check RESEND_SETUP_GUIDE.md"