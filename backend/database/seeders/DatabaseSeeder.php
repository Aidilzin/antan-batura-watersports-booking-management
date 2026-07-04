<?php

namespace Database\Seeders;

use App\Enums\BookingStatus;
use App\Enums\EquipmentStatus;
use App\Enums\EquipmentType;
use App\Enums\PaymentMethod;
use App\Enums\PaymentPurpose;
use App\Enums\PaymentStatus;
use App\Enums\UserRole;
use App\Models\Booking;
use App\Models\Equipment;
use App\Models\Payment;
use App\Models\UsageLog;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->seedUsers();
        $this->seedFleet();
        $this->seedHistory();
    }

    private function seedUsers(): void
    {
        User::create([
            'name' => 'Aisyah (Owner)', 'email' => 'admin@antanbatura.test',
            'phone' => '0123456789', 'role' => UserRole::Admin, 'password' => 'password123',
        ]);
        User::create([
            'name' => 'Farid (Staff)', 'email' => 'staff@antanbatura.test',
            'phone' => '0123456781', 'role' => UserRole::Staff, 'password' => 'password123',
        ]);
        User::create([
            'name' => 'Lina (Staff)', 'email' => 'staff2@antanbatura.test',
            'phone' => '0123456782', 'role' => UserRole::Staff, 'password' => 'password123',
        ]);

        foreach (['Hakim', 'Mei Ling', 'Ravi', 'Nurul', 'Daniel'] as $i => $name) {
            User::create([
                'name' => $name,
                'email' => 'customer'.($i + 1).'@example.test',
                'phone' => '01987654'.($i + 10),
                'role' => UserRole::Customer,
                'password' => 'password123',
            ]);
        }
    }

    private function seedFleet(): void
    {
        // [type, count, hourly_rate]
        $fleet = [
            [EquipmentType::CruiseBoat, 2, 120.00],
            [EquipmentType::KayakSingle, 6, 25.00],
            [EquipmentType::KayakDouble, 4, 40.00],
            [EquipmentType::Canoe, 3, 35.00],
            [EquipmentType::PaddleBoat, 4, 30.00],
            [EquipmentType::PaddleBoatFamily, 2, 55.00],
        ];

        foreach ($fleet as [$type, $count, $rate]) {
            for ($n = 1; $n <= $count; $n++) {
                Equipment::create([
                    'name' => $type->label().' #'.$n,
                    'type' => $type,
                    'status' => EquipmentStatus::Available,
                    'hourly_rate' => $rate,
                ]);
            }
        }
    }

    /** A spread of completed bookings over the last 30 days so reports have data. */
    private function seedHistory(): void
    {
        $customers = User::where('role', UserRole::Customer)->get();
        $staff = User::where('role', UserRole::Staff)->first();
        $equipment = Equipment::all();
        $methods = [PaymentMethod::Qr, PaymentMethod::Cash, PaymentMethod::BankTransfer];

        for ($d = 30; $d >= 1; $d--) {
            $bookingsToday = random_int(1, 4);

            for ($b = 0; $b < $bookingsToday; $b++) {
                $item = $equipment->random();
                $customer = $customers->random();
                $date = Carbon::today()->subDays($d);
                $startHour = random_int(9, 16);
                $hours = random_int(1, 3);

                $start = $date->copy()->setTime($startHour, 0);
                $end = $start->copy()->addHours($hours);
                $amount = round((float) $item->hourly_rate * $hours, 2);

                $booking = Booking::create([
                    'booking_reference' => 'AB-'.Str::upper(Str::random(6)),
                    'customer_id' => $customer->id,
                    'equipment_id' => $item->id,
                    'booking_date' => $date->toDateString(),
                    'start_time' => $start->format('H:i:s'),
                    'end_time' => $end->format('H:i:s'),
                    'status' => BookingStatus::Completed,
                    'channel' => random_int(0, 1) ? 'online' : 'walk_in',
                    'safety_briefing_given' => true,
                    'safety_gear_issued' => true,
                    'checked_in_at' => $start->copy()->subMinutes(15),
                    'checked_in_by' => $staff->id,
                    'handed_over_at' => $start,
                    'completed_at' => $end,
                ]);

                Payment::create([
                    'booking_id' => $booking->id,
                    'amount' => $amount,
                    'method' => $methods[array_rand($methods)],
                    'status' => PaymentStatus::Confirmed,
                    'purpose' => PaymentPurpose::Booking,
                    'mock_transaction_id' => 'MOCK-'.$booking->booking_reference.'-'.Str::upper(Str::random(6)),
                    'recorded_by' => $staff->id,
                    'recorded_at' => $start,
                ]);

                // ~1 in 5 sessions ran over time.
                $exceeded = random_int(1, 5) === 1 ? random_int(15, 45) : 0;
                UsageLog::create([
                    'booking_id' => $booking->id,
                    'actual_start_time' => $start,
                    'actual_end_time' => $end->copy()->addMinutes($exceeded),
                    'exceeded_minutes' => $exceeded,
                    'extra_charge_amount' => $exceeded > 0 ? round((float) $item->hourly_rate * 0.5, 2) : 0,
                    'condition_on_return' => 'good',
                ]);
            }
        }
    }
}
