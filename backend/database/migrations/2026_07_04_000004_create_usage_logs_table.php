<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('usage_logs', function (Blueprint $table) {
            $table->id();
            // One usage log per booking (the actual on-water session).
            $table->foreignId('booking_id')->unique()->constrained('bookings')->cascadeOnDelete();

            $table->timestamp('actual_start_time')->nullable(); // clock started at handover
            $table->timestamp('actual_end_time')->nullable();   // set on return
            $table->unsignedInteger('exceeded_minutes')->default(0);
            $table->decimal('extra_charge_amount', 8, 2)->default(0);

            // Condition noted at return (module 5). Damage details live in damage_reports.
            $table->string('condition_on_return')->nullable(); // good | damaged
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('usage_logs');
    }
};
