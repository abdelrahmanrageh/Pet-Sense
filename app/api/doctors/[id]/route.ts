import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { Doctor } from "@/models/User";
import { Review } from "@/models/Reservation";

// GET /api/doctors/[id] - Get detailed doctor profile
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();

    const doctor = await Doctor.findById(params.id)
      .populate("userId", "profile location")
      .select("-__v");

    if (!doctor || !doctor.isActive || !doctor.isVerified) {
      return NextResponse.json({ error: "Doctor not found." }, { status: 404 });
    }

    // Get recent reviews
    const reviews = await Review.find({ doctorId: params.id })
      .populate("userId", "profile")
      .sort({ createdAt: -1 })
      .limit(10);

    // Get rating distribution
    const ratingDistribution = await Review.aggregate([
      { $match: { doctorId: params.id } },
      {
        $group: {
          _id: "$rating",
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const ratingStats = ratingDistribution.reduce(
      (acc: Record<string, number>, item) => {
        acc[item._id] = item.count;
        return acc;
      },
      {}
    );

    return NextResponse.json({
      doctor: {
        id: doctor._id,
        profile: doctor.userId.profile,
        location: doctor.userId.location,
        licenseNumber: doctor.licenseNumber,
        specialization: doctor.specialization,
        experience: doctor.experience,
        clinicName: doctor.clinicName,
        clinicAddress: doctor.clinicAddress,
        workingHours: doctor.workingHours,
        consultationFee: doctor.consultationFee,
        bio: doctor.bio,
        education: doctor.education,
        certificates: doctor.certificates,
        rating: doctor.rating,
        statistics: doctor.statistics,
        ratingStats,
      },
      reviews,
    });
  } catch (error) {
    console.error("Get doctor profile error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
