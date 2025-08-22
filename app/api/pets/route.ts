import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import dbConnect from "@/lib/mongodb";
import { Pet } from "@/models/Pet";
import { User } from "@/models/User";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";

// Helper function to verify JWT token
function verifyToken(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET) as { email: string; userId: string };
  } catch {
    return null;
  }
}

// GET /api/pets - Get all pets for authenticated user
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

    const pets = await Pet.find({
      ownerId: decoded.userId,
      isActive: true,
    }).sort({ createdAt: -1 });

    return NextResponse.json({ pets });
  } catch (error) {
    console.error("Get pets error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}

// POST /api/pets - Create a new pet
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

    // Verify user exists and is not a doctor (only regular users can own pets)
    const user = await User.findById(decoded.userId);
    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    if (user.userType === "doctor") {
      return NextResponse.json(
        {
          error:
            "Doctors cannot register pets. Only regular users can own pets.",
        },
        { status: 403 }
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

    // Validate required fields
    if (
      !name ||
      !species ||
      !breed ||
      age === undefined ||
      weight === undefined ||
      !gender ||
      !color
    ) {
      return NextResponse.json(
        {
          error:
            "Name, species, breed, age, weight, gender, and color are required.",
        },
        { status: 400 }
      );
    }

    // Validate emergency contact
    if (
      !emergencyContact?.name ||
      !emergencyContact?.phone ||
      !emergencyContact?.relation
    ) {
      return NextResponse.json(
        {
          error:
            "Emergency contact information (name, phone, relation) is required.",
        },
        { status: 400 }
      );
    }

    // Check if microchip ID is already used (if provided)
    if (microchipId) {
      const existingPet = await Pet.findOne({ microchipId, isActive: true });
      if (existingPet) {
        return NextResponse.json(
          {
            error: "A pet with this microchip ID already exists.",
          },
          { status: 409 }
        );
      }
    }

    const pet = new Pet({
      ownerId: decoded.userId,
      name,
      species,
      breed,
      age,
      weight,
      gender,
      color,
      microchipId: microchipId || undefined,
      avatar: avatar || undefined,
      medicalHistory: {
        allergies: medicalHistory?.allergies || [],
        chronicConditions: medicalHistory?.chronicConditions || [],
        medications: medicalHistory?.medications || [],
        vaccinations: medicalHistory?.vaccinations || [],
        surgeries: medicalHistory?.surgeries || [],
      },
      emergencyContact: {
        name: emergencyContact.name,
        phone: emergencyContact.phone,
        relation: emergencyContact.relation,
      },
    });

    await pet.save();

    return NextResponse.json({
      message: "Pet registered successfully.",
      pet: {
        id: pet._id,
        name: pet.name,
        species: pet.species,
        breed: pet.breed,
        age: pet.age,
        weight: pet.weight,
        gender: pet.gender,
        color: pet.color,
        avatar: pet.avatar,
        microchipId: pet.microchipId,
      },
    });
  } catch (error) {
    console.error("Create pet error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
