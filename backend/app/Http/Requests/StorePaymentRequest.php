<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StorePaymentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'method' => ['required', 'in:qr,bank_transfer,cash'],
            'purpose' => ['nullable', 'in:booking,overtime,damage'],
            'amount' => ['required', 'numeric', 'min:0.01'],
        ];
    }
}
