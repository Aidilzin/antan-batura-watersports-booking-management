<?php

namespace App\Enums;

enum UserRole: string
{
    case Customer = 'customer';
    case Staff = 'staff';
    case Admin = 'admin';

    /** Staff and admins share the operational back-office UI. */
    public function isStaffLevel(): bool
    {
        return $this === self::Staff || $this === self::Admin;
    }
}
