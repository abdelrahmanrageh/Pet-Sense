import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import dbConnect from "@/lib/mongodb";
import { Reservation, Availability } from "@/models/Reservation";
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

// GET /api/reservations/[id] - Get specific reservation
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    
    const { id } = await params;

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

    const reservation = await Reservation.findById(id)
      .populate("userId", "profile email")
      .populate("petId")
      .populate({
        path: "doctorId",
        populate: {
          path: "userId",
          select: "profile",
        },
      });

    if (!reservation) {
      return NextResponse.json(
        { error: "Reservation not found." },
        { status: 404 }
      );
    }

    const user = await User.findById(decoded.userId);

    // Check if user has permission to view this reservation
    const isOwner = reservation.userId._id.toString() === decoded.userId;
    const isDoctor =
      user?.userType === "doctor" &&
      reservation.doctorId.userId._id.toString() === decoded.userId;

    if (!isOwner && !isDoctor) {
      return NextResponse.json(
        {
          error: "Access denied. You can only view your own reservations.",
        },
        { status: 403 }
      );
    }

    return NextResponse.json({ reservation });
  } catch (error) {
    console.error("Get reservation error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}

// PUT /api/reservations/[id] - Update reservation status (doctors can update status, users can cancel)
export async function PUT(
  req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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

    const reservation = await Reservation.findById(id);
    if (!reservation) {
      return NextResponse.json(
        { error: "Reservation not found." },
        { status: 404 }
      );
    }

    const user = await User.findById(decoded.userId);
    const body = await req.json();
    const { status, cancellationReason } = body;

    const isOwner = reservation.userId.toString() === decoded.userId;
    const isDoctor = user?.userType === "doctor";

    if (isDoctor) {
      // Doctor can update reservation status
      const doctor = await Doctor.findOne({ userId: decoded.userId });
      if (
        !doctor ||
        reservation.doctorId.toString() !== doctor._id.toString()
      ) {
        return NextResponse.json(
          {
            error: "You can only update reservations assigned to you.",
          },
          { status: 403 }
        );
      }

      // Validate status transitions
      const allowedStatuses = [
        "confirmed",
        "in-progress",
        "completed",
        "no-show",
      ];
      if (!allowedStatuses.includes(status)) {
        return NextResponse.json(
          {
            error:
              "Invalid status. Allowed: confirmed, in-progress, completed, no-show",
          },
          { status: 400 }
        );
      }

      reservation.status = status;

      // Update doctor statistics when reservation is completed
      if (status === "completed") {
        await Doctor.findByIdAndUpdate(doctor._id, {
          $inc: {
            "statistics.completedReservations": 1,
            "statistics.totalPatients": 1,
          },
        });
      }
    } else if (isOwner && status === "cancelled") {
      // User can only cancel their own reservations
      if (
        reservation.status !== "pending" &&
        reservation.status !== "confirmed"
      ) {
        return NextResponse.json(
          {
            error: "You can only cancel pending or confirmed reservations.",
          },
          { status: 400 }
        );
      }

      reservation.status = "cancelled";
      reservation.cancellation = {
        cancelledBy: decoded.userId,
        cancelledAt: new Date(),
        reason: cancellationReason || "Cancelled by user",
      };

      // Free up the time slot
      await Availability.updateOne(
        {
          doctorId: reservation.doctorId,
          date: {
            $gte: new Date(
              reservation.appointmentDate.getFullYear(),
              reservation.appointmentDate.getMonth(),
              reservation.appointmentDate.getDate()
            ),
            $lt: new Date(
              reservation.appointmentDate.getFullYear(),
              reservation.appointmentDate.getMonth(),
              reservation.appointmentDate.getDate() + 1
            ),
          },
          "timeSlots.reservationId": reservation._id,
        },
        {
          $set: {
            "timeSlots.$.isAvailable": true,
            "timeSlots.$.reservationId": null,
          },
        }
      );
    } else {
      return NextResponse.json(
        {
          error: "Unauthorized action.",
        },
        { status: 403 }
      );
    }

    await reservation.save();

    return NextResponse.json({
      message: "Reservation updated successfully.",
      reservation: {
        id: reservation._id,
        status: reservation.status,
        appointmentDate: reservation.appointmentDate,
        appointmentTime: reservation.appointmentTime,
      },
    });
  } catch (error) {
    console.error("Update reservation error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
