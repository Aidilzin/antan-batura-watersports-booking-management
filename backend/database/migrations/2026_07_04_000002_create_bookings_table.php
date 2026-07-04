<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bookings', function (Blueprint $table) {
            $table->id();
            $table->string('booking_reference')->unique();   // e.g. "AB-7F3K2Q"

            $table->foreignId('customer_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('equipment_id')->constrained('equipment')->restrictOnDelete();

            $table->date('booking_date');
            $table->time('start_time');
            $table->time('end_time');

            // pending | confirmed | checked_in | in_use | completed | cancelled
            $table->string('status')->default('pending')->index();

            // 'online' (customer self-serve) or 'walk_in' (staff-entered).
            $table->string('channel')->default('online');

            // Waitlist path: a requested-but-unavailable slot the customer opted to
            // wait on; re-checked when a slot frees up. Kept on the booking for simplicity.
            $table->boolean('waitlisted')->default(false)->index();

            // Check-in & handover (module 2).
            $table->boolean('safety_briefing_given')->default(false);
            $table->boolean('safety_gear_issued')->default(false);
            $table->timestamp('checked_in_at')->nullable();
            $table->foreignId('checked_in_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('handed_over_at')->nullable();
            $table->timestamp('completed_at')->nullable();

            $table->text('notes')->nullable();
            $table->timestamps();

            // Availability lookups filter by equipment + date heavily.
            $table->index(['equipment_id', 'booking_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bookings');
    }
};
