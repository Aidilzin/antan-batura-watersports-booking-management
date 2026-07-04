<?php

namespace App\Http\Controllers;

use App\Enums\BookingStatus;
use App\Enums\EquipmentStatus;
use App\Http\Requests\ReturnEquipmentRequest;
use App\Http\Resources\BookingResource;
use App\Models\Booking;
use App\Models\DamageReport;
use App\Services\Booking\OvertimeCalculator;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;

class ReturnController extends Controller
{
    public function __construct(private readonly OvertimeCalculator $overtime) {}

    /**
     * Module 4 (usage monitoring) + module 5 (return & inspection) meet here:
     * closing out a booking stamps the actual end time, calculates any
     * overtime charge, logs condition, and — if damaged — opens a damage
     * report with an optional deposit. Equipment goes back to available.
     */
    public function returnEquipment(ReturnEquipmentRequest $request, Booking $booking)
    {
        if ($booking->status !== BookingStatus::InUse) {
            throw ValidationException::withMessages([
                'status' => ['Booking must be in use before it can be returned.'],
            ]);
        }

        $now = Carbon::now();
        $usage = $booking->usageLog;
        $overtime = $this->overtime->calculate($booking, $now);

        $usage->update([
            'actual_end_time' => $now,
            'exceeded_minutes' => $overtime['exceeded_minutes'],
            'extra_charge_amount' => $overtime['extra_charge_amount'],
            'condition_on_return' => $request->string('condition_on_return'),
        ]);

        if ($request->string('condition_on_return') === 'damaged') {
            DamageReport::create([
                'booking_id' => $booking->id,
                'description' => $request->string('damage_description'),
                'deposit_charged' => $request->float('deposit_charged', 0),
                'recorded_by' => $request->user()->id,
                'recorded_at' => $now,
            ]);
        }

        $booking->update([
            'status' => BookingStatus::Completed,
            'completed_at' => $now,
        ]);

        $booking->equipment->update(['status' => EquipmentStatus::Available]);

        return new BookingResource(
            $booking->fresh(['customer', 'equipment', 'usageLog', 'damageReports', 'payments'])
        );
    }
}
