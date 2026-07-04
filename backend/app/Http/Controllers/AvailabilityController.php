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

        if ($request->filled('equipment_id')) {
            $equipment = Equipment::findOrFail($request->integer('equipment_id'));
            $available = $this->availability->isAvailable($equipment, $date, $start, $end);

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

        // No specific unit requested — just list what's free for the slot.
        $available = $this->availability->availableEquipment($date, $start, $end, $request->input('type'));

        $payload = [
            'available' => $available->isNotEmpty(),
            'equipment' => EquipmentResource::collection($available),
        ];

        if ($available->isEmpty() && $request->filled('type')) {
            // Find the first equipment of this type to scan for alternative slots
            $representative = Equipment::where('type', $request->string('type'))->first();
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

            $availableCount = $this->availability->availableEquipment($date, $start, $end, $type)->count();

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
