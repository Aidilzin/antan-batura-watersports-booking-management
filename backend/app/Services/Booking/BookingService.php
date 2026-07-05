<?php

namespace App\Services\Booking;

use App\Enums\BookingStatus;
use App\Models\Booking;
use App\Models\BookingItem;
use App\Models\Equipment;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class BookingService
{
    public function __construct(private readonly AvailabilityService $availability) {}

    /**
     * Create a multi-item booking inside a DB transaction.
     * All items must share the same booking_date.
     *
     * @param array $data {customer_name, customer_email, customer_phone, channel, notes, items[]}
     * @return Booking
     */
    public function create(array $data): Booking
    {
        $items = $data['items'];

        // Validate same-day constraint
        $dates = array_unique(array_column($items, 'booking_date'));
        if (count($dates) > 1) {
            throw ValidationException::withMessages([
                'items' => ['All items in a single booking must share the same booking date.'],
            ]);
        }

        return DB::transaction(function () use ($data, $items) {
            // Re-check capacity for each item inside the transaction (race-condition guard)
            $errors = [];
            $processedItems = []; // Track what we've "used" from capacity in this cart

            foreach ($items as $idx => $item) {
                $type   = $item['equipment_type'];
                $date   = $item['booking_date'];
                $start  = $item['start_time'];
                $end    = $item['end_time'];
                $qty    = (int) ($item['quantity'] ?? 1);

                // Count capacity already consumed by earlier items in this same cart that overlap
                $cartConsumed = 0;
                foreach ($processedItems as $prev) {
                    if ($prev['type'] === $type && $prev['date'] === $date) {
                        $prevStart = Carbon::parse($prev['start']);
                        $prevEnd   = Carbon::parse($prev['end']);
                        $curStart  = Carbon::parse($start);
                        $curEnd    = Carbon::parse($end);
                        if ($curStart->lt($prevEnd) && $curEnd->gt($prevStart)) {
                            $cartConsumed += $prev['qty'];
                        }
                    }
                }

                $available = $this->availability->getAvailableCapacity($type, $date, $start, $end) - $cartConsumed;

                if ($available < $qty) {
                    $errors["items.{$idx}"] = ["Not enough {$type} units available for {$date} {$start}–{$end}. Only {$available} left."];
                }

                $processedItems[] = compact('type', 'date', 'start', 'end', 'qty');
            }

            if (!empty($errors)) {
                throw ValidationException::withMessages($errors)->status(409);
            }

            // Create parent booking
            $booking = Booking::create([
                'booking_reference' => $this->generateReference(),
                'customer_name'     => $data['customer_name'] ?? null,
                'customer_email'    => $data['customer_email'] ?? null,
                'customer_phone'    => $data['customer_phone'] ?? null,
                'channel'           => $data['channel'] ?? 'online',
                'notes'             => $data['notes'] ?? null,
                'status'            => BookingStatus::Confirmed,
                'payment_status'    => 'pending',
                'total_amount'      => 0,
            ]);

            $total = 0;

            foreach ($items as $displayOrder => $item) {
                $type  = $item['equipment_type'];
                $date  = $item['booking_date'];
                $start = $item['start_time'];
                $end   = $item['end_time'];

                if ($type === 'cruise_boat') {
                    $adultCount = (int) ($item['adult_count'] ?? 0);
                    $childCount = (int) ($item['child_count'] ?? 0);
                    $qty = $adultCount + $childCount;
                    $rate = 10.00; // Reference adult rate snapshot
                    $itemAmount = round(($adultCount * 10.00) + ($childCount * 6.00), 2);
                } else {
                    $adultCount = null;
                    $childCount = null;
                    $qty   = (int) ($item['quantity'] ?? 1);

                    // Get representative equipment for rate snapshot
                    $eq = Equipment::where('type', $type)->first();
                    $rate = $eq ? (float) $eq->hourly_rate : 0;

                    $hours = Carbon::parse($start)->floatDiffInHours(Carbon::parse($end));
                    $itemAmount = round($rate * $qty * $hours, 2);
                }

                $total += $itemAmount;

                BookingItem::create([
                    'booking_id'     => $booking->id,
                    'equipment_type' => $type,
                    'quantity'       => $qty,
                    'adult_count'    => $adultCount,
                    'child_count'    => $childCount,
                    'display_order'  => $displayOrder,
                    'booking_date'   => $date,
                    'start_time'     => $start,
                    'end_time'       => $end,
                    'rate_snapshot'  => $rate,
                    'item_status'    => 'confirmed',
                ]);
            }

            $booking->update(['total_amount' => $total]);

            return $booking->fresh(['items']);
        });
    }

    /** Human-friendly, collision-checked reference like "AB-7F3K2Q". */
    public function generateReference(): string
    {
        do {
            $reference = 'AB-'.Str::upper(Str::random(6));
        } while (Booking::where('booking_reference', $reference)->exists());

        return $reference;
    }

    /** Expected rental fee = sum of (rate × qty × hours) across all items. */
    public function totalAmount(Booking $booking): float
    {
        return $booking->items->sum(function (BookingItem $item) {
            if ($item->equipment_type === 'cruise_boat') {
                return round((($item->adult_count ?? 0) * 10.00) + (($item->child_count ?? 0) * 6.00), 2);
            }
            $hours = Carbon::parse($item->start_time)->floatDiffInHours(Carbon::parse($item->end_time));
            return round((float) $item->rate_snapshot * $item->quantity * $hours, 2);
        });
    }

    /**
     * Legacy single-unit base amount (for backwards-compat with HandoverController etc.)
     */
    public function baseAmount(Booking $booking): float
    {
        if ($booking->items->isNotEmpty()) {
            return $this->totalAmount($booking);
        }

        // Fallback to old equipment-based calculation
        if (!$booking->equipment) return 0;
        $hours = Carbon::parse($booking->start_time)->floatDiffInHours(Carbon::parse($booking->end_time));
        return round((float) $booking->equipment->hourly_rate * $hours, 2);
    }
}
