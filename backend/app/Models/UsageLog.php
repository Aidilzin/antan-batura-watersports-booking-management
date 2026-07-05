<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'booking_id', 'booking_item_id', 'actual_start_time', 'actual_end_time',
    'exceeded_minutes', 'extra_charge_amount', 'condition_on_return',
])]
class UsageLog extends Model
{
    use HasFactory;

    protected function casts(): array
    {
        return [
            'actual_start_time' => 'datetime',
            'actual_end_time' => 'datetime',
            'exceeded_minutes' => 'integer',
            'extra_charge_amount' => 'decimal:2',
        ];
    }

    public function booking(): BelongsTo
    {
        return $this->belongsTo(Booking::class);
    }

    public function bookingItem(): BelongsTo
    {
        return $this->belongsTo(BookingItem::class);
    }
}
