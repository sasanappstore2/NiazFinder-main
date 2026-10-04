import { HttpException, HttpStatus } from '@nestjs/common';

export class PaymentRequiredException extends HttpException {
  constructor(code: 'INSUFFICIENT_BALANCE' | 'WALLET_LOCKED' = 'INSUFFICIENT_BALANCE') {
    super({ error: 'موجودی کیف پول کافی نیست', code }, HttpStatus.PAYMENT_REQUIRED);
  }
}
