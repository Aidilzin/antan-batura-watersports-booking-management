<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreEquipmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // gated by role:admin at the route level
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'type' => ['required', 'in:cruise_boat,kayak_single,kayak_double,canoe,paddle_boat,paddle_boat_family'],
            'status' => ['nullable', 'in:available,booked,maintenance'],
            'hourly_rate' => ['required', 'numeric', 'min:0'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
