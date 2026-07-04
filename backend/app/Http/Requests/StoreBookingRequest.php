<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreBookingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // any authenticated user; staff may book on behalf of a customer
    }

    public function rules(): array
    {
        return [
            'equipment_id' => ['required', 'integer', 'exists:equipment,id'],
            'booking_date' => ['required', 'date', 'after_or_equal:today'],
            'start_time' => ['required', 'date_format:H:i'],
            'end_time' => ['required', 'date_format:H:i', 'after:start_time'],
            'channel' => ['nullable', 'in:online,walk_in'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'waitlist' => ['nullable', 'boolean'],

            'guest_name' => ['nullable', 'string', 'max:255'],
            'guest_email' => ['nullable', 'email', 'max:255'],
            'guest_phone' => ['nullable', 'string', 'max:50'],

        ];
    }
}
