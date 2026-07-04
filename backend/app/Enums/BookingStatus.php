<?php

namespace App\Enums;

/**
 * Lifecycle of a booking, in the order the business process happens:
 * pending -> confirmed -> checked_in -> in_use -> completed
 * (cancelled can terminate the flow at any point before completion).
 */
enum BookingStatus: string
{
    case Pending = 'pending';       // requested, awaiting confirmation / availability
    case Confirmed = 'confirmed';   // slot reserved, reference issued
    case CheckedIn = 'checked_in';  // customer arrived, safety briefing done
    case InUse = 'in_use';          // equipment handed over, usage clock running
    case Completed = 'completed';   // returned, inspected, transaction closed
    case Cancelled = 'cancelled';   // aborted (no-show, payment failed, customer backed out)

    public function isTerminal(): bool
    {
        return $this === self::Completed || $this === self::Cancelled;
    }
}
