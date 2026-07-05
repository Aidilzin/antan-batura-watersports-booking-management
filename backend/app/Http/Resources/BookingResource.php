<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\Booking */
class BookingResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                => $this->id,
            'booking_reference' => $this->booking_reference,
            'status'            => $this->status?->value,
            'channel'           => $this->channel,
            'waitlisted'        => $this->waitlisted,
            'total_amount'      => (float) $this->total_amount,
            'payment_status'    => $this->payment_status,
            'cancellation_type' => $this->cancellation_type,

            // Legacy per-booking date/time (still populated for old bookings)
            'booking_date' => $this->booking_date?->format('Y-m-d'),
            'start_time'   => $this->start_time ? substr((string) $this->start_time, 0, 5) : null,
            'end_time'     => $this->end_time ? substr((string) $this->end_time, 0, 5) : null,

            // Legacy operational fields (still populated for old bookings)
            'safety_briefing_given' => $this->safety_briefing_given,
            'safety_gear_issued'    => $this->safety_gear_issued,
            'checked_in_at'         => $this->checked_in_at,
            'handed_over_at'        => $this->handed_over_at,
            'completed_at'          => $this->completed_at,
            'notes'                 => $this->notes,

            'customer' => [
                'name'  => $this->customer_name,
                'email' => $this->customer_email,
                'phone' => $this->customer_phone,
            ],

            'items'          => BookingItemResource::collection($this->whenLoaded('items')),
            'equipment'      => new EquipmentResource($this->whenLoaded('equipment')),
            'payments'       => PaymentResource::collection($this->whenLoaded('payments')),
            'usage_log'      => new UsageLogResource($this->whenLoaded('usageLog')),
            'damage_reports' => DamageReportResource::collection($this->whenLoaded('damageReports')),

            'created_at' => $this->created_at,
        ];
    }
}
