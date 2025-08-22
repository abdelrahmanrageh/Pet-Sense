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

// GET /api/doctors/clinic - Get doctor's clinic information
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
        { error: "Only doctors can access clinic information." },
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

    // Return only clinic-related information
    const clinicInfo = {
      clinicName: doctor.clinicName,
      clinicAddress: doctor.clinicAddress,
      workingHours: doctor.workingHours,
      consultationFee: doctor.consultationFee,
      contactInfo: {
        phone: user.profile.phone,
        email: user.email,
      },
      location: user.location,
      specialization: doctor.specialization,
      isActive: doctor.isActive,
    };

    return NextResponse.json({
      clinic: clinicInfo,
    });
  } catch (error) {
    console.error("Get clinic info error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json(
      { error: "Internal server error: " + errorMessage },
      { status: 500 }
    );
  }
}

// PUT /api/doctors/clinic - Update doctor's clinic information
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
        { error: "Only doctors can update clinic information." },
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
      clinicName,
      clinicAddress,
      consultationFee,
      workingHours,
      location,
      contactPhone,
      specialization,
    } = body;

    // Prepare update objects
    const doctorUpdate: Record<string, unknown> = {
      updatedAt: new Date(),
    };
    const userUpdate: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    // Validate and update clinic name
    if (clinicName !== undefined) {
      if (typeof clinicName !== "string" || clinicName.trim().length < 2) {
        return NextResponse.json(
          { error: "Clinic name must be at least 2 characters long." },
          { status: 400 }
        );
      }
      doctorUpdate.clinicName = clinicName.trim();
    }

    // Validate and update clinic address
    if (clinicAddress !== undefined) {
      if (
        typeof clinicAddress !== "string" ||
        clinicAddress.trim().length < 5
      ) {
        return NextResponse.json(
          { error: "Clinic address must be at least 5 characters long." },
          { status: 400 }
        );
      }
      doctorUpdate.clinicAddress = clinicAddress.trim();
    }

    // Validate and update consultation fee
    if (consultationFee !== undefined) {
      if (typeof consultationFee !== "number" || consultationFee < 0) {
        return NextResponse.json(
          { error: "Consultation fee must be a non-negative number." },
          { status: 400 }
        );
      }
      doctorUpdate.consultationFee = consultationFee;
    }

    // Validate and update specialization
    if (specialization !== undefined) {
      if (!Array.isArray(specialization) || specialization.length === 0) {
        return NextResponse.json(
          { error: "At least one specialization is required." },
          { status: 400 }
        );
      }

      const validSpecializations = specialization.every(
        (spec: unknown) => typeof spec === "string" && spec.trim().length > 0
      );

      if (!validSpecializations) {
        return NextResponse.json(
          { error: "All specializations must be non-empty strings." },
          { status: 400 }
        );
      }

      doctorUpdate.specialization = specialization.map((spec: string) =>
        spec.trim()
      );
    }

    // Validate and update working hours
    if (workingHours !== undefined) {
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
        if (!schedule.day || !validDays.includes(schedule.day)) {
          return NextResponse.json(
            {
              error: `Invalid day: ${
                schedule.day
              }. Must be one of: ${validDays.join(", ")}`,
            },
            { status: 400 }
          );
        }

        if (schedule.isAvailable) {
          if (!schedule.startTime || !schedule.endTime) {
            return NextResponse.json(
              {
                error: `Start time and end time are required for available days.`,
              },
              { status: 400 }
            );
          }

          if (
            !timeRegex.test(schedule.startTime) ||
            !timeRegex.test(schedule.endTime)
          ) {
            return NextResponse.json(
              { error: "Time must be in HH:MM format (24-hour)." },
              { status: 400 }
            );
          }

          // Check if start time is before end time
          const [startHour, startMin] = schedule.startTime
            .split(":")
            .map(Number);
          const [endHour, endMin] = schedule.endTime.split(":").map(Number);
          const startMinutes = startHour * 60 + startMin;
          const endMinutes = endHour * 60 + endMin;

          if (startMinutes >= endMinutes) {
            return NextResponse.json(
              {
                error: `Start time must be before end time for ${schedule.day}.`,
              },
              { status: 400 }
            );
          }
        }
      }

      doctorUpdate.workingHours = workingHours;
    }

    // Update contact phone in user profile
    if (contactPhone !== undefined) {
      if (typeof contactPhone !== "string") {
        return NextResponse.json(
          { error: "Contact phone must be a string." },
          { status: 400 }
        );
      }
      userUpdate["profile.phone"] = contactPhone.trim();
    }

    // Update clinic location in user profile
    if (location !== undefined) {
      if (typeof location !== "object" || location === null) {
        return NextResponse.json(
          { error: "Location must be an object." },
          { status: 400 }
        );
      }

      const { address, city, country, coordinates } = location;

      if (
        address !== undefined &&
        (typeof address !== "string" || address.trim().length === 0)
      ) {
        return NextResponse.json(
          { error: "Address must be a non-empty string." },
          { status: 400 }
        );
      }

      if (
        city !== undefined &&
        (typeof city !== "string" || city.trim().length === 0)
      ) {
        return NextResponse.json(
          { error: "City must be a non-empty string." },
          { status: 400 }
        );
      }

      if (
        country !== undefined &&
        (typeof country !== "string" || country.trim().length === 0)
      ) {
        return NextResponse.json(
          { error: "Country must be a non-empty string." },
          { status: 400 }
        );
      }

      if (coordinates !== undefined) {
        if (!Array.isArray(coordinates) || coordinates.length !== 2) {
          return NextResponse.json(
            { error: "Coordinates must be an array of [longitude, latitude]." },
            { status: 400 }
          );
        }

        const [lng, lat] = coordinates;
        if (typeof lng !== "number" || typeof lat !== "number") {
          return NextResponse.json(
            { error: "Coordinates must be numbers." },
            { status: 400 }
          );
        }

        if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
          return NextResponse.json(
            {
              error:
                "Invalid coordinates. Longitude: -180 to 180, Latitude: -90 to 90.",
            },
            { status: 400 }
          );
        }

        userUpdate["location.coordinates"] = coordinates;
      }

      if (address !== undefined)
        userUpdate["location.address"] = address.trim();
      if (city !== undefined) userUpdate["location.city"] = city.trim();
      if (country !== undefined)
        userUpdate["location.country"] = country.trim();
    }

    // Update doctor profile
    if (Object.keys(doctorUpdate).length > 1) {
      // More than just updatedAt
      await Doctor.findOneAndUpdate({ userId: decoded.userId }, doctorUpdate);
    }

    // Update user profile
    if (Object.keys(userUpdate).length > 1) {
      // More than just updatedAt
      await User.findByIdAndUpdate(decoded.userId, userUpdate);
    }

    // Fetch updated clinic information
    const updatedDoctor = await Doctor.findOne({ userId: decoded.userId });
    const updatedUser = await User.findById(decoded.userId);

    const updatedClinicInfo = {
      clinicName: updatedDoctor?.clinicName,
      clinicAddress: updatedDoctor?.clinicAddress,
      workingHours: updatedDoctor?.workingHours,
      consultationFee: updatedDoctor?.consultationFee,
      contactInfo: {
        phone: updatedUser?.profile.phone,
        email: updatedUser?.email,
      },
      location: updatedUser?.location,
      specialization: updatedDoctor?.specialization,
      isActive: updatedDoctor?.isActive,
    };

    return NextResponse.json({
      message: "Clinic information updated successfully.",
      clinic: updatedClinicInfo,
    });
  } catch (error) {
    console.error("Update clinic info error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json(
      { error: "Internal server error: " + errorMessage },
      { status: 500 }
    );
  }
}
