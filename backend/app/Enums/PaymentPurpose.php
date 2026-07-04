<?php

namespace App\Enums;

/**
 * What a payment is for. Keeping every money movement in the payments
 * table (not just the initial booking fee) gives a clean audit trail and
 * makes the sales report a single source of truth.
 */
enum PaymentPurpose: string
{
    case Booking = 'booking';         // the base rental fee
    case Overtime = 'overtime';       // usage exceeded the booked window
    case DamageDeposit = 'damage';    // charge recorded against a damage report
}
