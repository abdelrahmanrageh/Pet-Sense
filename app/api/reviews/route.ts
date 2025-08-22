import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import dbConnect from "@/lib/mongodb";
import { Review, Reservation } from "@/models/Reservation";
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

// GET /api/reviews - Get reviews (can filter by doctor)
export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const doctorId = searchParams.get("doctorId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const minRating = searchParams.get("minRating");

    const query: Record<string, unknown> = {};

    if (doctorId) {
      query.doctorId = doctorId;
    }

    if (minRating) {
      query.rating = { $gte: parseInt(minRating) };
    }

    const skip = (page - 1) * limit;

    const reviews = await Review.find(query)
      .populate("userId", "profile")
      .populate({
        path: "doctorId",
        populate: {
          path: "userId",
          select: "profile",
        },
      })
      .populate("reservationId", "appointmentDate type")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Review.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    // Calculate average rating if filtering by doctor
    let averageRating = null;
    if (doctorId) {
      const ratingStats = await Review.aggregate([
        { $match: { doctorId: doctorId } },
        {
          $group: {
            _id: null,
            averageRating: { $avg: "$rating" },
            totalReviews: { $sum: 1 },
            ratingDistribution: {
              $push: "$rating",
            },
          },
        },
      ]);

      if (ratingStats.length > 0) {
        averageRating = {
          average: Math.round(ratingStats[0].averageRating * 10) / 10,
          total: ratingStats[0].totalReviews,
          distribution: ratingStats[0].ratingDistribution.reduce(
            (acc: Record<string, number>, rating: number) => {
              acc[rating] = (acc[rating] || 0) + 1;
              return acc;
            },
            {}
          ),
        };
      }
    }

    return NextResponse.json({
      reviews,
      pagination: {
        currentPage: page,
        totalPages,
        totalReviews: total,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
      averageRating,
    });
  } catch (error) {
    console.error("Get reviews error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}

// POST /api/reviews - Create a new review (users only, after completed reservation)
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
          error: "Only users can write reviews.",
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { reservationId, rating, comment, categories } = body;

    // Validate required fields
    if (!reservationId || !rating || !categories) {
      return NextResponse.json(
        {
          error: "Reservation ID, rating, and categories are required.",
        },
        { status: 400 }
      );
    }

    // Validate rating values
    if (
      rating < 1 ||
      rating > 5 ||
      !categories.communication ||
      !categories.professionalism ||
      !categories.facilities ||
      !categories.overall
    ) {
      return NextResponse.json(
        {
          error: "All ratings must be between 1 and 5.",
        },
        { status: 400 }
      );
    }

    // Verify reservation exists and belongs to user
    const reservation = await Reservation.findOne({
      _id: reservationId,
      userId: decoded.userId,
      status: "completed",
    });

    if (!reservation) {
      return NextResponse.json(
        {
          error: "Reservation not found, not yours, or not completed yet.",
        },
        { status: 404 }
      );
    }

    // Check if review already exists for this reservation
    const existingReview = await Review.findOne({ reservationId });
    if (existingReview) {
      return NextResponse.json(
        {
          error: "You have already reviewed this reservation.",
        },
        { status: 409 }
      );
    }

    // Create review
    const review = new Review({
      reservationId,
      userId: decoded.userId,
      doctorId: reservation.doctorId,
      rating,
      comment: comment || "",
      categories: {
        communication: categories.communication,
        professionalism: categories.professionalism,
        facilities: categories.facilities,
        overall: categories.overall,
      },
    });

    await review.save();

    // Update doctor's rating statistics
    const doctorReviews = await Review.find({ doctorId: reservation.doctorId });
    const totalReviews = doctorReviews.length;
    const averageRating =
      doctorReviews.reduce((sum, rev) => sum + rev.rating, 0) / totalReviews;

    await Doctor.findByIdAndUpdate(reservation.doctorId, {
      "rating.average": Math.round(averageRating * 10) / 10,
      "rating.totalReviews": totalReviews,
    });

    return NextResponse.json({
      message: "Review submitted successfully.",
      review: {
        id: review._id,
        rating: review.rating,
        comment: review.comment,
        categories: review.categories,
      },
    });
  } catch (error) {
    console.error("Create review error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
