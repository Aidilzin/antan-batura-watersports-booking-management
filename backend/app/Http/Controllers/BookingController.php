<?php

namespace App\Http\Controllers;

use App\Enums\BookingStatus;
use App\Http\Requests\StoreBookingRequest;
use App\Http\Resources\BookingResource;
use App\Models\Booking;
use App\Services\Booking\BookingService;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class BookingController extends Controller
{
    public function __construct(private readonly BookingService $bookings) {}

    /** Customers see only their own bookings; staff/admin see everyone's. */
    public function index(Request $request)
    {
        $user = $request->user();

        $query = Booking::with(['equipment', 'payments', 'usageLog'])
            ->orderByDesc('booking_date')
            ->orderByDesc('start_time');

        if ($user && $user->isStaffLevel()) {
            if ($request->filled('status')) {
                $query->where('status', $request->string('status'));
            }
            if ($request->filled('date')) {
                $query->whereDate('booking_date', $request->string('date'));
            }
        }

        return BookingResource::collection($query->paginate(20));
    }

    public function show(Request $request, Booking $booking)
    {
        $this->authorizeAccess($request, $booking);

        $booking->load(['equipment', 'payments.recordedBy', 'usageLog', 'damageReports.recordedBy']);

        return new BookingResource($booking);
    }

    /** Look up by reference — used at check-in when staff key in the code. */
    public function showByReference(Request $request, string $reference)
    {
        $booking = Booking::where('booking_reference', $reference)
            ->with(['equipment', 'payments', 'usageLog'])
            ->firstOrFail();

        $this->authorizeAccess($request, $booking);

        return new BookingResource($booking);
    }

    public function store(StoreBookingRequest $request)
    {
        $user = auth('sanctum')->user();
        $name = $request->string('guest_name');
        $email = $request->string('guest_email');
        $phone = $request->input('guest_phone');

        if (!$email || !$name) {
            throw ValidationException::withMessages([
                'guest_email' => ['Customer name and email are required to create a booking.'],
            ]);
        }

        $channel = $user?->isStaffLevel() ? 'walk_in' : 'online';

        $booking = $this->bookings->create([
            ...$request->validated(),
            'customer_name' => $name,
            'customer_email' => $email,
            'customer_phone' => $phone,
            'channel' => $channel,
        ]);

        $booking->load(['equipment']);

        return (new BookingResource($booking))
            ->response()
            ->setStatusCode(201);
    }

    public function cancel(Request $request, Booking $booking)
    {
        $this->authorizeAccess($request, $booking);

        if ($booking->status->isTerminal()) {
            throw ValidationException::withMessages([
                'status' => ['This booking is already '.$booking->status->value.'.'],
            ]);
        }

        $booking->update(['status' => BookingStatus::Cancelled]);

        return new BookingResource($booking->fresh(['equipment']));
    }

    public function cancelByReference(string $reference)
    {
        $booking = Booking::where('booking_reference', $reference)->firstOrFail();

        if ($booking->status->isTerminal()) {
            throw ValidationException::withMessages([
                'status' => ['This booking is already '.$booking->status->value.'.'],
            ]);
        }

        $booking->update(['status' => BookingStatus::Cancelled]);

        return new BookingResource($booking->fresh(['equipment']));
    }

    private function authorizeAccess(Request $request, Booking $booking): void
    {
        $user = $request->user();

        if ($user && !$user->isStaffLevel()) {
            abort(403, 'You do not have access to this booking.');
        }
    }
}
