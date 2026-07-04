<?php

namespace App\Services\Payment;

use App\Models\Payment;
use App\Models\User;

/**
 * Contract the booking flow depends on. Swap MockPaymentGateway for a real
 * DuitNow QR / ToyyibPay adapter later by rebinding this in a service provider
 * — no controller or booking-flow code needs to change.
 */
interface PaymentGatewayService
{
    /** Build the checkout instructions (QR payload / bank details) for a pending payment. */
    public function instructionsFor(Payment $payment): GatewayInstruction;

    /**
     * Confirm a payment. For a real gateway this is driven by a webhook;
     * the mock is driven by staff clicking "Simulate payment received".
     * Stamps a transaction id, marks it confirmed, records who/when.
     */
    public function confirm(Payment $payment, ?User $staff = null): Payment;

    /** Mark a payment failed (customer backed out, wrong amount, etc.). */
    public function fail(Payment $payment, ?User $staff = null): Payment;
}
