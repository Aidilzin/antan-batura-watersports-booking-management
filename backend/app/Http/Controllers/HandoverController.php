<?php

namespace App\Http\Controllers;

use App\Enums\BookingStatus;
use App\Enums\EquipmentStatus;
use App\Enums\PaymentStatus;
use App\Http\Resources\BookingResource;
use App\Models\Booking;
use App\Models\UsageLog;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;

class HandoverController extends Controller
{
    /**
     * Staff hand the equipment over once payment is confirmed. This starts
     * the usage clock (module 4) and moves the booking to in_use.
     */
    public function handOver(Booking $booking)
    {
        if ($booking->status !== BookingStatus::CheckedIn) {
            throw ValidationException::withMessages([
                'status' => ['Booking must be checked in before handover.'],
            ]);
        }

        $hasConfirmedPayment = $booking->payments()
            ->where('status', PaymentStatus::Confirmed)
            ->exists();

        if (! $hasConfirmedPayment) {
            throw ValidationException::withMessages([
                'payment' => ['Payment must be confirmed before equipment is handed over.'],
            ]);
        }

        $now = Carbon::now();

        $booking->update([
            'status' => BookingStatus::InUse,
            'handed_over_at' => $now,
        ]);

        $booking->equipment->update(['status' => EquipmentStatus::Booked]);

        UsageLog::updateOrCreate(
            ['booking_id' => $booking->id],
            ['actual_start_time' => $now],
        );

        return response()->json([
            'message' => 'Equipment handed over. Usage clock started.',
            'booking' => new BookingResource($booking->fresh(['customer', 'equipment', 'usageLog', 'payments'])),
        ]);
    }
}
