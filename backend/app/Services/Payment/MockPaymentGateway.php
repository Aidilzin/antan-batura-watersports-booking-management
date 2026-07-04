<?php

namespace App\Services\Payment;

use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

/**
 * Simulated gateway for the demo. Looks and feels like a real checkout
 * (QR payload, bank details, a confirmation step) but never contacts a
 * processor or moves real money.
 */
class MockPaymentGateway implements PaymentGatewayService
{
    public function instructionsFor(Payment $payment): GatewayInstruction
    {
        $reference = 'PAY-'.$payment->booking->booking_reference;
        $amount = (float) $payment->amount;

        return match ($payment->method) {
            PaymentMethod::Qr => new GatewayInstruction(
                method: PaymentMethod::Qr,
                amount: $amount,
                reference: $reference,
                // Encoded into the on-screen QR. A real DuitNow payload would go here.
                qrPayload: $reference.'|RM'.number_format($amount, 2, '.', ''),
                instructions: 'Scan the QR with any banking app, then have staff confirm once payment is shown.',
                requiresSimulation: true,
            ),
            PaymentMethod::BankTransfer => new GatewayInstruction(
                method: PaymentMethod::BankTransfer,
                amount: $amount,
                reference: $reference,
                bankAccount: config('payment.mock_bank'),
                instructions: 'Transfer the exact amount and use the reference above. Staff will confirm on proof of transfer.',
                requiresSimulation: true,
            ),
            PaymentMethod::Cash => new GatewayInstruction(
                method: PaymentMethod::Cash,
                amount: $amount,
                reference: $reference,
                instructions: 'Collect cash from the customer and mark it received.',
                requiresSimulation: false,
            ),
        };
    }

    public function confirm(Payment $payment, ?User $staff = null): Payment
    {
        $payment->forceFill([
            'status' => PaymentStatus::Confirmed,
            'mock_transaction_id' => $this->generateTransactionId($payment),
            'recorded_by' => $staff?->id ?? $payment->recorded_by,
            'recorded_at' => Carbon::now(),
        ])->save();

        return $payment;
    }

    public function fail(Payment $payment, ?User $staff = null): Payment
    {
        $payment->forceFill([
            'status' => PaymentStatus::Failed,
            'recorded_by' => $staff?->id ?? $payment->recorded_by,
            'recorded_at' => Carbon::now(),
        ])->save();

        return $payment;
    }

    private function generateTransactionId(Payment $payment): string
    {
        return 'MOCK-'.$payment->booking->booking_reference.'-'.Str::upper(Str::random(6));
    }
}
