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
    'booking_reference', 'customer_id', 'equipment_id',
    'booking_date', 'start_time', 'end_time',
    'status', 'channel', 'waitlisted',
    'safety_briefing_given', 'safety_gear_issued',
    'checked_in_at', 'checked_in_by', 'handed_over_at', 'completed_at',
    'notes',
])]
class Booking extends Model
{
    use HasFactory;

    protected function casts(): array
    {
        return [
            'booking_date' => 'date',
            'status' => BookingStatus::class,
            'waitlisted' => 'boolean',
            'safety_briefing_given' => 'boolean',
            'safety_gear_issued' => 'boolean',
            'checked_in_at' => 'datetime',
            'handed_over_at' => 'datetime',
            'completed_at' => 'datetime',
        ];
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'customer_id');
    }

    public function equipment(): BelongsTo
    {
        return $this->belongsTo(Equipment::class);
    }

    public function checkedInBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'checked_in_by');
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
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
