<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ReturnEquipmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // gated by role:staff at the route level
    }

    public function rules(): array
    {
        return [
            'condition_on_return' => ['required', 'in:good,damaged'],
            'damage_description' => ['required_if:condition_on_return,damaged', 'nullable', 'string', 'max:2000'],
            'deposit_charged' => ['nullable', 'numeric', 'min:0'],
        ];
    }
}
