<?php

namespace App\Services\Booking;

use App\Enums\EquipmentStatus;
use App\Models\BookingItem;
use App\Models\Equipment;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/**
 * Answers "is this equipment type free for this slot?" based on fleet capacity.
 */
class AvailabilityService
{
    /** Check remaining capacity for a given equipment type and slot. */
    public function getAvailableCapacity(
        string $type,
        string $date,
        string $start,
        string $end,
        ?int $ignoreBookingId = null,
        ?array $ignoreItemIds = null
    ): int {
        // Count total units of this type in fleet excluding maintenance (for today)
        $isToday = Carbon::parse($date)->isToday();
        
        $totalUnitsQuery = Equipment::where('type', $type);
        if ($isToday) {
            $totalUnitsQuery->where('status', '!=', EquipmentStatus::Maintenance->value);
        }
        $totalUnits = $totalUnitsQuery->count();

        // Sum quantity of overlapping BookingItems
        $query = BookingItem::query()
            ->where('equipment_type', $type)
            ->whereDate('booking_date', $date)
            ->whereNotIn('item_status', ['cancelled', 'completed']) // Completed/cancelled items don't occupy slots
            ->where('start_time', '<', $this->normalize($end))
            ->where('end_time', '>', $this->normalize($start));

        if ($ignoreBookingId) {
            $query->where('booking_id', '!=', $ignoreBookingId);
        }

        if ($ignoreItemIds && count($ignoreItemIds) > 0) {
            $query->whereNotIn('id', $ignoreItemIds);
        }

        $allocatedUnits = (int) $query->sum('quantity');

        return max(0, $totalUnits - $allocatedUnits);
    }

    /** Is a single piece of equipment free for the given slot? */
    public function isAvailable(
        Equipment $equipment,
        string $date,
        string $start,
        string $end,
        ?int $ignoreBookingId = null,
    ): bool {
        if ($equipment->status === EquipmentStatus::Maintenance) {
            if (Carbon::parse($date)->isToday()) {
                return false;
            }
        }

        return $this->getAvailableCapacity($equipment->type->value, $date, $start, $end, $ignoreBookingId) >= 1;
    }

    /** Every bookable unit free for the slot, optionally filtered by type. */
    public function availableEquipment(string $date, string $start, string $end, ?string $type = null): Collection
    {
        $query = Equipment::query();
        
        if (Carbon::parse($date)->isToday()) {
            $query->where('status', '!=', EquipmentStatus::Maintenance->value);
        }
        
        if ($type) {
            $query->where('type', $type);
        }

        $allUnits = $query->get();

        return $allUnits->filter(function (Equipment $e) use ($date, $start, $end) {
            return $this->getAvailableCapacity($e->type->value, $date, $start, $end) >= 1;
        })->values();
    }

    /**
     * Suggestions when the requested slot is taken:
     *  - the same slot on other units of the same type
     *  - free time windows for the same unit on the same day
     */
    public function alternativesFor(Equipment $equipment, string $date, string $start, string $end): array
    {
        $durationMinutes = $this->minutesBetween($start, $end);

        $sameType = $this->availableEquipment($date, $start, $end, $equipment->type->value)
            ->reject(fn (Equipment $e) => $e->id === $equipment->id)
            ->take(5)
            ->values();

        return [
            'same_type_equipment' => $sameType,
            'free_slots' => $this->freeSlotsForEquipment($equipment, $date, $durationMinutes),
        ];
    }

    /** Scan the operating window for open time slots of the requested length. */
    public function freeSlotsForEquipment(Equipment $equipment, string $date, int $durationMinutes, int $limit = 6): array
    {
        $open = Carbon::parse($date.' '.config('booking.open_time'));
        $close = Carbon::parse($date.' '.config('booking.close_time'));

        $slots = [];
        $cursor = $open->copy();

        while ($cursor->copy()->addMinutes($durationMinutes)->lte($close)) {
            $slotStart = $cursor->format('H:i');
            $slotEnd = $cursor->copy()->addMinutes($durationMinutes)->format('H:i');

            if ($this->isAvailable($equipment, $date, $slotStart, $slotEnd)) {
                $slots[] = ['start_time' => $slotStart, 'end_time' => $slotEnd];
                if (count($slots) >= $limit) {
                    break;
                }
            }

            $cursor->addMinutes(30); // step by half-hour
        }

        return $slots;
    }

    private function minutesBetween(string $start, string $end): int
    {
        return Carbon::parse($start)->diffInMinutes(Carbon::parse($end));
    }

    private function normalize(string $time): string
    {
        return Carbon::parse($time)->format('H:i:s');
    }
}
