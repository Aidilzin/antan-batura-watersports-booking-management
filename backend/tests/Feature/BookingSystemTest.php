<?php

namespace Tests\Feature;

use App\Enums\BookingStatus;
use App\Enums\EquipmentStatus;
use App\Enums\UserRole;
use App\Models\Booking;
use App\Models\BookingItem;
use App\Models\Equipment;
use App\Models\User;
use App\Models\Payment;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class BookingSystemTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $staff;
    private Equipment $boat;
    private Equipment $kayak;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::create([
            'name' => 'Admin User',
            'email' => 'admin@test.com',
            'password' => bcrypt('password'),
            'role' => UserRole::Admin,
        ]);

        $this->staff = User::create([
            'name' => 'Staff User',
            'email' => 'staff@test.com',
            'password' => bcrypt('password'),
            'role' => UserRole::Staff,
        ]);

        // Seed some physical equipment units
        $this->boat = Equipment::create([
            'name' => 'Cruise Boat #1',
            'type' => 'cruise_boat',
            'status' => EquipmentStatus::Available,
            'hourly_rate' => 150.00,
        ]);

        Equipment::create([
            'name' => 'Cruise Boat #2',
            'type' => 'cruise_boat',
            'status' => EquipmentStatus::Available,
            'hourly_rate' => 150.00,
        ]);

        $this->kayak = Equipment::create([
            'name' => 'Single Kayak #1',
            'type' => 'kayak_single',
            'status' => EquipmentStatus::Available,
            'hourly_rate' => 20.00,
        ]);
    }

    public function test_multi_item_booking_creation_and_capacity_checks()
    {
        // 1. Successful multi-item booking
        $response = $this->postJson('/api/bookings', [
            'guest_name' => 'John Doe',
            'guest_email' => 'john@test.com',
            'items' => [
                [
                    'equipment_type' => 'cruise_boat',
                    'quantity' => 1,
                    'booking_date' => Carbon::tomorrow()->toDateString(),
                    'start_time' => '10:00',
                    'end_time' => '12:00', // 2 hours
                ],
                [
                    'equipment_type' => 'kayak_single',
                    'quantity' => 1,
                    'booking_date' => Carbon::tomorrow()->toDateString(),
                    'start_time' => '11:00',
                    'end_time' => '12:00', // 1 hour
                ]
            ]
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('bookings', [
            'customer_name' => 'John Doe',
            'customer_email' => 'john@test.com',
            'total_amount' => 320.00, // (150 * 1 * 2) + (20 * 1 * 1) = 300 + 20 = 320
        ]);

        // 2. Overbooking (only 2 Cruise Boats exist, let's request 3)
        $responseConflict = $this->postJson('/api/bookings', [
            'guest_name' => 'Jane Conflict',
            'guest_email' => 'jane@test.com',
            'items' => [
                [
                    'equipment_type' => 'cruise_boat',
                    'quantity' => 3,
                    'booking_date' => Carbon::tomorrow()->toDateString(),
                    'start_time' => '10:00',
                    'end_time' => '12:00',
                ]
            ]
        ]);

        $responseConflict->assertStatus(409); // Conflict status code
    }

    public function test_cancellation_cutoff_window()
    {
        // Add a booking item starting in 1 hour
        $booking = Booking::create([
            'booking_reference' => 'AB-XXXXXX',
            'customer_name' => 'Test Customer',
            'customer_email' => 'test@test.com',
            'status' => BookingStatus::Confirmed,
            'total_amount' => 100,
        ]);

        $item = BookingItem::create([
            'booking_id' => $booking->id,
            'equipment_type' => 'cruise_boat',
            'quantity' => 1,
            'booking_date' => Carbon::now(),
            'start_time' => Carbon::now()->addHour()->format('H:i'),
            'end_time' => Carbon::now()->addHours(2)->format('H:i'),
            'rate_snapshot' => 100,
            'item_status' => 'confirmed',
        ]);

        // Guest cancel should fail (cutoff limit is 2 hours)
        $responseGuest = $this->actingAs($this->staff)->postJson("/api/bookings/{$booking->id}/cancel");
        $responseGuest->assertStatus(422);

        // Staff override cancel should succeed
        $responseStaff = $this->actingAs($this->staff)->postJson("/api/bookings/{$booking->id}/staff-cancel");
        $responseStaff->assertStatus(200);

        $this->assertDatabaseHas('bookings', [
            'id' => $booking->id,
            'status' => 'cancelled',
            'cancellation_type' => 'staff_override',
        ]);
    }

    public function test_per_item_operational_workflow()
    {
        // Create booking
        $booking = Booking::create([
            'booking_reference' => 'AB-OPFLOW',
            'customer_name' => 'Ops Guy',
            'customer_email' => 'ops@test.com',
            'status' => BookingStatus::Confirmed,
            'total_amount' => 300,
        ]);

        $item = BookingItem::create([
            'booking_id' => $booking->id,
            'equipment_type' => 'cruise_boat',
            'quantity' => 1,
            'booking_date' => Carbon::tomorrow(),
            'start_time' => '10:00',
            'end_time' => '12:00',
            'rate_snapshot' => 150,
            'item_status' => 'confirmed',
        ]);

        // 1. Check in (assign physical boat ID 1)
        $responseCheckIn = $this->actingAs($this->staff)->postJson("/api/bookings/{$booking->id}/items/{$item->id}/check-in", [
            'safety_briefing_given' => true,
            'safety_gear_issued' => true,
            'unit_ids' => [$this->boat->id],
        ]);
        $responseCheckIn->assertStatus(200);

        $this->assertDatabaseHas('booking_item_units', [
            'booking_item_id' => $item->id,
            'equipment_unit_id' => $this->boat->id,
        ]);

        // 2. Handover should fail if payment not confirmed
        $responseHandoverFail = $this->actingAs($this->staff)->postJson("/api/bookings/{$booking->id}/items/{$item->id}/hand-over");
        $responseHandoverFail->assertStatus(422);

        // Record confirmed payment
        Payment::create([
            'booking_id' => $booking->id,
            'amount' => 300.00,
            'method' => 'cash',
            'status' => 'confirmed',
            'purpose' => 'booking',
            'recorded_at' => Carbon::now(),
        ]);

        // Handover succeeds now
        $responseHandoverSuccess = $this->actingAs($this->staff)->postJson("/api/bookings/{$booking->id}/items/{$item->id}/hand-over");
        $responseHandoverSuccess->assertStatus(200);

        // 3. Return (mark damaged, charge RM50 deposit)
        $responseReturn = $this->actingAs($this->staff)->postJson("/api/bookings/{$booking->id}/items/{$item->id}/return", [
            'condition_on_return' => 'damaged',
            'damage_description' => 'Scratched hull',
            'deposit_charged' => 50.00,
        ]);
        $responseReturn->assertStatus(200);

        $this->assertDatabaseHas('damage_reports', [
            'booking_item_id' => $item->id,
            'description' => 'Scratched hull',
            'deposit_charged' => 50.00,
        ]);

        // Parent booking should be marked completed
        $this->assertDatabaseHas('bookings', [
            'id' => $booking->id,
            'status' => 'completed',
        ]);
    }

    public function test_staff_promotion_rules()
    {
        // Promote staff member to admin
        $response = $this->actingAs($this->admin)->postJson("/api/users/staff/{$this->staff->id}/promote");
        $response->assertStatus(200);

        $this->assertEquals(UserRole::Admin, $this->staff->fresh()->role);

        // Demote themselves should fail
        $responseSelf = $this->actingAs($this->admin)->postJson("/api/users/staff/{$this->admin->id}/promote");
        $responseSelf->assertStatus(400);
    }

    public function test_financial_report_and_csv_export()
    {
        // Create booking first
        $booking = Booking::create([
            'booking_reference' => 'AB-REPTST',
            'customer_name' => 'Report Customer',
            'customer_email' => 'rep@test.com',
            'status' => BookingStatus::Confirmed,
            'total_amount' => 250,
        ]);

        // Confirm a payment to generate revenue data
        Payment::create([
            'booking_id' => $booking->id,
            'amount' => 250.00,
            'method' => 'qr',
            'status' => 'confirmed',
            'purpose' => 'booking',
            'recorded_at' => Carbon::now(),
        ]);

        // Get JSON report
        $responseReport = $this->actingAs($this->admin)->getJson('/api/reports/financial?from=' . Carbon::today()->toDateString() . '&to=' . Carbon::today()->toDateString());
        $responseReport->assertStatus(200);
        $responseReport->assertJsonFragment(['total_revenue' => 250.00]);

        // Get CSV export
        $responseCsv = $this->actingAs($this->admin)->get('/api/reports/financial?from=' . Carbon::today()->toDateString() . '&to=' . Carbon::today()->toDateString() . '&export=csv');
        $responseCsv->assertStatus(200);
        $responseCsv->assertHeader('content-type', 'text/csv; charset=UTF-8');
    }
}
