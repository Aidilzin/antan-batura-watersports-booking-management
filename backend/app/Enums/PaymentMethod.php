<?php

namespace App\Enums;

enum PaymentMethod: string
{
    case Qr = 'qr';
    case BankTransfer = 'bank_transfer';
    case Cash = 'cash';

    /**
     * QR and bank transfer are confirmed via the mock gateway's
     * "simulate payment received" action; cash is confirmed in person.
     */
    public function requiresGatewaySimulation(): bool
    {
        return $this === self::Qr || $this === self::BankTransfer;
    }
}
