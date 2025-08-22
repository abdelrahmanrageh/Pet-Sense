import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { Doctor } from "@/models/User";

// GET /api/doctors - Browse and search doctors
export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");
    const specialization = searchParams.get("specialization");
    const city = searchParams.get("city");
    const minRating = searchParams.get("minRating");
    const sortBy = searchParams.get("sortBy") || "rating"; // rating, experience, fee
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");

    // Build search query
    const query: Record<string, unknown> = {
      isActive: true,
      isVerified: true,
    };

    // Text search in clinic name or bio
    if (search) {
      query.$or = [
        { clinicName: { $regex: search, $options: "i" } }, // Search in clinic name, option 'i' for case-insensitive
        { bio: { $regex: search, $options: "i" } },
      ];
    }

    // Filter by specialization
    if (specialization) {
      query.specialization = { $in: [new RegExp(specialization, "i")] };
    }

    // Filter by minimum rating
    if (minRating) {
      query["rating.average"] = { $gte: parseFloat(minRating) };
    }

    // Build sort options
    let sortOptions: Record<string, 1 | -1> = {};
    switch (sortBy) {
      case "rating":
        sortOptions = { "rating.average": -1, "rating.totalReviews": -1 };
        break;
      case "experience":
        sortOptions = { experience: -1 };
        break;
      case "fee":
        sortOptions = { consultationFee: 1 };
        break;
      default:
        sortOptions = { "rating.average": -1 };
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Get doctors with user information
    const doctors = await Doctor.find(query)
      .populate("userId", "profile location")
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .select("-__v");

    const total = await Doctor.countDocuments(query);

    // Filter by city if specified (post-query filtering)
    let filteredDoctors = doctors;
    if (city) {
      filteredDoctors = doctors.filter((doctor) =>
        doctor.userId?.location?.city
          ?.toLowerCase()
          .includes(city.toLowerCase())
      );
    }

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      doctors: filteredDoctors,
      pagination: {
        currentPage: page,
        totalPages,
        totalDoctors: total,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
      filters: {
        search,
        specialization,
        city,
        minRating,
        sortBy,
      },
    });
  } catch (error) {
    console.error("Get doctors error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}

// GET /api/doctors/specializations - Get all available specializations
export async function POST() {
  try {
    await dbConnect();

    const specializations = await Doctor.distinct("specialization", {
      isActive: true,
      isVerified: true,
    });

    return NextResponse.json({ specializations });
  } catch (error) {
    console.error("Get specializations error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
