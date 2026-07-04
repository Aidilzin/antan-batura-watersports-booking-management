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

        $query = Booking::with(['customer', 'equipment', 'payments', 'usageLog'])
            ->orderByDesc('booking_date')
            ->orderByDesc('start_time');

        if (! $user->isStaffLevel()) {
            $query->where('customer_id', $user->id);
        } else {
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

        $booking->load(['customer', 'equipment', 'payments.recordedBy', 'usageLog', 'damageReports.recordedBy']);

        return new BookingResource($booking);
    }

    /** Look up by reference — used at check-in when staff key in the code. */
    public function showByReference(Request $request, string $reference)
    {
        $booking = Booking::where('booking_reference', $reference)
            ->with(['customer', 'equipment', 'payments', 'usageLog'])
            ->firstOrFail();

        $this->authorizeAccess($request, $booking);

        return new BookingResource($booking);
    }

    public function store(StoreBookingRequest $request)
    {
        $user = auth('sanctum')->user();
        if ($user) {
            $customerId = $user->isStaffLevel()
                ? ($request->integer('customer_id') ?: $user->id)
                : $user->id;
            $channel = $request->input('channel', $user->isStaffLevel() ? 'walk_in' : 'online');
        } else {
            // Guest checkout: find or create a user by guest_email
            $email = $request->string('guest_email');
            $name = $request->string('guest_name');
            $phone = $request->input('guest_phone');

            if (!$email || !$name) {
                throw ValidationException::withMessages([
                    'guest_email' => ['Contact name and email are required for guest bookings.'],
                ]);
            }

            // Find existing user or create a guest profile
            $guestUser = \App\Models\User::firstOrCreate(
                ['email' => $email],
                [
                    'name' => $name,
                    'phone' => $phone,
                    'role' => \App\Enums\UserRole::Customer,
                    'password' => \Illuminate\Support\Facades\Hash::make(\Illuminate\Support\Str::random(16)),
                ]
            );

            // Update phone if missing
            if ($phone && !$guestUser->phone) {
                $guestUser->update(['phone' => $phone]);
            }

            $customerId = $guestUser->id;
            $channel = 'online';
        }

        $booking = $this->bookings->create([
            ...$request->validated(),
            'customer_id' => $customerId,
            'channel' => $channel,
        ]);

        $booking->load(['customer', 'equipment']);

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

        return new BookingResource($booking->fresh(['customer', 'equipment']));
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

        return new BookingResource($booking->fresh(['customer', 'equipment']));
    }

    private function authorizeAccess(Request $request, Booking $booking): void
    {
        $user = $request->user();

        if (! $user->isStaffLevel() && $booking->customer_id !== $user->id) {
            abort(403, 'You do not have access to this booking.');
        }
    }
}
