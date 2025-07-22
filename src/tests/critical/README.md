# Critical Path Tests

This directory contains tests for the most critical functionality of the application that must work correctly for production deployment.

## Test Files

### stripe-webhook-unit.test.ts ✅
**Status: PASSING (9/9 tests)**

Comprehensive unit tests for the Stripe webhook handler that verify:
- Webhook signature validation
- Successful payment processing (checkout.session.completed)
- Credit addition to user accounts
- Transaction logging
- Error handling (database failures, missing metadata)
- Concurrent request handling
- Edge cases (invalid data, non-checkout events)

### stripe-webhook.test.ts 📝
Integration test placeholder with manual testing checklist. The actual integration tests are skipped due to Next.js App Router compatibility issues with Jest, but the file contains:
- Manual testing instructions
- Stripe CLI commands
- Test credit card numbers
- Security checklist
- Database verification steps

## Running Tests

```bash
# Run all critical tests
npm test -- src/tests/critical/

# Run specific test file
npm test -- src/tests/critical/stripe-webhook-unit.test.ts

# Run with coverage
npm test -- src/tests/critical/ --coverage
```

## Test Coverage

Current coverage for Stripe webhook handling:
- ✅ Signature validation
- ✅ Successful payment processing
- ✅ Error handling
- ✅ Database operations
- ✅ Edge cases
- ✅ Concurrent requests

## Manual Testing Required

While unit tests cover the business logic, manual testing is still required for:
1. End-to-end payment flow through Stripe Checkout
2. Webhook delivery from Stripe to your endpoint
3. Real database updates (not mocked)
4. Network failures and retries
5. Production environment variables

## Adding New Critical Tests

When adding new critical path tests:
1. Focus on business-critical functionality
2. Test both success and failure paths
3. Include edge cases and error scenarios
4. Mock external dependencies (Stripe, database)
5. Keep tests fast and reliable
6. Document manual testing steps if needed