import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import dbConnect from "@/lib/mongodb";
import { Reservation, Availability } from "@/models/Reservation";
import { User, Doctor } from "@/models/User";
import { Pet } from "@/models/Pet";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";

// Helper function to verify JWT token
function verifyToken(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET) as { email: string; userId: string };
  } catch {
    return null;
  }
}

// GET /api/reservations - Get reservations (different view for users vs doctors)
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

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");

    const user = await User.findById(decoded.userId);
    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const query: Record<string, unknown> = {};
    let populateFields = "";

    if (user.userType === "doctor") {
      // Doctor view: get reservations for this doctor
      const doctor = await Doctor.findOne({ userId: decoded.userId });
      if (!doctor) {
        return NextResponse.json(
          { error: "Doctor profile not found." },
          { status: 404 }
        );
      }
      query.doctorId = doctor._id;
      populateFields = "userId petId";
    } else {
      // User view: get reservations made by this user
      query.userId = decoded.userId;
      populateFields = "doctorId petId";
    }

    if (status) {
      query.status = status;
    }

    const skip = (page - 1) * limit;

    const reservations = await Reservation.find(query)
      .populate(populateFields)
      .populate({
        path: "doctorId",
        populate: {
          path: "userId",
          select: "profile",
        },
      })
      .sort({ appointmentDate: -1, appointmentTime: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Reservation.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      reservations,
      pagination: {
        currentPage: page,
        totalPages,
        totalReservations: total,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("Get reservations error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}

// POST /api/reservations - Create a new reservation
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
    if (!user || user.userType !== "user") {
      return NextResponse.json(
        {
          error: "Only regular users can make reservations.",
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      doctorId,
      petId,
      appointmentDate,
      appointmentTime,
      type,
      reason,
      symptoms,
      urgency,
      notes,
    } = body;

    // Validate required fields
    if (
      !doctorId ||
      !petId ||
      !appointmentDate ||
      !appointmentTime ||
      !type ||
      !reason
    ) {
      return NextResponse.json(
        {
          error:
            "Doctor, pet, appointment date, time, type, and reason are required.",
        },
        { status: 400 }
      );
    }

    // Verify doctor exists and is active
    const doctor = await Doctor.findById(doctorId).populate("userId");
    if (!doctor || !doctor.isActive || !doctor.isVerified) {
      return NextResponse.json(
        { error: "Doctor not found or not available." },
        { status: 404 }
      );
    }

    // Verify pet belongs to user
    const pet = await Pet.findOne({
      _id: petId,
      ownerId: decoded.userId,
      isActive: true,
    });
    if (!pet) {
      return NextResponse.json(
        {
          error:
            "Pet not found or you don't have permission to book for this pet.",
        },
        { status: 404 }
      );
    }

    // Check if the requested time slot is available
    const requestedDate = new Date(appointmentDate);
    const availability = await Availability.findOne({
      doctorId,
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

    if (!availability || !availability.isWorkingDay) {
      return NextResponse.json(
        {
          error: "Doctor is not available on the selected date.",
        },
        { status: 400 }
      );
    }

    // Check if specific time slot is available
    const timeSlot = availability.timeSlots.find(
      (slot: {
        startTime: string;
        isAvailable: boolean;
        reservationId?: unknown;
      }) =>
        slot.startTime === appointmentTime &&
        slot.isAvailable &&
        !slot.reservationId
    );

    if (!timeSlot) {
      return NextResponse.json(
        {
          error: "The selected time slot is not available.",
        },
        { status: 400 }
      );
    }

    // Create reservation
    const reservation = new Reservation({
      userId: decoded.userId,
      doctorId,
      petId,
      appointmentDate: requestedDate,
      appointmentTime,
      type,
      reason,
      symptoms: symptoms || [],
      urgency: urgency || "medium",
      notes: notes || "",
      fees: {
        consultationFee: doctor.consultationFee,
        additionalCharges: 0,
        totalAmount: doctor.consultationFee,
        paymentStatus: "pending",
      },
    });

    await reservation.save();

    // Update availability - mark time slot as booked
    await Availability.updateOne(
      {
        _id: availability._id,
        "timeSlots.startTime": appointmentTime,
      },
      {
        $set: {
          "timeSlots.$.isAvailable": false,
          "timeSlots.$.reservationId": reservation._id,
        },
      }
    );

    // Update doctor statistics
    await Doctor.findByIdAndUpdate(doctorId, {
      $inc: { "statistics.totalReservations": 1 },
    });

    return NextResponse.json({
      message: "Reservation created successfully.",
      reservation: {
        id: reservation._id,
        appointmentDate: reservation.appointmentDate,
        appointmentTime: reservation.appointmentTime,
        status: reservation.status,
        type: reservation.type,
        totalAmount: reservation.fees.totalAmount,
      },
    });
  } catch (error) {
    console.error("Create reservation error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
