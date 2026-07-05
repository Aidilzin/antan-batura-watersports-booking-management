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
            // Guest contact info
            'guest_name'  => ['nullable', 'string', 'max:255'],
            'guest_email' => ['nullable', 'email', 'max:255'],
            'guest_phone' => ['nullable', 'string', 'max:50'],
            'channel'     => ['nullable', 'in:online,walk_in'],
            'notes'       => ['nullable', 'string', 'max:1000'],

            // Multi-item cart
            'items'                     => ['required', 'array', 'min:1', 'max:5'],
            'items.*.equipment_type'    => ['required', 'string'],
            'items.*.quantity'          => ['nullable', 'integer', 'min:0', 'max:20'],
            'items.*.adult_count'       => ['nullable', 'integer', 'min:0', 'max:20'],
            'items.*.child_count'       => ['nullable', 'integer', 'min:0', 'max:20'],
            'items.*.booking_date'      => ['required', 'date', 'after_or_equal:today'],
            'items.*.start_time'        => ['required', 'date_format:H:i'],
            'items.*.end_time'          => ['required', 'date_format:H:i', 'after:items.*.start_time'],
        ];
    }
}
