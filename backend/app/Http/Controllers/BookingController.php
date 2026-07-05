<?php

namespace App\Http\Controllers;

use App\Enums\BookingStatus;
use App\Http\Requests\StoreBookingRequest;
use App\Http\Resources\BookingResource;
use App\Models\Booking;
use App\Models\BookingItem;
use App\Services\Booking\BookingService;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;

class BookingController extends Controller
{
    public function __construct(private readonly BookingService $bookings) {}

    /** Staff/admin see everyone's; unauthenticated guests can't list. */
    public function index(Request $request)
    {
        $user = $request->user();

        $query = Booking::with(['items', 'payments'])
            ->orderByDesc('created_at');

        if ($user && $user->isStaffLevel()) {
            if ($request->filled('status')) {
                $query->where('status', $request->string('status'));
            }
            if ($request->filled('date')) {
                $query->whereHas('items', fn ($q) => $q->whereDate('booking_date', $request->string('date')));
            }
        }

        return BookingResource::collection($query->paginate(20));
    }

    public function show(Request $request, Booking $booking)
    {
        $this->authorizeAccess($request, $booking);
        $booking->load(['items.itemUnits.equipmentUnit', 'payments.recordedBy', 'items.usageLog', 'items.damageReports.recordedBy']);
        return new BookingResource($booking);
    }

    public function showByReference(Request $request, string $reference)
    {
        $booking = Booking::where('booking_reference', $reference)
            ->with(['items.itemUnits.equipmentUnit', 'payments'])
            ->firstOrFail();

        $this->authorizeAccess($request, $booking);
        return new BookingResource($booking);
    }

    public function store(StoreBookingRequest $request)
    {
        $user = auth('sanctum')->user();

        $guestName  = $request->string('guest_name');
        $guestEmail = $request->string('guest_email');
        $guestPhone = $request->input('guest_phone');

        if (!$guestEmail || !$guestName) {
            throw ValidationException::withMessages([
                'guest_email' => ['Customer name and email are required to create a booking.'],
            ]);
        }

        $channel = $user?->isStaffLevel() ? 'walk_in' : 'online';

        $booking = $this->bookings->create([
            'customer_name'  => $guestName,
            'customer_email' => $guestEmail,
            'customer_phone' => $guestPhone,
            'channel'        => $channel,
            'notes'          => $request->input('notes'),
            'items'          => $request->input('items'),
        ]);

        $booking->load(['items']);

        return (new BookingResource($booking))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Customer self-service cancel — subject to cutoff window.
     */
    public function cancel(Request $request, Booking $booking)
    {
        $this->authorizeAccess($request, $booking);
        $this->doCancelBooking($booking, 'self_service');
        return new BookingResource($booking->fresh(['items']));
    }

    public function cancelByReference(Request $request, string $reference)
    {
        $booking = Booking::where('booking_reference', $reference)->firstOrFail();
        $this->doCancelBooking($booking, 'self_service');
        return new BookingResource($booking->fresh(['items']));
    }

    /**
     * Staff override cancel — no cutoff restriction.
     */
    public function staffCancel(Request $request, Booking $booking)
    {
        if (!$request->user()?->isStaffLevel()) {
            abort(403, 'Staff access required.');
        }

        if ($booking->status?->isTerminal()) {
            throw ValidationException::withMessages([
                'status' => ['This booking is already '.$booking->status->value.'.'],
            ]);
        }

        $booking->update([
            'status'            => BookingStatus::Cancelled,
            'cancellation_type' => 'staff_override',
        ]);

        $booking->items()->update(['item_status' => 'cancelled', 'cancellation_type' => 'staff_override']);

        return new BookingResource($booking->fresh(['items']));
    }

    /**
     * Cancel a single BookingItem (e.g., keep cruise boat, drop the kayaks).
     */
    public function cancelItem(Request $request, Booking $booking, BookingItem $bookingItem)
    {
        if ($bookingItem->booking_id !== $booking->id) {
            abort(404);
        }

        $isStaff = $request->user()?->isStaffLevel();
        $cancellationType = $isStaff ? 'staff_override' : 'self_service';

        if (!$isStaff) {
            $this->assertCutoff($bookingItem);
        }

        if (in_array($bookingItem->item_status, ['cancelled', 'completed'], true)) {
            throw ValidationException::withMessages([
                'item_status' => ['This item is already '.$bookingItem->item_status.'.'],
            ]);
        }

        $bookingItem->update([
            'item_status'       => 'cancelled',
            'cancellation_type' => $cancellationType,
        ]);

        // If all items are cancelled, cancel the parent booking
        $allCancelled = $booking->items()->where('item_status', '!=', 'cancelled')->doesntExist();
        if ($allCancelled) {
            $booking->update([
                'status'            => BookingStatus::Cancelled,
                'cancellation_type' => $cancellationType,
            ]);
        }

        return new BookingResource($booking->fresh(['items']));
    }

    private function doCancelBooking(Booking $booking, string $type): void
    {
        if ($booking->status?->isTerminal()) {
            throw ValidationException::withMessages([
                'status' => ['This booking is already '.$booking->status->value.'.'],
            ]);
        }

        if ($type === 'self_service') {
            // Check cutoff window for first non-cancelled item
            $firstItem = $booking->items()
                ->where('item_status', '!=', 'cancelled')
                ->orderBy('start_time')
                ->first();

            if ($firstItem) {
                $this->assertCutoff($firstItem);
            }
        }

        $booking->update([
            'status'            => BookingStatus::Cancelled,
            'cancellation_type' => $type,
        ]);

        $booking->items()->where('item_status', '!=', 'cancelled')->update([
            'item_status'       => 'cancelled',
            'cancellation_type' => $type,
        ]);
    }

    private function assertCutoff(BookingItem $item): void
    {
        $cutoffHours = (int) config('booking.cancellation_cutoff_hours', 2);
        $startDatetime = Carbon::parse($item->booking_date->format('Y-m-d').' '.$item->start_time);
        $cutoffAt = $startDatetime->subHours($cutoffHours);

        if (Carbon::now()->gte($cutoffAt)) {
            throw ValidationException::withMessages([
                'cutoff' => [
                    "Self-service cancellation is no longer available within {$cutoffHours} hours of the session start. Please contact staff directly."
                ],
            ])->status(422);
        }
    }

    private function authorizeAccess(Request $request, Booking $booking): void
    {
        $user = $request->user();

        if ($user && !$user->isStaffLevel()) {
            abort(403, 'You do not have access to this booking.');
        }
    }
}
