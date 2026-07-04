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
            'id' => $this->id,
            'booking_reference' => $this->booking_reference,
            'status' => $this->status->value,
            'channel' => $this->channel,
            'waitlisted' => $this->waitlisted,

            'booking_date' => $this->booking_date?->toDateString(),
            'start_time' => substr((string) $this->start_time, 0, 5),
            'end_time' => substr((string) $this->end_time, 0, 5),

            'safety_briefing_given' => $this->safety_briefing_given,
            'safety_gear_issued' => $this->safety_gear_issued,
            'checked_in_at' => $this->checked_in_at,
            'handed_over_at' => $this->handed_over_at,
            'completed_at' => $this->completed_at,
            'notes' => $this->notes,

            'customer' => new UserResource($this->whenLoaded('customer')),
            'equipment' => new EquipmentResource($this->whenLoaded('equipment')),
            'payments' => PaymentResource::collection($this->whenLoaded('payments')),
            'usage_log' => new UsageLogResource($this->whenLoaded('usageLog')),
            'damage_reports' => DamageReportResource::collection($this->whenLoaded('damageReports')),

            'created_at' => $this->created_at,
        ];
    }
}
