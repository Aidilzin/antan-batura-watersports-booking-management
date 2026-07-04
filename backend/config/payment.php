<?php

return [
    /*
    | Dummy bank account shown on the mock bank-transfer checkout screen.
    | Not a real account — for the simulated gateway demo only.
    */
    'mock_bank' => [
        'bank_name' => env('MOCK_BANK_NAME', 'Maybank'),
        'account_name' => env('MOCK_BANK_ACCOUNT_NAME', 'Antan Batura Watersports'),
        'account_number' => env('MOCK_BANK_ACCOUNT_NUMBER', '5124 1098 7766'),
    ],

    /*
    | Overtime policy for usage monitoring (module 4).
    | A short grace period is forgiven; beyond it, each started block is
    | charged pro-rata against the equipment's hourly rate.
    */
    'overtime' => [
        'grace_minutes' => (int) env('OVERTIME_GRACE_MINUTES', 10),
        'block_minutes' => (int) env('OVERTIME_BLOCK_MINUTES', 30),
        // Multiplier applied to the pro-rated hourly rate for overtime blocks.
        'rate_multiplier' => (float) env('OVERTIME_RATE_MULTIPLIER', 1.5),
    ],
];
