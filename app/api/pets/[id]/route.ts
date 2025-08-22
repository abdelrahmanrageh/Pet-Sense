import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import dbConnect from "@/lib/mongodb";
import { Pet } from "@/models/Pet";
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

// GET /api/pets/[id] - Get specific pet details
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
)
{
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

    const pet = await Pet.findOne({
      _id: id,
      isActive: true,
    }).populate("ownerId", "profile.firstName profile.lastName email");

    if (!pet) {
      return NextResponse.json({ error: "Pet not found." }, { status: 404 });
    }

    // Check if user is the owner or a doctor with reservations for this pet
    const user = await User.findById(decoded.userId);
    const isOwner = pet.ownerId._id.toString() === decoded.userId;

    let hasAccess = isOwner;

    if (!isOwner && user?.userType === "doctor") {
      // Check if doctor has reservations with this pet
      const doctor = await Doctor.findOne({ userId: decoded.userId });
      if (doctor) {
        const hasReservation = await Reservation.findOne({
          doctorId: doctor._id,
          petId: id,
          status: { $in: ["confirmed", "in-progress", "completed"] },
        });
        hasAccess = !!hasReservation;
      }
    }

    if (!hasAccess) {
      return NextResponse.json(
        {
          error:
            "Access denied. You can only view pets you own or have treated.",
        },
        { status: 403 }
      );
    }

    return NextResponse.json({ pet });
  } catch (error) {
    console.error("Get pet error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}

// PUT /api/pets/[id] - Update pet information
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

    const pet = await Pet.findOne({
      _id: id,
      ownerId: decoded.userId,
      isActive: true,
    });

    if (!pet) {
      return NextResponse.json(
        {
          error: "Pet not found or you don't have permission to update it.",
        },
        { status: 404 }
      );
    }

    const body = await req.json();
    const {
      name,
      species,
      breed,
      age,
      weight,
      gender,
      color,
      microchipId,
      avatar,
      medicalHistory,
      emergencyContact,
    } = body;

    // Check if microchip ID is already used by another pet (if provided and changed)
    if (microchipId && microchipId !== pet.microchipId) {
      const existingPet = await Pet.findOne({
        microchipId,
        isActive: true,
        _id: { $ne: id },
      });
      if (existingPet) {
        return NextResponse.json(
          {
            error: "A pet with this microchip ID already exists.",
          },
          { status: 409 }
        );
      }
    }

    // Update pet information
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (species !== undefined) updateData.species = species;
    if (breed !== undefined) updateData.breed = breed;
    if (age !== undefined) updateData.age = age;
    if (weight !== undefined) updateData.weight = weight;
    if (gender !== undefined) updateData.gender = gender;
    if (color !== undefined) updateData.color = color;
    if (microchipId !== undefined) updateData.microchipId = microchipId;
    if (avatar !== undefined) updateData.avatar = avatar;

    if (medicalHistory) {
      updateData["medicalHistory.allergies"] =
        medicalHistory.allergies || pet.medicalHistory.allergies;
      updateData["medicalHistory.chronicConditions"] =
        medicalHistory.chronicConditions ||
        pet.medicalHistory.chronicConditions;
      updateData["medicalHistory.medications"] =
        medicalHistory.medications || pet.medicalHistory.medications;
      updateData["medicalHistory.vaccinations"] =
        medicalHistory.vaccinations || pet.medicalHistory.vaccinations;
      updateData["medicalHistory.surgeries"] =
        medicalHistory.surgeries || pet.medicalHistory.surgeries;
    }

    if (emergencyContact) {
      updateData["emergencyContact.name"] =
        emergencyContact.name || pet.emergencyContact.name;
      updateData["emergencyContact.phone"] =
        emergencyContact.phone || pet.emergencyContact.phone;
      updateData["emergencyContact.relation"] =
        emergencyContact.relation || pet.emergencyContact.relation;
    }

    const updatedPet = await Pet.findByIdAndUpdate(id, updateData, {
      new: true,
    });

    return NextResponse.json({
      message: "Pet updated successfully.",
      pet: updatedPet,
    });
  } catch (error) {
    console.error("Update pet error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}

// DELETE /api/pets/[id] - Soft delete pet (set isActive to false)
export async function DELETE(
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

    const pet = await Pet.findOne({
      _id: id,
      ownerId: decoded.userId,
      isActive: true,
    });

    if (!pet) {
      return NextResponse.json(
        {
          error: "Pet not found or you don't have permission to delete it.",
        },
        { status: 404 }
      );
    }

    // Soft delete - set isActive to false
    await Pet.findByIdAndUpdate(id, { isActive: false });

    return NextResponse.json({
      message: "Pet deleted successfully.",
    });
  } catch (error) {
    console.error("Delete pet error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
