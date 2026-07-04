<?php

namespace App\Services\Payment;

use App\Enums\PaymentMethod;

/**
 * What the frontend needs to render a checkout screen for one payment.
 * A real gateway would return its own hosted-page URL / QR string here;
 * the mock fills these with believable dummy data.
 */
readonly class GatewayInstruction
{
    public function __construct(
        public PaymentMethod $method,
        public float $amount,
        public string $reference,
        /** String to encode into the on-screen QR image (QR method only). */
        public ?string $qrPayload = null,
        /** Dummy bank account details (bank_transfer method only). */
        public ?array $bankAccount = null,
        /** Human-readable instructions shown under the QR / bank details. */
        public string $instructions = '',
        /** QR + bank transfer need the staff "Simulate payment received" action. */
        public bool $requiresSimulation = false,
    ) {}

    public function toArray(): array
    {
        return [
            'method' => $this->method->value,
            'amount' => number_format($this->amount, 2, '.', ''),
            'reference' => $this->reference,
            'qr_payload' => $this->qrPayload,
            'bank_account' => $this->bankAccount,
            'instructions' => $this->instructions,
            'requires_simulation' => $this->requiresSimulation,
        ];
    }
}
