<?php

return [
    // Operating window used for availability + alternative-slot suggestions (24h).
    'open_time' => env('BOOKING_OPEN_TIME', '09:00'),
    'close_time' => env('BOOKING_CLOSE_TIME', '18:00'),

    // Booking duration guardrails (hours).
    'min_hours' => 1,
    'max_hours' => 8,

    // Default refundable deposit suggested when logging damage.
    'default_deposit' => (float) env('BOOKING_DEFAULT_DEPOSIT', 50.00),

    // Booking statuses that occupy a time slot (block new overlapping bookings).
    'blocking_statuses' => ['pending', 'confirmed', 'checked_in', 'in_use'],
];
