<?php

namespace App\Services\Booking;

use App\Enums\EquipmentStatus;
use App\Models\Booking;
use App\Models\Equipment;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/**
 * Answers "is this equipment free for this slot?" and, when it isn't,
 * suggests alternatives (other equipment of the same type, or other free
 * times on the same equipment) so the customer can rebook or waitlist.
 */
class AvailabilityService
{
    /** Is a single piece of equipment free for the given slot? */
    public function isAvailable(
        Equipment $equipment,
        string $date,
        string $start,
        string $end,
        ?int $ignoreBookingId = null,
    ): bool {
        if ($equipment->status === EquipmentStatus::Maintenance) {
            // Maintenance status only blocks same-day bookings.
            // Future bookings assume the repair will be completed by then.
            if (Carbon::parse($date)->isToday()) {
                return false;
            }
        }

        return ! $this->overlappingBookingsQuery($equipment->id, $date, $start, $end, $ignoreBookingId)->exists();
    }

    /** Every bookable unit free for the slot, optionally filtered by type. */
    public function availableEquipment(string $date, string $start, string $end, ?string $type = null): Collection
    {
        return Equipment::query()
            ->where('status', '!=', EquipmentStatus::Maintenance->value)
            ->when($type, fn ($q) => $q->where('type', $type))
            ->get()
            ->filter(fn (Equipment $e) => $this->isAvailable($e, $date, $start, $end))
            ->values();
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

    private function overlappingBookingsQuery(int $equipmentId, string $date, string $start, string $end, ?int $ignoreBookingId)
    {
        return Booking::query()
            ->where('equipment_id', $equipmentId)
            ->whereDate('booking_date', $date)
            ->where('waitlisted', false)
            ->whereIn('status', config('booking.blocking_statuses'))
            ->when($ignoreBookingId, fn ($q) => $q->where('id', '!=', $ignoreBookingId))
            // Standard half-open overlap test: start < existing.end AND end > existing.start.
            ->where('start_time', '<', $this->normalize($end))
            ->where('end_time', '>', $this->normalize($start));
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
