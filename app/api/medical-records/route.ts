import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import dbConnect from "@/lib/mongodb";
import { MedicalRecord } from "@/models/Pet";
import { User, Doctor } from "@/models/User";
import { Pet } from "@/models/Pet";
import { Reservation } from "@/models/Reservation";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";

// Helper function to verify JWT token
function verifyToken(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET) as { email: string; userId: string };
  } catch {
    return null;
  }
}

// GET /api/medical-records - Get medical records (filtered by user permissions)
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
    const petId = searchParams.get("petId");
    const doctorId = searchParams.get("doctorId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");

    const user = await User.findById(decoded.userId);
    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const query: Record<string, unknown> = {};

    if (user.userType === "doctor") {
      // Doctors can see records for pets they have reservations with (current or past)
      const doctor = await Doctor.findOne({ userId: decoded.userId });
      if (!doctor) {
        return NextResponse.json(
          { error: "Doctor profile not found." },
          { status: 404 }
        );
      }

      if (petId) {
        // If specific pet is requested, check if doctor has/had reservations with this pet
        const hasReservation = await Reservation.findOne({
          doctorId: doctor._id,
          petId: petId,
          status: { $in: ["confirmed", "in-progress", "completed"] },
        });

        if (!hasReservation) {
          return NextResponse.json(
            {
              error:
                "You can only view medical records for pets you have treated or are treating.",
            },
            { status: 403 }
          );
        }
        query.petId = petId;
      } else {
        // Get all pets this doctor has reservations with
        const doctorReservations = await Reservation.find({
          doctorId: doctor._id,
          status: { $in: ["confirmed", "in-progress", "completed"] },
        }).distinct("petId");

        query.petId = { $in: doctorReservations };
      }
    } else {
      // Users can see records for their pets
      const userPets = await Pet.find({
        ownerId: decoded.userId,
        isActive: true,
      }).select("_id");
      const petIds = userPets.map((pet) => pet._id);
      query.petId = { $in: petIds };
    }

    // Additional filters
    if (petId) {
      if (user.userType === "user") {
        // Verify user owns this pet
        const pet = await Pet.findOne({
          _id: petId,
          ownerId: decoded.userId,
          isActive: true,
        });
        if (!pet) {
          return NextResponse.json(
            {
              error:
                "Pet not found or you don't have permission to view its records.",
            },
            { status: 403 }
          );
        }
      }
      query.petId = petId;
    }

    if (doctorId && user.userType === "user") {
      query.doctorId = doctorId;
    }

    const skip = (page - 1) * limit;

    const records = await MedicalRecord.find(query)
      .populate("petId", "name species breed")
      .populate({
        path: "doctorId",
        populate: {
          path: "userId",
          select: "profile",
        },
      })
      .populate("reservationId")
      .sort({ visitDate: -1 })
      .skip(skip)
      .limit(limit);

    const total = await MedicalRecord.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      records,
      pagination: {
        currentPage: page,
        totalPages,
        totalRecords: total,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("Get medical records error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}

// POST /api/medical-records - Create new medical record (doctors only)
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
          error: "Only doctors can create medical records.",
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
      petId,
      reservationId,
      visitDate,
      diagnosis,
      symptoms,
      treatment,
      medications,
      notes,
      followUpRequired,
      followUpDate,
      attachments,
    } = body;

    // Validate required fields
    if (!petId || !visitDate || !diagnosis || !treatment) {
      return NextResponse.json(
        {
          error: "Pet ID, visit date, diagnosis, and treatment are required.",
        },
        { status: 400 }
      );
    }

    // Verify pet exists
    const pet = await Pet.findById(petId);
    if (!pet || !pet.isActive) {
      return NextResponse.json({ error: "Pet not found." }, { status: 404 });
    }

    // Create medical record
    const medicalRecord = new MedicalRecord({
      petId,
      doctorId: doctor._id,
      reservationId: reservationId || undefined,
      visitDate: new Date(visitDate),
      diagnosis,
      symptoms: symptoms || [],
      treatment,
      medications: medications || [],
      notes: notes || "",
      followUpRequired: followUpRequired || false,
      followUpDate: followUpDate ? new Date(followUpDate) : undefined,
      attachments: attachments || [],
    });

    await medicalRecord.save();

    return NextResponse.json({
      message: "Medical record created successfully.",
      record: {
        id: medicalRecord._id,
        visitDate: medicalRecord.visitDate,
        diagnosis: medicalRecord.diagnosis,
        treatment: medicalRecord.treatment,
      },
    });
  } catch (error) {
    console.error("Create medical record error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
