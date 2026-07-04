<?php

use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\AvailabilityController;
use App\Http\Controllers\BookingController;
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
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

// --- Public fleet browsing (customers pick equipment before logging in) ---
Route::get('/equipment', [EquipmentController::class, 'index']);
Route::get('/equipment/{equipment}', [EquipmentController::class, 'show']);
Route::post('/availability/check', [AvailabilityController::class, 'check']);
Route::post('/availability/calendar', [AvailabilityController::class, 'calendar']);
Route::post('/bookings', [BookingController::class, 'store']);
Route::get('/social-feed', function () {
    return response()->json([
        [
            'id' => 1,
            'source' => 'facebook',
            'author' => 'Antan Batura Watersport',
            'date' => '2 hours ago',
            'text' => '☀️ Beautiful weekend morning at Tasik Shah Alam! Perfect weather for kayaking. Come rent a single kayak for just RM10/hr or double for RM20/hr. Open until 7:15 PM today!',
            'image' => 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&q=80&w=800',
            'likes' => 142,
            'comments' => 18,
            'link' => 'https://www.facebook.com/AntanBaturaWatersport'
        ],
        [
            'id' => 2,
            'source' => 'instagram',
            'author' => 'antanbaturawatersport',
            'date' => 'Yesterday',
            'text' => 'Watch the sunset over the Blue Mosque from our Cruise Boat 🌅. Tickets are RM10 for adults and RM6 for kids. Make sure to arrive early for the 6:30 PM slot!',
            'image' => 'https://images.unsplash.com/photo-1569263979104-865ab7cd8d13?auto=format&fit=crop&q=80&w=800',
            'likes' => 389,
            'comments' => 24,
            'link' => 'https://www.instagram.com/antanbaturawatersport/'
        ],
        [
            'id' => 3,
            'source' => 'facebook',
            'author' => 'Antan Batura Watersport',
            'date' => '3 days ago',
            'text' => 'Safety first at Antan Batura! 🛟 We provide complimentary, cleaned life jackets for all rentals. Standard safety briefing is given before you enter the water.',
            'image' => 'https://images.unsplash.com/photo-1518156677180-95a2893f3e9f?auto=format&fit=crop&q=80&w=800',
            'likes' => 98,
            'comments' => 5,
            'link' => 'https://www.facebook.com/AntanBaturaWatersport'
        ]
    ]);
});

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);

    // --- Module 1: booking & availability ---
    Route::get('/bookings', [BookingController::class, 'index']);
    Route::get('/bookings/reference/{reference}', [BookingController::class, 'showByReference']);
    Route::post('/bookings/reference/{reference}/cancel', [BookingController::class, 'cancelByReference']);
    Route::get('/bookings/{booking}', [BookingController::class, 'show']);
    Route::post('/bookings/{booking}/cancel', [BookingController::class, 'cancel']);

    // --- Module 2: check-in & handover ---
    Route::middleware('role:staff')->group(function () {
        Route::post('/bookings/{booking}/check-in', [CheckInController::class, 'checkIn']);
        Route::post('/bookings/{booking}/hand-over', [HandoverController::class, 'handOver']);
    });

    // --- Module 3: payment recording (mock gateway) ---
    Route::get('/bookings/{booking}/payments', [PaymentController::class, 'index']);
    Route::post('/bookings/{booking}/payments', [PaymentController::class, 'store'])->middleware('role:staff');
    Route::post('/payments/{payment}/confirm', [PaymentController::class, 'confirm'])->middleware('role:staff');
    Route::post('/payments/{payment}/fail', [PaymentController::class, 'fail'])->middleware('role:staff');

    // --- Module 5: return & inspection (module 4's overtime calc happens inside) ---
    Route::post('/bookings/{booking}/return', [ReturnController::class, 'returnEquipment'])->middleware('role:staff');

    // --- Equipment inventory management ---
    Route::middleware('role:admin')->group(function () {
        Route::post('/equipment', [EquipmentController::class, 'store']);
        Route::patch('/equipment/{equipment}', [EquipmentController::class, 'update']);
        Route::delete('/equipment/{equipment}', [EquipmentController::class, 'destroy']);

        // --- Module 6: reporting ---
        Route::get('/reports/sales', [ReportController::class, 'sales']);
        Route::get('/reports/bookings', [ReportController::class, 'bookings']);
        Route::get('/reports/equipment-usage', [ReportController::class, 'equipmentUsage']);

        // --- Staff management ---
        Route::get('/users/staff', [UserController::class, 'indexStaff']);
        Route::post('/users/staff', [UserController::class, 'storeStaff']);
        Route::delete('/users/staff/{user}', [UserController::class, 'destroyStaff']);
    });

    // Staff can also update equipment status (e.g. flag for maintenance) without full admin rights.
    Route::patch('/equipment/{equipment}/status', [EquipmentController::class, 'update'])->middleware('role:staff');
});
