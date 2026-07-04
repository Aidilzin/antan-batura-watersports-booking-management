<?php

namespace App\Http\Controllers;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules;

class UserController extends Controller
{
    /** List all staff and admin users. */
    public function indexStaff(): JsonResponse
    {
        $staff = User::whereIn('role', [UserRole::Staff, UserRole::Admin])
            ->orderBy('name')
            ->get();

        return response()->json($staff);
    }

    /** Create a new staff or admin user. */
    public function storeStaff(Request $request): JsonResponse
    {
        $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users'],
            'phone' => ['nullable', 'string', 'max:50'],
            'role' => ['required', 'string', 'in:staff,admin'],
            'password' => ['required', 'string', 'min:8'],
        ]);

        $user = User::create([
            'name' => $request->string('name'),
            'email' => $request->string('email'),
            'phone' => $request->input('phone'),
            'role' => $request->string('role') === 'admin' ? UserRole::Admin : UserRole::Staff,
            'password' => Hash::make($request->string('password')),
        ]);

        return response()->json([
            'message' => 'Staff member created successfully.',
            'user' => $user,
        ], 201);
    }

    /** Update an existing staff member. */
    public function updateStaff(Request $request, User $user): JsonResponse
    {
        $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email,' . $user->id],
            'phone' => ['nullable', 'string', 'max:50'],
            'role' => ['required', 'string', 'in:staff,admin'],
            'password' => ['nullable', 'string', 'min:8'],
        ]);

        $user->name = $request->string('name');
        $user->email = $request->string('email');
        $user->phone = $request->input('phone');
        $user->role = $request->string('role') === 'admin' ? UserRole::Admin : UserRole::Staff;

        if ($request->filled('password')) {
            $user->password = Hash::make($request->string('password'));
        }

        $user->save();

        return response()->json([
            'message' => 'Staff member updated successfully.',
            'user' => $user,
        ]);
    }

    /** Delete a staff member. */
    public function destroyStaff(User $user): JsonResponse
    {
        // Prevent deleting oneself
        if (auth()->id() === $user->id) {
            return response()->json(['message' => 'You cannot delete your own admin account.'], 400);
        }

        $user->delete();

        return response()->json(['message' => 'Staff account deleted.']);
    }
}
