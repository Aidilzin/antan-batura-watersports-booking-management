<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\BookingItemUnit */
class BookingItemUnitResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'               => $this->id,
            'booking_item_id'  => $this->booking_item_id,
            'equipment_unit_id'=> $this->equipment_unit_id,
            'assigned_at'      => $this->assigned_at,
            'equipment_unit'   => new EquipmentResource($this->whenLoaded('equipmentUnit')),
        ];
    }
}
