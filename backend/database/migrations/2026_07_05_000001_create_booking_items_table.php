<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Create booking_items table
        Schema::create('booking_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('booking_id')->constrained('bookings')->cascadeOnDelete();
            $table->string('equipment_type')->index();
            $table->integer('quantity')->default(1);
            $table->integer('display_order')->default(0);
            $table->date('booking_date');
            $table->time('start_time');
            $table->time('end_time');
            $table->decimal('rate_snapshot', 8, 2);
            $table->string('item_status')->default('pending')->index();
            
            // Operational columns moved from bookings
            $table->boolean('safety_briefing_given')->default(false);
            $table->boolean('safety_gear_issued')->default(false);
            $table->timestamp('checked_in_at')->nullable();
            $table->foreignId('checked_in_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('handed_over_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->text('notes')->nullable();
            $table->string('cancellation_type')->nullable(); // self_service | staff_override | no_show
            
            $table->timestamps();
        });

        // 2. Create booking_item_units table
        Schema::create('booking_item_units', function (Blueprint $table) {
            $table->id();
            $table->foreignId('booking_item_id')->constrained('booking_items')->cascadeOnDelete();
            $table->foreignId('equipment_unit_id')->constrained('equipment')->restrictOnDelete();
            $table->timestamp('assigned_at')->nullable();
            $table->timestamps();
        });

        // 3. Add booking_item_id to usage_logs and damage_reports
        Schema::table('usage_logs', function (Blueprint $table) {
            $table->foreignId('booking_item_id')->nullable()->constrained('booking_items')->cascadeOnDelete();
            $table->foreignId('booking_id')->nullable()->change();
        });

        Schema::table('damage_reports', function (Blueprint $table) {
            $table->foreignId('booking_item_id')->nullable()->constrained('booking_items')->cascadeOnDelete();
            $table->foreignId('booking_id')->nullable()->change();
        });

        // 4. Modify bookings table
        Schema::table('bookings', function (Blueprint $table) {
            $table->decimal('total_amount', 8, 2)->default(0.00);
            $table->string('payment_status')->default('pending'); // pending | confirmed | failed
            $table->string('mock_transaction_id')->nullable();
            $table->string('cancellation_type')->nullable(); // self_service | staff_override | no_show
            
            // Make original columns nullable for backwards compatibility / backfill
            $table->foreignId('equipment_id')->nullable()->change();
            $table->date('booking_date')->nullable()->change();
            $table->time('start_time')->nullable()->change();
            $table->time('end_time')->nullable()->change();
            $table->string('status')->nullable()->change();
        });

        // 5. Backfill existing bookings
        $bookings = DB::table('bookings')->get();
        foreach ($bookings as $booking) {
            if (!$booking->equipment_id) {
                continue;
            }

            // Get equipment type and rate
            $eq = DB::table('equipment')->where('id', $booking->equipment_id)->first();
            if (!$eq) {
                continue;
            }

            // Calculate base amount
            $sh = Carbon::parse($booking->start_time);
            $eh = Carbon::parse($booking->end_time);
            $hours = $sh->floatDiffInHours($eh);
            $amount = round((float)$eq->hourly_rate * $hours, 2);

            // Get payment status
            $payment = DB::table('payments')
                ->where('booking_id', $booking->id)
                ->where('status', 'confirmed')
                ->first();
            $paymentStatus = $payment ? 'confirmed' : ($booking->status === 'completed' ? 'confirmed' : 'pending');
            $mockTxId = $payment ? $payment->mock_transaction_id : null;

            // Update parent booking
            DB::table('bookings')->where('id', $booking->id)->update([
                'total_amount' => $amount,
                'payment_status' => $paymentStatus,
                'mock_transaction_id' => $mockTxId,
            ]);

            // Create booking item
            $itemId = DB::table('booking_items')->insertGetId([
                'booking_id' => $booking->id,
                'equipment_type' => $eq->type,
                'quantity' => 1,
                'display_order' => 0,
                'booking_date' => $booking->booking_date,
                'start_time' => $booking->start_time,
                'end_time' => $booking->end_time,
                'rate_snapshot' => $eq->hourly_rate,
                'item_status' => $booking->status ?? 'pending',
                'safety_briefing_given' => $booking->safety_briefing_given ?? false,
                'safety_gear_issued' => $booking->safety_gear_issued ?? false,
                'checked_in_at' => $booking->checked_in_at,
                'checked_in_by' => $booking->checked_in_by,
                'handed_over_at' => $booking->handed_over_at,
                'completed_at' => $booking->completed_at,
                'notes' => $booking->notes,
                'created_at' => $booking->created_at,
                'updated_at' => $booking->updated_at,
            ]);

            // Create booking item unit (since check_in has already happened or is completed)
            if (in_array($booking->status, ['checked_in', 'in_use', 'completed'])) {
                DB::table('booking_item_units')->insert([
                    'booking_item_id' => $itemId,
                    'equipment_unit_id' => $booking->equipment_id,
                    'assigned_at' => $booking->checked_in_at ?? $booking->created_at,
                    'created_at' => $booking->created_at,
                    'updated_at' => $booking->updated_at,
                ]);
            }

            // Link usage log and damage reports
            DB::table('usage_logs')
                ->where('booking_id', $booking->id)
                ->update(['booking_item_id' => $itemId]);

            DB::table('damage_reports')
                ->where('booking_id', $booking->id)
                ->update(['booking_item_id' => $itemId]);
        }
    }

    public function down(): void
    {
        Schema::table('damage_reports', function (Blueprint $table) {
            $table->dropForeign(['booking_item_id']);
            $table->dropColumn('booking_item_id');
            $table->foreignId('booking_id')->change();
        });

        Schema::table('usage_logs', function (Blueprint $table) {
            $table->dropForeign(['booking_item_id']);
            $table->dropColumn('booking_item_id');
            $table->foreignId('booking_id')->change();
        });

        Schema::dropIfExists('booking_item_units');
        Schema::dropIfExists('booking_items');

        Schema::table('bookings', function (Blueprint $table) {
            $table->dropColumn(['total_amount', 'payment_status', 'mock_transaction_id', 'cancellation_type']);
            $table->foreignId('equipment_id')->change();
            $table->date('booking_date')->change();
            $table->time('start_time')->change();
            $table->time('end_time')->change();
            $table->string('status')->change();
        });
    }
};
