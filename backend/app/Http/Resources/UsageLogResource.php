<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\UsageLog */
class UsageLogResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'booking_id' => $this->booking_id,
            'actual_start_time' => $this->actual_start_time,
            'actual_end_time' => $this->actual_end_time,
            'exceeded_minutes' => $this->exceeded_minutes,
            'extra_charge_amount' => $this->extra_charge_amount,
            'condition_on_return' => $this->condition_on_return,
        ];
    }
}
