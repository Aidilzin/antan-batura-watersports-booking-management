<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('equipment', function (Blueprint $table) {
            $table->id();
            $table->string('name');                       // e.g. "Single Kayak #3"
            $table->string('type')->index();              // App\Enums\EquipmentType
            $table->string('status')->default('available')->index(); // App\Enums\EquipmentStatus
            $table->decimal('hourly_rate', 8, 2);         // RM per hour
            $table->text('notes')->nullable();            // maintenance notes, etc.
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('equipment');
    }
};
