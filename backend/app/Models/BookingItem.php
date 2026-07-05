<?php

namespace App\Models;

use App\Enums\BookingStatus;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

#[Fillable([
    'booking_id', 'equipment_type', 'quantity', 'adult_count', 'child_count', 'display_order',
    'booking_date', 'start_time', 'end_time', 'rate_snapshot',
    'item_status', 'safety_briefing_given', 'safety_gear_issued',
    'checked_in_at', 'checked_in_by', 'handed_over_at', 'completed_at',
    'notes', 'cancellation_type',
])]
class BookingItem extends Model
{
    use HasFactory;

    protected function casts(): array
    {
        return [
            'booking_date' => 'date',
            'quantity' => 'integer',
            'adult_count' => 'integer',
            'child_count' => 'integer',
            'display_order' => 'integer',
            'rate_snapshot' => 'decimal:2',
            'safety_briefing_given' => 'boolean',
            'safety_gear_issued' => 'boolean',
            'checked_in_at' => 'datetime',
            'handed_over_at' => 'datetime',
            'completed_at' => 'datetime',
        ];
    }

    public function booking(): BelongsTo
    {
        return $this->belongsTo(Booking::class);
    }

    public function itemUnits(): HasMany
    {
        return $this->hasMany(BookingItemUnit::class);
    }

    public function checkedInBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'checked_in_by');
    }

    public function usageLog(): HasOne
    {
        return $this->hasOne(UsageLog::class);
    }

    public function damageReports(): HasMany
    {
        return $this->hasMany(DamageReport::class);
    }
}
