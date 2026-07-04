<?php

namespace App\Services\Booking;

use App\Enums\BookingStatus;
use App\Models\Booking;
use App\Models\Equipment;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class BookingService
{
    public function __construct(private readonly AvailabilityService $availability) {}

    /**
     * Reserve a slot. Throws a validation error (with alternatives attached)
     * if the slot is taken and the caller didn't opt to waitlist.
     *
     * @param  array{equipment_id:int,customer_name:string,customer_email:string,customer_phone?:string,booking_date:string,start_time:string,end_time:string,channel?:string,notes?:string,waitlist?:bool}  $data
     */
    public function create(array $data): Booking
    {
        $equipment = Equipment::findOrFail($data['equipment_id']);
        $waitlist = (bool) ($data['waitlist'] ?? false);

        $available = $this->availability->isAvailable(
            $equipment,
            $data['booking_date'],
            $data['start_time'],
            $data['end_time'],
        );

        if (! $available && ! $waitlist) {
            throw ValidationException::withMessages([
                'slot' => ['That slot is no longer available. Pick an alternative or join the waitlist.'],
            ])->status(409);
        }

        return Booking::create([
            'booking_reference' => $this->generateReference(),
            'customer_name' => $data['customer_name'] ?? null,
            'customer_email' => $data['customer_email'] ?? null,
            'customer_phone' => $data['customer_phone'] ?? null,
            'equipment_id' => $equipment->id,
            'booking_date' => $data['booking_date'],
            'start_time' => $data['start_time'],
            'end_time' => $data['end_time'],
            // Available + reserved => confirmed; waitlisted => pending & flagged.
            'status' => $available ? BookingStatus::Confirmed : BookingStatus::Pending,
            'waitlisted' => ! $available,
            'channel' => $data['channel'] ?? 'online',
            'notes' => $data['notes'] ?? null,
        ]);
    }

    /** Human-friendly, collision-checked reference like "AB-7F3K2Q". */
    public function generateReference(): string
    {
        do {
            $reference = 'AB-'.Str::upper(Str::random(6));
        } while (Booking::where('booking_reference', $reference)->exists());

        return $reference;
    }

    /** Expected rental fee = hourly_rate * booked hours. */
    public function baseAmount(Booking $booking): float
    {
        $hours = Carbon::parse($booking->start_time)->floatDiffInHours(Carbon::parse($booking->end_time));

        return round((float) $booking->equipment->hourly_rate * $hours, 2);
    }
}
