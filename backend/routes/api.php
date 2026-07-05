<?php

use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\AvailabilityController;
use App\Http\Controllers\BookingController;
use App\Http\Controllers\BookingItemController;
use App\Http\Controllers\CheckInController;
use App\Http\Controllers\EquipmentController;
use App\Http\Controllers\HandoverController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\ReturnController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Antan Batura Watersports — API routes
|--------------------------------------------------------------------------
| Grouped by the business process order. Token auth via Sanctum (Bearer).
| role:staff also admits admins; role:admin is admin-only.
*/

// --- Public auth ---
Route::post('/login', [AuthController::class, 'login']);

// --- Public fleet browsing (customers pick equipment before logging in) ---
Route::get('/equipment', [EquipmentController::class, 'index']);
Route::get('/equipment/{equipment}', [EquipmentController::class, 'show']);
Route::post('/availability/check', [AvailabilityController::class, 'check']);
Route::post('/availability/calendar', [AvailabilityController::class, 'calendar']);
Route::post('/bookings', [BookingController::class, 'store']);

// Customer self-service cancel by reference (no auth required)
Route::post('/bookings/reference/{reference}/cancel', [BookingController::class, 'cancelByReference']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);

    // --- Module 1: booking & availability ---
    Route::get('/bookings', [BookingController::class, 'index']);
    Route::get('/bookings/reference/{reference}', [BookingController::class, 'showByReference']);
    Route::get('/bookings/{booking}', [BookingController::class, 'show']);
    Route::post('/bookings/{booking}/cancel', [BookingController::class, 'cancel']); // self-service cancel

    // Per-item cancellation
    Route::post('/bookings/{booking}/items/{bookingItem}/cancel', [BookingController::class, 'cancelItem']);

    // --- Module 2: check-in, handover, return (per item) ---
    Route::middleware('role:staff')->group(function () {
        Route::post('/bookings/{booking}/staff-cancel', [BookingController::class, 'staffCancel']);
        Route::post('/bookings/{booking}/items/{bookingItem}/check-in', [BookingItemController::class, 'checkIn']);
        Route::post('/bookings/{booking}/items/{bookingItem}/hand-over', [BookingItemController::class, 'handOver']);
        Route::post('/bookings/{booking}/items/{bookingItem}/return', [BookingItemController::class, 'returnItem']);

        // Legacy single-booking endpoints (backward compat for front-desk until fully migrated)
        Route::post('/bookings/{booking}/check-in', [CheckInController::class, 'checkIn']);
        Route::post('/bookings/{booking}/hand-over', [HandoverController::class, 'handOver']);
        Route::post('/bookings/{booking}/return', [ReturnController::class, 'returnEquipment']);
    });

    // --- Module 3: payment recording (mock gateway) ---
    Route::get('/bookings/{booking}/payments', [PaymentController::class, 'index']);
    Route::post('/bookings/{booking}/payments', [PaymentController::class, 'store'])->middleware('role:staff');
    Route::post('/payments/{payment}/confirm', [PaymentController::class, 'confirm'])->middleware('role:staff');
    Route::post('/payments/{payment}/fail', [PaymentController::class, 'fail'])->middleware('role:staff');

    // --- Equipment inventory management ---
    Route::middleware('role:admin')->group(function () {
        Route::post('/equipment', [EquipmentController::class, 'store']);
        Route::patch('/equipment/{equipment}', [EquipmentController::class, 'update']);
        Route::delete('/equipment/{equipment}', [EquipmentController::class, 'destroy']);

        // --- Module 6: reporting ---
        Route::get('/reports/sales', [ReportController::class, 'sales']);
        Route::get('/reports/bookings', [ReportController::class, 'bookings']);
        Route::get('/reports/equipment-usage', [ReportController::class, 'equipmentUsage']);
        Route::get('/reports/financial', [ReportController::class, 'financial']);

        // --- Staff management ---
        Route::get('/users/staff', [UserController::class, 'indexStaff']);
        Route::post('/users/staff', [UserController::class, 'storeStaff']);
        Route::put('/users/staff/{user}', [UserController::class, 'updateStaff']);
        Route::delete('/users/staff/{user}', [UserController::class, 'destroyStaff']);
        Route::post('/users/staff/{user}/promote', [UserController::class, 'promoteStaff']);
    });

    // Staff can also update equipment status (e.g. flag for maintenance) without full admin rights.
    Route::patch('/equipment/{equipment}/status', [EquipmentController::class, 'update'])->middleware('role:staff');
});
