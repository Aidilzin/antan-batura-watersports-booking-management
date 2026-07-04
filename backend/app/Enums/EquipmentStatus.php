<?php

namespace App\Enums;

enum EquipmentStatus: string
{
    case Available = 'available';
    case Booked = 'booked';
    case Maintenance = 'maintenance';
}
