<?php

namespace App\Http\Controllers;

use App\Enums\BookingStatus;
use App\Http\Requests\CheckInRequest;
use App\Http\Resources\BookingResource;
use App\Models\Booking;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;

class CheckInController extends Controller
{
    /**
     * Staff verify the booking reference, confirm the safety briefing was
     * given and gear issued, and move the booking into checked_in.
     */
    public function checkIn(CheckInRequest $request, Booking $booking)
    {
        if (! in_array($booking->status, [BookingStatus::Pending, BookingStatus::Confirmed], true)) {
            throw ValidationException::withMessages([
                'status' => ["Booking is {$booking->status->value} and cannot be checked in."],
            ]);
        }

        $booking->update([
            'status' => BookingStatus::CheckedIn,
            'safety_briefing_given' => $request->boolean('safety_briefing_given'),
            'safety_gear_issued' => $request->boolean('safety_gear_issued'),
            'checked_in_at' => Carbon::now(),
            'checked_in_by' => $request->user()->id,
        ]);

        return new BookingResource($booking->fresh(['customer', 'equipment', 'payments']));
    }
}
