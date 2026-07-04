<?php

namespace App\Http\Controllers;

use App\Enums\BookingStatus;
use App\Enums\PaymentStatus;
use App\Http\Requests\ReportRangeRequest;
use App\Models\Booking;
use App\Models\DamageReport;
use App\Models\Payment;
use App\Models\UsageLog;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    /** Revenue over the range, broken down by day and by payment method/purpose. */
    public function sales(ReportRangeRequest $request)
    {
        [$from, $to] = [$request->string('from'), $request->string('to')];

        $confirmed = Payment::where('status', PaymentStatus::Confirmed)
            ->whereBetween('recorded_at', [$from.' 00:00:00', $to.' 23:59:59']);

        $totalRevenue = (clone $confirmed)->sum('amount');

        $byDay = (clone $confirmed)
            ->select(DB::raw('DATE(recorded_at) as date'), DB::raw('SUM(amount) as total'))
            ->groupBy('date')->orderBy('date')->get();

        $byMethod = (clone $confirmed)
            ->select('method', DB::raw('SUM(amount) as total'), DB::raw('COUNT(*) as count'))
            ->groupBy('method')->get();

        $byPurpose = (clone $confirmed)
            ->select('purpose', DB::raw('SUM(amount) as total'), DB::raw('COUNT(*) as count'))
            ->groupBy('purpose')->get();

        return response()->json([
            'range' => ['from' => $from, 'to' => $to],
            'total_revenue' => (float) $totalRevenue,
            'by_day' => $byDay,
            'by_method' => $byMethod,
            'by_purpose' => $byPurpose,
        ]);
    }

    /** Booking volume and outcomes over the range. */
    public function bookings(ReportRangeRequest $request)
    {
        [$from, $to] = [$request->string('from'), $request->string('to')];

        $base = Booking::whereBetween('booking_date', [$from, $to]);

        $byStatus = (clone $base)
            ->select('status', DB::raw('COUNT(*) as count'))
            ->groupBy('status')->get();

        $byChannel = (clone $base)
            ->select('channel', DB::raw('COUNT(*) as count'))
            ->groupBy('channel')->get();

        $waitlisted = (clone $base)->where('waitlisted', true)->count();

        $byDay = (clone $base)
            ->select('booking_date', DB::raw('COUNT(*) as count'))
            ->groupBy('booking_date')->orderBy('booking_date')->get();

        return response()->json([
            'range' => ['from' => $from, 'to' => $to],
            'total_bookings' => (clone $base)->count(),
            'waitlisted' => $waitlisted,
            'by_status' => $byStatus,
            'by_channel' => $byChannel,
            'by_day' => $byDay,
        ]);
    }

    /** Per-equipment utilization, overtime, and damage incidence. */
    public function equipmentUsage(ReportRangeRequest $request)
    {
        [$from, $to] = [$request->string('from'), $request->string('to')];

        $bookings = Booking::whereBetween('booking_date', [$from, $to])
            ->where('status', BookingStatus::Completed)
            ->select('equipment_id', DB::raw('COUNT(*) as bookings_count'))
            ->groupBy('equipment_id')
            ->with('equipment:id,name,type,hourly_rate')
            ->get();

        $overtimeByEquipment = UsageLog::join('bookings', 'bookings.id', '=', 'usage_logs.booking_id')
            ->whereBetween('bookings.booking_date', [$from, $to])
            ->select(
                'bookings.equipment_id',
                DB::raw('SUM(usage_logs.exceeded_minutes) as total_exceeded_minutes'),
                DB::raw('SUM(usage_logs.extra_charge_amount) as total_overtime_revenue'),
            )
            ->groupBy('bookings.equipment_id')
            ->get()
            ->keyBy('equipment_id');

        $damageByEquipment = DamageReport::join('bookings', 'bookings.id', '=', 'damage_reports.booking_id')
            ->whereBetween('bookings.booking_date', [$from, $to])
            ->select('bookings.equipment_id', DB::raw('COUNT(*) as damage_count'), DB::raw('SUM(deposit_charged) as total_deposits'))
            ->groupBy('bookings.equipment_id')
            ->get()
            ->keyBy('equipment_id');

        $rows = $bookings->map(function ($row) use ($overtimeByEquipment, $damageByEquipment) {
            $overtime = $overtimeByEquipment->get($row->equipment_id);
            $damage = $damageByEquipment->get($row->equipment_id);

            return [
                'equipment_id' => $row->equipment_id,
                'equipment_name' => $row->equipment?->name,
                'equipment_type' => $row->equipment?->type?->value,
                'bookings_count' => $row->bookings_count,
                'total_exceeded_minutes' => (int) ($overtime->total_exceeded_minutes ?? 0),
                'total_overtime_revenue' => (float) ($overtime->total_overtime_revenue ?? 0),
                'damage_count' => (int) ($damage->damage_count ?? 0),
                'total_deposits' => (float) ($damage->total_deposits ?? 0),
            ];
        });

        return response()->json([
            'range' => ['from' => $from, 'to' => $to],
            'equipment' => $rows->values(),
        ]);
    }
}
