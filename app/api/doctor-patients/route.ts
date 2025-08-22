import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import dbConnect from "@/lib/mongodb";
import { Pet, MedicalRecord } from "@/models/Pet";
import { User, Doctor } from "@/models/User";
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

// GET /api/doctor-patients - Get all pets that this doctor has treated or is treating
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
        {
          error: "Only doctors can access patient lists.",
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

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status"); // active, completed, all
    const search = searchParams.get("search"); // search by pet name or owner name
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");

    // Get all reservations for this doctor
    const reservationQuery: Record<string, unknown> = { doctorId: doctor._id };

    if (status === "active") {
      reservationQuery.status = { $in: ["confirmed", "in-progress"] };
    } else if (status === "completed") {
      reservationQuery.status = "completed";
    } else {
      // Default: all treated patients
      reservationQuery.status = {
        $in: ["confirmed", "in-progress", "completed"],
      };
    }

    const doctorReservations = await Reservation.find(
      reservationQuery
    ).distinct("petId");

    // Build pet query
    const petQuery: Record<string, unknown> = {
      _id: { $in: doctorReservations },
      isActive: true,
    };

    if (search) {
      petQuery.$or = [{ name: { $regex: search, $options: "i" } }];
    }

    const skip = (page - 1) * limit;

    // Get pets with their owners and latest medical records
    const pets = await Pet.find(petQuery)
      .populate("ownerId", "profile email phone")
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit);

    // Get additional data for each pet
    const petsWithDetails = await Promise.all(
      pets.map(async (pet) => {
        // Get latest reservation with this doctor
        const latestReservation = await Reservation.findOne({
          doctorId: doctor._id,
          petId: pet._id,
        }).sort({ appointmentDate: -1, appointmentTime: -1 });

        // Get latest medical record from this doctor
        const latestRecord = await MedicalRecord.findOne({
          doctorId: doctor._id,
          petId: pet._id,
        }).sort({ visitDate: -1 });

        // Get total visits with this doctor
        const totalVisits = await Reservation.countDocuments({
          doctorId: doctor._id,
          petId: pet._id,
          status: "completed",
        });

        // Get all medical records for this pet (from all doctors)
        const allRecordsCount = await MedicalRecord.countDocuments({
          petId: pet._id,
        });

        return {
          id: pet._id,
          name: pet.name,
          species: pet.species,
          breed: pet.breed,
          age: pet.age,
          weight: pet.weight,
          gender: pet.gender,
          avatar: pet.avatar,
          owner: {
            id: pet.ownerId._id,
            name: `${pet.ownerId.profile.firstName} ${pet.ownerId.profile.lastName}`,
            email: pet.ownerId.email,
            phone: pet.ownerId.profile.phone,
          },
          medicalSummary: {
            allergies: pet.medicalHistory.allergies,
            chronicConditions: pet.medicalHistory.chronicConditions,
            currentMedications: pet.medicalHistory.medications,
          },
          lastVisit: {
            date: latestReservation?.appointmentDate,
            status: latestReservation?.status,
            type: latestReservation?.type,
          },
          lastDiagnosis: latestRecord?.diagnosis,
          totalVisitsWithDoctor: totalVisits,
          totalMedicalRecords: allRecordsCount,
          needsFollowUp: latestRecord?.followUpRequired || false,
          followUpDate: latestRecord?.followUpDate,
        };
      })
    );

    const total = await Pet.countDocuments(petQuery);
    const totalPages = Math.ceil(total / limit);

    // Filter by owner name if search includes it (post-query filtering)
    let filteredPets = petsWithDetails;
    if (search) {
      filteredPets = petsWithDetails.filter(
        (pet) =>
          pet.name.toLowerCase().includes(search.toLowerCase()) ||
          pet.owner.name.toLowerCase().includes(search.toLowerCase())
      );
    }

    return NextResponse.json({
      patients: filteredPets,
      pagination: {
        currentPage: page,
        totalPages,
        totalPatients: total,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
      summary: {
        totalActivePatients: await Reservation.find({
          doctorId: doctor._id,
          status: { $in: ["confirmed", "in-progress"] },
        })
          .distinct("petId")
          .then((pets) => pets.length),
        totalTreatedPatients: doctorReservations.length,
        patientsNeedingFollowUp: filteredPets.filter((pet) => pet.needsFollowUp)
          .length,
      },
    });
  } catch (error) {
    console.error("Get doctor patients error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
