<?php

namespace App\Http\Controllers;

use App\Enums\PaymentMethod;
use App\Enums\PaymentPurpose;
use App\Enums\PaymentStatus;
use App\Http\Requests\StorePaymentRequest;
use App\Http\Resources\PaymentResource;
use App\Models\Booking;
use App\Models\Payment;
use App\Services\Payment\PaymentGatewayService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class PaymentController extends Controller
{
    public function __construct(private readonly PaymentGatewayService $gateway) {}

    /**
     * Start a payment: create it pending, and return the checkout
     * instructions (QR payload / bank details / "mark cash received").
     */
    public function store(StorePaymentRequest $request, Booking $booking): JsonResponse
    {
        $method = PaymentMethod::from($request->string('method')->toString());
        $purpose = $request->enum('purpose', PaymentPurpose::class) ?? PaymentPurpose::Booking;

        // Cancel/fail any prior pending payments for this booking and purpose
        Payment::where('booking_id', $booking->id)
            ->where('purpose', $purpose)
            ->where('status', PaymentStatus::Pending)
            ->update(['status' => PaymentStatus::Failed]);

        $payment = Payment::create([
            'booking_id' => $booking->id,
            'amount' => $request->float('amount'),
            'method' => $method,
            'status' => PaymentStatus::Pending,
            'purpose' => $purpose,
        ]);

        $payment->setRelation('booking', $booking);
        $instructions = $this->gateway->instructionsFor($payment);

        return response()->json([
            'payment' => new PaymentResource($payment),
            'checkout' => $instructions->toArray(),
        ], 201);
    }

    /**
     * Staff action: "Simulate payment received" (QR/bank transfer) or the
     * direct cash-received confirmation. Confirms the payment via the
     * bound PaymentGatewayService — swap that binding for a real gateway later.
     */
    public function confirm(Request $request, Payment $payment): PaymentResource
    {
        if ($payment->status !== PaymentStatus::Pending) {
            throw ValidationException::withMessages([
                'status' => ["Payment is already {$payment->status->value}."],
            ]);
        }

        $payment->load('booking');
        $this->gateway->confirm($payment, $request->user());

        return new PaymentResource($payment->fresh(['recordedBy']));
    }

    /** Customer backed out, wrong amount, etc. — the booking ends there. */
    public function fail(Request $request, Payment $payment): PaymentResource
    {
        if ($payment->status !== PaymentStatus::Pending) {
            throw ValidationException::withMessages([
                'status' => ["Payment is already {$payment->status->value}."],
            ]);
        }

        $payment->load('booking');
        $this->gateway->fail($payment, $request->user());

        return new PaymentResource($payment->fresh(['recordedBy']));
    }

    public function index(Booking $booking)
    {
        return PaymentResource::collection(
            $booking->payments()->with('recordedBy')->latest()->get()
        );
    }
}
