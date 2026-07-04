<?php

namespace App\Services\Booking;

use App\Models\Booking;
use Illuminate\Support\Carbon;

/**
 * Turns "how late was the return" into "how much extra to charge",
 * using the policy in config/payment.php:
 *  - a grace period is forgiven,
 *  - beyond that, each started block is charged at the pro-rated
 *    hourly rate times an overtime multiplier.
 */
class OvertimeCalculator
{
    /** @return array{exceeded_minutes:int, extra_charge_amount:float} */
    public function calculate(Booking $booking, Carbon $actualEnd): array
    {
        $scheduledEnd = Carbon::parse(
            $booking->booking_date->toDateString().' '.$booking->end_time
        );

        $exceeded = $scheduledEnd->lt($actualEnd)
            ? (int) $scheduledEnd->diffInMinutes($actualEnd)
            : 0;

        return [
            'exceeded_minutes' => $exceeded,
            'extra_charge_amount' => $this->charge($booking, $exceeded),
        ];
    }

    public function charge(Booking $booking, int $exceededMinutes): float
    {
        $grace = (int) config('payment.overtime.grace_minutes');
        $block = max(1, (int) config('payment.overtime.block_minutes'));
        $multiplier = (float) config('payment.overtime.rate_multiplier');

        if ($exceededMinutes <= $grace) {
            return 0.0;
        }

        $blocks = (int) ceil($exceededMinutes / $block);
        $ratePerBlock = ((float) $booking->equipment->hourly_rate) * ($block / 60) * $multiplier;

        return round($blocks * $ratePerBlock, 2);
    }
}
