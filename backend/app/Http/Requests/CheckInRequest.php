<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CheckInRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // gated by role:staff at the route level
    }

    public function rules(): array
    {
        return [
            'safety_briefing_given' => ['required', 'boolean'],
            'safety_gear_issued' => ['required', 'boolean'],
            'unit_ids' => ['nullable', 'array'],
            'unit_ids.*' => ['integer', 'exists:equipment,id'],
        ];
    }
}
