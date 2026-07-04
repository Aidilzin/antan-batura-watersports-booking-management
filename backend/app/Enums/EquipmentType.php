<?php

namespace App\Enums;

enum EquipmentType: string
{
    case CruiseBoat = 'cruise_boat';
    case KayakSingle = 'kayak_single';
    case KayakDouble = 'kayak_double';
    case Canoe = 'canoe';
    case PaddleBoat = 'paddle_boat';
    case PaddleBoatFamily = 'paddle_boat_family';

    public function label(): string
    {
        return match ($this) {
            self::CruiseBoat => 'Cruise Boat',
            self::KayakSingle => 'Single Kayak',
            self::KayakDouble => 'Double Kayak',
            self::Canoe => 'Canoe',
            self::PaddleBoat => 'Paddle Boat',
            self::PaddleBoatFamily => 'Family Paddle Boat',
        };
    }
}
