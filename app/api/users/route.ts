import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import dbConnect from "@/lib/mongodb";
import { User, Doctor } from "@/models/User";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";

// Helper function to verify JWT token
function verifyToken(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET) as { email: string; userId: string };
  } catch {
    return null;
  }
}

// GET /api/users/profile - Get current user profile
export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: "Invalid token." }, { status: 401 });
    }

    const user = await User.findById(decoded.userId).select("-password -__v");
    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const userProfile: Record<string, unknown> = {
      id: user._id,
      email: user.email,
      userType: user.userType,
      isVerified: user.isVerified,
      profile: user.profile,
      location: user.location,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    // If user is a doctor, get doctor-specific information
    if (user.userType === "doctor") {
      const doctor = await Doctor.findOne({ userId: user._id }).select("-__v");
      if (doctor) {
        userProfile.doctorInfo = {
          id: doctor._id,
          licenseNumber: doctor.licenseNumber,
          specialization: doctor.specialization,
          experience: doctor.experience,
          education: doctor.education,
          certificates: doctor.certificates,
          bio: doctor.bio,
          clinicName: doctor.clinicName,
          clinicAddress: doctor.clinicAddress,
          workingHours: doctor.workingHours,
          consultationFee: doctor.consultationFee,
          isActive: doctor.isActive,
          isVerified: doctor.isVerified,
          rating: doctor.rating,
          statistics: doctor.statistics,
        };
      }
    }

    return NextResponse.json({ user: userProfile });
  } catch (error) {
    console.error("Get user profile error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json(
      { error: "Internal server error: " + errorMessage },
      { status: 500 }
    );
  }
}

// PUT /api/users/profile - Update user profile
export async function PUT(req: NextRequest) {
  try {
    await dbConnect();

    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: "Invalid token." }, { status: 401 });
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const body = await req.json();
    const { profile, location } = body;

    // Validate profile fields if provided
    if (profile) {
      if (profile.firstName && typeof profile.firstName !== "string") {
        return NextResponse.json(
          { error: "First name must be a string." },
          { status: 400 }
        );
      }
      if (profile.lastName && typeof profile.lastName !== "string") {
        return NextResponse.json(
          { error: "Last name must be a string." },
          { status: 400 }
        );
      }
      if (profile.phone && typeof profile.phone !== "string") {
        return NextResponse.json(
          { error: "Phone must be a string." },
          { status: 400 }
        );
      }
    }

    // Validate location fields if provided
    if (location) {
      if (location.coordinates && !Array.isArray(location.coordinates)) {
        return NextResponse.json(
          { error: "Coordinates must be an array [longitude, latitude]." },
          { status: 400 }
        );
      }
      if (location.coordinates && location.coordinates.length !== 2) {
        return NextResponse.json(
          {
            error:
              "Coordinates must contain exactly 2 values [longitude, latitude].",
          },
          { status: 400 }
        );
      }
    }

    // Update user profile
    const updateData: Record<string, unknown> = {};
    if (profile) {
      updateData.profile = { ...user.profile, ...profile };
    }
    if (location) {
      updateData.location = { ...user.location, ...location };
    }

    const updatedUser = await User.findByIdAndUpdate(
      decoded.userId,
      updateData,
      { new: true, runValidators: true }
    ).select("-password -__v");

    return NextResponse.json({
      message: "Profile updated successfully.",
      user: {
        id: updatedUser._id,
        email: updatedUser.email,
        userType: updatedUser.userType,
        profile: updatedUser.profile,
        location: updatedUser.location,
        updatedAt: updatedUser.updatedAt,
      },
    });
  } catch (error) {
    console.error("Update user profile error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json(
      { error: "Internal server error: " + errorMessage },
      { status: 500 }
    );
  }
}
