import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import dbConnect from "@/lib/mongodb";
import { Availability } from "@/models/Reservation";
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

// Helper function to generate time slots
function generateTimeSlots(
  startTime: string,
  endTime: string,
  slotDuration: number = 30
) {
  const slots = [];
  const start = new Date(`2000-01-01T${startTime}:00`);
  const end = new Date(`2000-01-01T${endTime}:00`);

  while (start < end) {
    const startTimeStr = start.toTimeString().slice(0, 5); // slice to get HH:MM
    start.setMinutes(start.getMinutes() + slotDuration);
    const endTimeStr = start.toTimeString().slice(0, 5);

    if (start <= end) {
      slots.push({
        startTime: startTimeStr,
        endTime: endTimeStr,
        isAvailable: true,
      });
    }
  }

  return slots; // as: [{ startTime: "09:00", endTime: "09:30", isAvailable: true }, ...]
}

// GET /api/availability - Get doctor's availability or search for available doctors
export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const doctorId = searchParams.get("doctorId");
    const date = searchParams.get("date");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (doctorId) {
      // Get specific doctor's availability
      const query: Record<string, unknown> = { doctorId };

      if (date) {
        const requestedDate = new Date(date);
        query.date = {
          $gte: new Date(
            requestedDate.getFullYear(),
            requestedDate.getMonth(),
            requestedDate.getDate()
          ),
          $lt: new Date(
            requestedDate.getFullYear(),
            requestedDate.getMonth(),
            requestedDate.getDate() + 1
          ),
        };
      } else if (startDate && endDate) {
        query.date = {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        };
      } else {
        // Default: get next 30 days
        const today = new Date();
        const thirtyDaysLater = new Date();
        thirtyDaysLater.setDate(today.getDate() + 30);
        query.date = {
          $gte: today,
          $lte: thirtyDaysLater,
        };
      }

      const availability = await Availability.find(query)
        .sort({ date: 1 })
        .populate("doctorId", "clinicName consultationFee");

      return NextResponse.json({ availability });
    } else {
      return NextResponse.json(
        { error: "Doctor ID is required." },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Get availability error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}

// POST /api/availability - Create or update doctor's availability (doctors only)
export async function POST(req: NextRequest) {
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
        {
          error: "Only doctors can manage availability.",
        },
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
      date,
      timeSlots,
      isWorkingDay,
      specialNotes,
      generateFromWorkingHours,
    } = body;

    if (!date) {
      return NextResponse.json({ error: "Date is required." }, { status: 400 });
    }

    const requestedDate = new Date(date);

    // Check if availability already exists for this date
    let availability = await Availability.findOne({
      doctorId: doctor._id,
      date: {
        $gte: new Date(
          requestedDate.getFullYear(),
          requestedDate.getMonth(),
          requestedDate.getDate()
        ),
        $lt: new Date(
          requestedDate.getFullYear(),
          requestedDate.getMonth(),
          requestedDate.getDate() + 1
        ),
      },
    });

    if (generateFromWorkingHours && isWorkingDay !== false) {
      // Generate time slots from doctor's working hours
      const dayName = requestedDate.toLocaleDateString("en-US", {
        weekday: "long",
      });
      const workingHour = doctor.workingHours.find(
        (wh: {
          day: string;
          isAvailable: boolean;
          startTime: string;
          endTime: string;
        }) => wh.day === dayName && wh.isAvailable
      );

      if (workingHour) {
        const generatedSlots = generateTimeSlots(
          workingHour.startTime,
          workingHour.endTime
        );

        if (availability) {
          // Update existing availability
          availability.timeSlots = generatedSlots;
          availability.isWorkingDay = true;
          availability.specialNotes = specialNotes || "";
        } else {
          // Create new availability
          availability = new Availability({
            doctorId: doctor._id,
            date: requestedDate,
            timeSlots: generatedSlots,
            isWorkingDay: true,
            specialNotes: specialNotes || "",
          });
        }
      } else {
        return NextResponse.json(
          {
            error: "No working hours defined for this day.",
          },
          { status: 400 }
        );
      }
    } else {
      // Use provided time slots or mark as non-working day
      if (availability) {
        availability.timeSlots = timeSlots || [];
        availability.isWorkingDay = isWorkingDay !== false;
        availability.specialNotes = specialNotes || "";
      } else {
        availability = new Availability({
          doctorId: doctor._id,
          date: requestedDate,
          timeSlots: timeSlots || [],
          isWorkingDay: isWorkingDay !== false,
          specialNotes: specialNotes || "",
        });
      }
    }

    await availability.save();

    return NextResponse.json({
      message: "Availability updated successfully.",
      availability,
    });
  } catch (error) {
    console.error("Create/Update availability error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
