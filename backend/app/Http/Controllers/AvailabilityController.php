<?php

namespace App\Http\Controllers;

use App\Http\Requests\CheckAvailabilityRequest;
use App\Http\Resources\EquipmentResource;
use App\Models\Equipment;
use App\Enums\EquipmentStatus;
use App\Services\Booking\AvailabilityService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class AvailabilityController extends Controller
{
    public function __construct(private readonly AvailabilityService $availability) {}

    /**
     * Check a slot. If a specific equipment_id is given and it's taken,
     * suggested alternatives (other units, other free slots) are attached
     * so the frontend can offer "pick another" or "join waitlist" inline.
     */
    public function check(CheckAvailabilityRequest $request): JsonResponse
    {
        $date = $request->string('booking_date');
        $start = $request->string('start_time');
        $end = $request->string('end_time');
        $quantity = $request->integer('quantity', 1);
        $cart = $request->input('cart', []);

        if ($request->filled('equipment_id')) {
            $equipment = Equipment::findOrFail($request->integer('equipment_id'));
            $availableCapacity = $this->availability->getAvailableCapacity($equipment->type->value, $date, $start, $end);
            
            foreach ($cart as $cartItem) {
                if (($cartItem['type'] ?? '') === $equipment->type->value) {
                    $cartStart = $cartItem['start_time'] ?? '';
                    $cartEnd = $cartItem['end_time'] ?? '';
                    $cartQty = (int) ($cartItem['quantity'] ?? 1);
                    if (Carbon::parse($cartStart)->lt(Carbon::parse($end)) && Carbon::parse($cartEnd)->gt(Carbon::parse($start))) {
                        $availableCapacity -= $cartQty;
                    }
                }
            }

            $available = $availableCapacity >= $quantity && $equipment->status !== EquipmentStatus::Maintenance;

            $payload = ['available' => $available];

            if (! $available) {
                $alternatives = $this->availability->alternativesFor($equipment, $date, $start, $end);
                $payload['alternatives'] = [
                    'same_type_equipment' => EquipmentResource::collection($alternatives['same_type_equipment']),
                    'free_slots' => $alternatives['free_slots'],
                ];
            }

            return response()->json($payload);
        }

        $type = $request->string('type');
        if ($type) {
            $availableCapacity = $this->availability->getAvailableCapacity($type, $date, $start, $end);
            
            foreach ($cart as $cartItem) {
                if (($cartItem['type'] ?? '') === $type) {
                    $cartStart = $cartItem['start_time'] ?? '';
                    $cartEnd = $cartItem['end_time'] ?? '';
                    $cartQty = (int) ($cartItem['quantity'] ?? 1);
                    if (Carbon::parse($cartStart)->lt(Carbon::parse($end)) && Carbon::parse($cartEnd)->gt(Carbon::parse($start))) {
                        $availableCapacity -= $cartQty;
                    }
                }
            }

            $available = $availableCapacity >= $quantity;

            $payload = [
                'available' => $available,
                'available_capacity' => $availableCapacity,
            ];

            if (! $available) {
                $representative = Equipment::where('type', $type)->first();
                if ($representative) {
                    $alternatives = $this->availability->alternativesFor($representative, $date, $start, $end);
                    $payload['alternatives'] = [
                        'same_type_equipment' => [],
                        'free_slots' => $alternatives['free_slots'],
                    ];
                }
            }

            return response()->json($payload);
        }

        return response()->json(['available' => false]);
    }

    /** Return all hourly slots with their visual occupancy status. */
    public function calendar(Request $request): JsonResponse
    {
        $request->validate([
            'booking_date' => ['required', 'date', 'after_or_equal:today'],
            'type' => ['required', 'string'],
        ]);

        $date = $request->string('booking_date');
        $type = $request->string('type');

        $open = Carbon::parse($date.' '.config('booking.open_time'));
        $close = Carbon::parse($date.' '.config('booking.close_time'));

        $totalUnits = Equipment::where('type', $type)
            ->where('status', '!=', EquipmentStatus::Maintenance->value)
            ->count();

        $slots = [];
        $cursor = $open->copy();

        while ($cursor->copy()->addHour()->lte($close)) {
            $start = $cursor->format('H:i');
            $end = $cursor->copy()->addHour()->format('H:i');

            $availableCount = $this->availability->getAvailableCapacity($type, $date, $start, $end);

            $slots[] = [
                'start_time' => $start,
                'end_time' => $end,
                'total_units' => $totalUnits,
                'available_units' => $availableCount,
                'status' => $availableCount === 0 ? 'full' : ($availableCount === $totalUnits ? 'free' : 'limited'),
            ];

            $cursor->addHour();
        }

        return response()->json($slots);
    }
}
