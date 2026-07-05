<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\BookingItem */
class BookingItemResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'               => $this->id,
            'booking_id'       => $this->booking_id,
            'equipment_type'   => $this->equipment_type,
            'quantity'         => $this->quantity,
            'adult_count'      => $this->adult_count !== null ? (int)$this->adult_count : null,
            'child_count'      => $this->child_count !== null ? (int)$this->child_count : null,
            'display_order'    => $this->display_order,
            'booking_date'     => $this->booking_date?->format('Y-m-d'),
            'start_time'       => substr((string) $this->start_time, 0, 5),
            'end_time'         => substr((string) $this->end_time, 0, 5),
            'rate_snapshot'    => (float) $this->rate_snapshot,
            'item_status'      => $this->item_status,
            'cancellation_type'=> $this->cancellation_type,

            'safety_briefing_given' => $this->safety_briefing_given,
            'safety_gear_issued'    => $this->safety_gear_issued,
            'checked_in_at'         => $this->checked_in_at,
            'handed_over_at'        => $this->handed_over_at,
            'completed_at'          => $this->completed_at,
            'notes'                 => $this->notes,

            'assigned_units' => BookingItemUnitResource::collection($this->whenLoaded('itemUnits')),
            'usage_log'      => new UsageLogResource($this->whenLoaded('usageLog')),
            'damage_reports' => DamageReportResource::collection($this->whenLoaded('damageReports')),
        ];
    }
}
