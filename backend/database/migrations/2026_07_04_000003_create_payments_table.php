<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('booking_id')->constrained('bookings')->cascadeOnDelete();

            $table->decimal('amount', 8, 2);
            $table->string('method');                       // qr | bank_transfer | cash
            $table->string('status')->default('pending');   // pending | confirmed | failed
            $table->string('purpose')->default('booking');  // booking | overtime | damage

            // Set by the MockPaymentGateway once confirmed, e.g. "MOCK-AB-7F3K2Q-1A2B".
            $table->string('mock_transaction_id')->nullable();

            $table->foreignId('recorded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('recorded_at')->nullable();
            $table->timestamps();

            $table->index(['booking_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
