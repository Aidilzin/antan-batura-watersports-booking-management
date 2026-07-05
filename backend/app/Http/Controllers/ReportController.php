<?php

namespace App\Http\Controllers;

use App\Enums\BookingStatus;
use App\Enums\PaymentStatus;
use App\Http\Requests\ReportRangeRequest;
use App\Models\Booking;
use App\Models\BookingItem;
use App\Models\DamageReport;
use App\Models\Payment;
use App\Models\UsageLog;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

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

    /**
     * Financial report — admin only (enforced via route middleware).
     * Supports ?export=csv to download a CSV file.
     */
    public function financial(Request $request)
    {
        $request->validate([
            'from' => ['required', 'date'],
            'to'   => ['required', 'date', 'after_or_equal:from'],
        ]);

        [$from, $to] = [$request->input('from'), $request->input('to')];

        $confirmedPayments = Payment::where('status', PaymentStatus::Confirmed)
            ->whereBetween('recorded_at', [$from.' 00:00:00', $to.' 23:59:59']);

        $totalRevenue = (clone $confirmedPayments)->sum('amount');
        $txCount      = (clone $confirmedPayments)->count();
        $avgTx        = $txCount > 0 ? round($totalRevenue / $txCount, 2) : 0;

        $byMethod = (clone $confirmedPayments)
            ->select('method', DB::raw('SUM(amount) as total'), DB::raw('COUNT(*) as count'))
            ->groupBy('method')->get();

        $byTypeRaw = BookingItem::join('bookings', 'bookings.id', '=', 'booking_items.booking_id')
            ->join('payments', 'payments.booking_id', '=', 'bookings.id')
            ->where('payments.status', PaymentStatus::Confirmed->value)
            ->whereBetween('payments.recorded_at', [$from.' 00:00:00', $to.' 23:59:59'])
            ->select('booking_items.equipment_type', 'booking_items.rate_snapshot', 'booking_items.quantity', 'booking_items.adult_count', 'booking_items.child_count', 'booking_items.start_time', 'booking_items.end_time')
            ->get();

        $byTypeGroups = [];
        foreach ($byTypeRaw as $item) {
            if ($item->equipment_type === 'cruise_boat') {
                $revenue = (($item->adult_count ?? 0) * 10.00) + (($item->child_count ?? 0) * 6.00);
            } else {
                $hours = Carbon::parse($item->start_time)->floatDiffInHours(Carbon::parse($item->end_time));
                $revenue = (float)$item->rate_snapshot * $item->quantity * $hours;
            }
            $byTypeGroups[$item->equipment_type] = ($byTypeGroups[$item->equipment_type] ?? 0.0) + $revenue;
        }

        $byType = collect($byTypeGroups)->map(function ($rev, $type) {
            return [
                'equipment_type' => $type,
                'revenue'        => round($rev, 2)
            ];
        })->values();

        $overtimeTotal = UsageLog::join('bookings', 'bookings.id', '=', 'usage_logs.booking_id')
            ->whereBetween('bookings.created_at', [$from.' 00:00:00', $to.' 23:59:59'])
            ->sum('usage_logs.extra_charge_amount');

        $damageTotal = DamageReport::join('bookings', 'bookings.id', '=', 'damage_reports.booking_id')
            ->whereBetween('bookings.created_at', [$from.' 00:00:00', $to.' 23:59:59'])
            ->sum('damage_reports.deposit_charged');

        $cancellationCounts = Booking::whereBetween('created_at', [$from.' 00:00:00', $to.' 23:59:59'])
            ->where('status', 'cancelled')
            ->select('cancellation_type', DB::raw('COUNT(*) as count'))
            ->groupBy('cancellation_type')
            ->get();

        $report = [
            'range'               => ['from' => $from, 'to' => $to],
            'total_revenue'       => (float) $totalRevenue,
            'transaction_count'   => $txCount,
            'avg_transaction'     => (float) $avgTx,
            'by_method'           => $byMethod,
            'by_equipment_type'   => $byType,
            'total_overtime'      => (float) $overtimeTotal,
            'total_damage_deposits' => (float) $damageTotal,
            'cancellation_counts' => $cancellationCounts,
        ];

        if ($request->input('export') === 'csv') {
            return $this->exportFinancialCsv($report, $from, $to);
        }

        return response()->json($report);
    }

    private function exportFinancialCsv(array $report, string $from, string $to): StreamedResponse
    {
        $filename = "financial_report_{$from}_to_{$to}.csv";

        return response()->streamDownload(function () use ($report) {
            $out = fopen('php://output', 'w');

            // Summary
            fputcsv($out, ['Financial Report Summary']);
            fputcsv($out, ['Period', $report['range']['from'].' to '.$report['range']['to']]);
            fputcsv($out, ['Total Revenue (RM)', $report['total_revenue']]);
            fputcsv($out, ['Transaction Count', $report['transaction_count']]);
            fputcsv($out, ['Average Transaction (RM)', $report['avg_transaction']]);
            fputcsv($out, ['Total Overtime Charges (RM)', $report['total_overtime']]);
            fputcsv($out, ['Total Damage Deposits (RM)', $report['total_damage_deposits']]);
            fputcsv($out, []);

            // By Payment Method
            fputcsv($out, ['Revenue by Payment Method']);
            fputcsv($out, ['Method', 'Revenue (RM)', 'Transactions']);
            foreach ($report['by_method'] as $row) {
                $method = $row->method ?? $row['method'];
                $methodStr = $method instanceof \BackedEnum ? $method->value : (string) $method;
                fputcsv($out, [strtoupper($methodStr), $row->total ?? $row['total'], $row->count ?? $row['count']]);
            }
            fputcsv($out, []);

            // By Equipment Type
            fputcsv($out, ['Revenue by Equipment Type']);
            fputcsv($out, ['Equipment Type', 'Revenue (RM)']);
            foreach ($report['by_equipment_type'] as $row) {
                $type = $row->equipment_type ?? $row['equipment_type'];
                $typeStr = $type instanceof \BackedEnum ? $type->value : (string) $type;
                fputcsv($out, [$typeStr, round($row->revenue ?? $row['revenue'], 2)]);
            }
            fputcsv($out, []);

            // Cancellations
            fputcsv($out, ['Cancellations by Type']);
            fputcsv($out, ['Type', 'Count']);
            foreach ($report['cancellation_counts'] as $row) {
                fputcsv($out, [$row->cancellation_type ?? $row['cancellation_type'] ?? 'unknown', $row->count ?? $row['count']]);
            }

            fclose($out);
        }, $filename, [
            'Content-Type' => 'text/csv',
        ]);
    }
}
