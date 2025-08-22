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

// GET /api/doctors/profile - Get current doctor's profile
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

    const user = await User.findById(decoded.userId);
    if (!user || user.userType !== "doctor") {
      return NextResponse.json(
        { error: "Only doctors can access this endpoint." },
        { status: 403 }
      );
    }

    const doctor = await Doctor.findOne({ userId: decoded.userId })
      .populate("userId", "email profile location")
      .select("-__v");

    if (!doctor) {
      return NextResponse.json(
        { error: "Doctor profile not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      doctor: {
        id: doctor._id,
        user: doctor.userId,
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
        createdAt: doctor.createdAt,
        updatedAt: doctor.updatedAt,
      },
    });
  } catch (error) {
    console.error("Get doctor profile error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json(
      { error: "Internal server error: " + errorMessage },
      { status: 500 }
    );
  }
}

// PUT /api/doctors/profile - Update doctor profile
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
    if (!user || user.userType !== "doctor") {
      return NextResponse.json(
        { error: "Only doctors can update doctor profiles." },
        { status: 403 }
      );
    }

    const doctor = await Doctor.findOne({ userId: decoded.userId });
    if (!doctor) {
      return NextResponse.json(
        { error: "Doctor profile not found." },
        { status: 404 }
      );
    }

    const body = await req.json();
    const {
      specialization,
      experience,
      education,
      certificates,
      bio,
      clinicName,
      clinicAddress,
      workingHours,
      consultationFee,
    } = body;

    // Validate fields if provided
    if (
      experience !== undefined &&
      (typeof experience !== "number" || experience < 0)
    ) {
      return NextResponse.json(
        { error: "Experience must be a non-negative number." },
        { status: 400 }
      );
    }

    if (
      consultationFee !== undefined &&
      (typeof consultationFee !== "number" || consultationFee < 0)
    ) {
      return NextResponse.json(
        { error: "Consultation fee must be a non-negative number." },
        { status: 400 }
      );
    }

    if (bio && typeof bio === "string" && bio.length > 1000) {
      return NextResponse.json(
        { error: "Bio must be 1000 characters or less." },
        { status: 400 }
      );
    }

    if (specialization && !Array.isArray(specialization)) {
      return NextResponse.json(
        { error: "Specialization must be an array of strings." },
        { status: 400 }
      );
    }

    if (education && !Array.isArray(education)) {
      return NextResponse.json(
        { error: "Education must be an array of strings." },
        { status: 400 }
      );
    }

    if (certificates && !Array.isArray(certificates)) {
      return NextResponse.json(
        { error: "Certificates must be an array of strings." },
        { status: 400 }
      );
    }

    // Validate working hours format if provided
    if (workingHours) {
      if (!Array.isArray(workingHours)) {
        return NextResponse.json(
          { error: "Working hours must be an array." },
          { status: 400 }
        );
      }

      const validDays = [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ];
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

      for (const schedule of workingHours) {
        if (!validDays.includes(schedule.day)) {
          return NextResponse.json(
            {
              error:
                "Invalid day in working hours. Use full day names (Monday-Sunday).",
            },
            { status: 400 }
          );
        }

        if (
          schedule.isAvailable &&
          (!timeRegex.test(schedule.startTime) ||
            !timeRegex.test(schedule.endTime))
        ) {
          return NextResponse.json(
            {
              error: "Invalid time format in working hours. Use HH:MM format.",
            },
            { status: 400 }
          );
        }
      }
    }

    // Build update object
    const updateData: Record<string, unknown> = {};
    if (specialization !== undefined)
      updateData.specialization = specialization;
    if (experience !== undefined) updateData.experience = experience;
    if (education !== undefined) updateData.education = education;
    if (certificates !== undefined) updateData.certificates = certificates;
    if (bio !== undefined) updateData.bio = bio;
    if (clinicName !== undefined) updateData.clinicName = clinicName;
    if (clinicAddress !== undefined) updateData.clinicAddress = clinicAddress;
    if (workingHours !== undefined) updateData.workingHours = workingHours;
    if (consultationFee !== undefined)
      updateData.consultationFee = consultationFee;

    // Update doctor profile
    const updatedDoctor = await Doctor.findByIdAndUpdate(
      doctor._id,
      updateData,
      { new: true, runValidators: true }
    ).select("-__v");

    return NextResponse.json({
      message: "Doctor profile updated successfully.",
      doctor: {
        id: updatedDoctor._id,
        specialization: updatedDoctor.specialization,
        experience: updatedDoctor.experience,
        education: updatedDoctor.education,
        certificates: updatedDoctor.certificates,
        bio: updatedDoctor.bio,
        clinicName: updatedDoctor.clinicName,
        clinicAddress: updatedDoctor.clinicAddress,
        workingHours: updatedDoctor.workingHours,
        consultationFee: updatedDoctor.consultationFee,
        updatedAt: updatedDoctor.updatedAt,
      },
    });
  } catch (error) {
    console.error("Update doctor profile error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json(
      { error: "Internal server error: " + errorMessage },
      { status: 500 }
    );
  }
}
