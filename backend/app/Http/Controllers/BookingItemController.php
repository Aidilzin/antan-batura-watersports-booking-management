<?php

namespace App\Http\Controllers;

use App\Enums\EquipmentStatus;
use App\Enums\PaymentStatus;
use App\Http\Requests\CheckInRequest;
use App\Http\Requests\ReturnEquipmentRequest;
use App\Http\Resources\BookingResource;
use App\Models\Booking;
use App\Models\BookingItem;
use App\Models\BookingItemUnit;
use App\Models\DamageReport;
use App\Models\UsageLog;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;

class BookingItemController extends Controller
{
    /**
     * Check in a specific booking item.
     * Staff can optionally assign unit IDs at this point.
     */
    public function checkIn(CheckInRequest $request, Booking $booking, BookingItem $bookingItem)
    {
        $this->assertBelongsToBooking($bookingItem, $booking);

        if (!in_array($bookingItem->item_status, ['pending', 'confirmed'], true)) {
            throw ValidationException::withMessages([
                'item_status' => ["Item is {$bookingItem->item_status} and cannot be checked in."],
            ]);
        }

        $bookingItem->update([
            'item_status'           => 'checked_in',
            'safety_briefing_given' => $request->boolean('safety_briefing_given'),
            'safety_gear_issued'    => $request->boolean('safety_gear_issued'),
            'checked_in_at'         => Carbon::now(),
            'checked_in_by'         => $request->user()->id,
        ]);

        // Assign units if provided
        if ($request->filled('unit_ids')) {
            $unitIds = (array) $request->input('unit_ids');
            if (count($unitIds) !== $bookingItem->quantity) {
                throw ValidationException::withMessages([
                    'unit_ids' => ["Expected {$bookingItem->quantity} unit(s), got ".count($unitIds)."."],
                ]);
            }
            foreach ($unitIds as $unitId) {
                BookingItemUnit::create([
                    'booking_item_id'  => $bookingItem->id,
                    'equipment_unit_id'=> $unitId,
                    'assigned_at'      => Carbon::now(),
                ]);
            }
        }

        // If this is the first item checked in, update parent booking status
        if ($booking->status?->value === 'confirmed') {
            $booking->update(['status' => 'checked_in']);
        }

        return new BookingResource($booking->fresh(['items.itemUnits', 'payments']));
    }

    /**
     * Hand over equipment for a specific item. Payment must be confirmed first.
     */
    public function handOver(Request $request, Booking $booking, BookingItem $bookingItem)
    {
        $this->assertBelongsToBooking($bookingItem, $booking);

        if ($bookingItem->item_status !== 'checked_in') {
            throw ValidationException::withMessages([
                'item_status' => ['Item must be checked in before handover.'],
            ]);
        }

        $hasConfirmedPayment = $booking->payments()
            ->where('status', PaymentStatus::Confirmed)
            ->exists();

        if (!$hasConfirmedPayment) {
            throw ValidationException::withMessages([
                'payment' => ['Payment must be confirmed before equipment is handed over.'],
            ]);
        }

        $now = Carbon::now();

        $bookingItem->update([
            'item_status'  => 'in_use',
            'handed_over_at' => $now,
        ]);

        // Mark assigned units as booked
        foreach ($bookingItem->itemUnits as $unit) {
            $unit->equipmentUnit?->update(['status' => EquipmentStatus::Booked]);
        }

        // Start usage log for this item
        UsageLog::updateOrCreate(
            ['booking_item_id' => $bookingItem->id],
            ['actual_start_time' => $now, 'booking_id' => $booking->id],
        );

        // Update parent booking status if needed
        if ($booking->status?->value === 'checked_in') {
            $booking->update(['status' => 'in_use']);
        }

        return new BookingResource($booking->fresh(['items.itemUnits', 'payments', 'items.usageLog']));
    }

    /**
     * Return equipment for a specific item.
     */
    public function returnItem(ReturnEquipmentRequest $request, Booking $booking, BookingItem $bookingItem)
    {
        $this->assertBelongsToBooking($bookingItem, $booking);

        if ($bookingItem->item_status !== 'in_use') {
            throw ValidationException::withMessages([
                'item_status' => ['Item must be in use before it can be returned.'],
            ]);
        }

        $now    = Carbon::now();
        $usage  = $bookingItem->usageLog;

        // Calculate overtime using a pseudo-booking for the OvertimeCalculator
        $pseudoBooking = new \stdClass();
        $pseudoBooking->booking_date  = $bookingItem->booking_date;
        $pseudoBooking->end_time      = $bookingItem->end_time;
        $pseudoBooking->equipment     = (object) ['hourly_rate' => $bookingItem->rate_snapshot];

        $scheduledEnd = Carbon::parse($bookingItem->booking_date->toDateString().' '.$bookingItem->end_time);
        $exceeded = $scheduledEnd->lt($now) ? (int) $scheduledEnd->diffInMinutes($now) : 0;
        
        $overtime = $bookingItem->equipment_type === 'cruise_boat'
            ? ['exceeded_minutes' => $exceeded, 'extra_charge_amount' => 0.0]
            : $this->calcOvertime($bookingItem->rate_snapshot, $exceeded);

        if ($usage) {
            $usage->update([
                'actual_end_time'     => $now,
                'exceeded_minutes'    => $overtime['exceeded_minutes'],
                'extra_charge_amount' => $overtime['extra_charge_amount'],
                'condition_on_return' => $request->input('condition_on_return'),
            ]);
        }

        if ($request->input('condition_on_return') === 'damaged') {
            DamageReport::create([
                'booking_id'      => $booking->id,
                'booking_item_id' => $bookingItem->id,
                'description'     => $request->input('damage_description'),
                'deposit_charged' => $request->input('deposit_charged', 0),
                'recorded_by'     => $request->user()->id,
                'recorded_at'     => $now,
            ]);
        }

        $bookingItem->update([
            'item_status'  => 'completed',
            'completed_at' => $now,
        ]);

        // Free up assigned units
        foreach ($bookingItem->itemUnits as $unit) {
            $unit->equipmentUnit?->update(['status' => EquipmentStatus::Available]);
        }

        // If all items are completed, mark parent booking as completed
        $allDone = $booking->items()->whereNotIn('item_status', ['completed', 'cancelled'])->doesntExist();
        if ($allDone) {
            $booking->update(['status' => 'completed', 'completed_at' => $now]);
        }

        return new BookingResource($booking->fresh(['items.itemUnits', 'payments', 'items.usageLog', 'items.damageReports']));
    }

    private function calcOvertime(float $rate, int $exceededMinutes): array
    {
        $grace      = (int) config('payment.overtime.grace_minutes', 10);
        $block      = max(1, (int) config('payment.overtime.block_minutes', 30));
        $multiplier = (float) config('payment.overtime.rate_multiplier', 1.5);

        if ($exceededMinutes <= $grace) {
            return ['exceeded_minutes' => $exceededMinutes, 'extra_charge_amount' => 0.0];
        }

        $blocks      = (int) ceil($exceededMinutes / $block);
        $ratePerBlock = $rate * ($block / 60) * $multiplier;

        return [
            'exceeded_minutes'    => $exceededMinutes,
            'extra_charge_amount' => round($blocks * $ratePerBlock, 2),
        ];
    }

    private function assertBelongsToBooking(BookingItem $item, Booking $booking): void
    {
        if ($item->booking_id !== $booking->id) {
            abort(404, 'Booking item does not belong to this booking.');
        }
    }
}
