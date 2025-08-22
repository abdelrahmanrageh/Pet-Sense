import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import dbConnect from "@/lib/mongodb";
import { Reservation, Review } from "@/models/Reservation";
import { User, Doctor } from "@/models/User";
import { Pet, MedicalRecord } from "@/models/Pet";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";

// Helper function to verify JWT token
function verifyToken(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET) as { email: string; userId: string };
  } catch {
    return null;
  }
}

// GET /api/dashboard - Get dashboard analytics based on user type
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
    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    if (user.userType === "doctor") {
      // Doctor Dashboard
      const doctor = await Doctor.findOne({ userId: decoded.userId });
      if (!doctor) {
        return NextResponse.json(
          { error: "Doctor profile not found." },
          { status: 404 }
        );
      }

      // Get reservation statistics
      const reservationStats = await Reservation.aggregate([
        { $match: { doctorId: doctor._id } },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]);

      // Get monthly revenue (last 6 months)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const monthlyRevenue = await Reservation.aggregate([
        {
          $match: {
            doctorId: doctor._id,
            appointmentDate: { $gte: sixMonthsAgo },
            status: { $in: ["completed"] },
            "fees.paymentStatus": "paid",
          },
        },
        {
          $group: {
            _id: {
              year: { $year: "$appointmentDate" },
              month: { $month: "$appointmentDate" },
            },
            revenue: { $sum: "$fees.totalAmount" },
            count: { $sum: 1 },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
      ]);

      // Get upcoming appointments (next 7 days)
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);

      const upcomingAppointments = await Reservation.find({
        doctorId: doctor._id,
        appointmentDate: {
          $gte: new Date(),
          $lte: nextWeek,
        },
        status: { $in: ["confirmed", "pending"] },
      })
        .populate("userId", "profile")
        .populate("petId", "name species")
        .sort({ appointmentDate: 1, appointmentTime: 1 })
        .limit(10);

      // Get recent reviews
      const recentReviews = await Review.find({ doctorId: doctor._id })
        .populate("userId", "profile")
        .sort({ createdAt: -1 })
        .limit(5);

      // Get top treated species
      const topSpecies = await Reservation.aggregate([
        { $match: { doctorId: doctor._id, status: "completed" } },
        {
          $lookup: {
            from: "pets",
            localField: "petId",
            foreignField: "_id",
            as: "pet",
          },
        },
        { $unwind: "$pet" },
        {
          $group: {
            _id: "$pet.species",
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]);

      return NextResponse.json({
        userType: "doctor",
        profile: {
          name: `${user.profile.firstName} ${user.profile.lastName}`,
          clinicName: doctor.clinicName,
          specialization: doctor.specialization,
          rating: doctor.rating,
        },
        statistics: doctor.statistics,
        reservationStats: reservationStats.reduce(
          (acc: Record<string, number>, stat) => {
            acc[stat._id] = stat.count;
            return acc;
          },
          {}
        ),
        monthlyRevenue,
        upcomingAppointments,
        recentReviews,
        topSpecies,
      });
    } else {
      // User Dashboard
      const userPets = await Pet.find({
        ownerId: decoded.userId,
        isActive: true,
      });
      const petIds = userPets.map((pet) => pet._id);

      // Get reservation statistics
      const reservationStats = await Reservation.aggregate([
        { $match: { userId: decoded.userId } },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]);

      // Get upcoming appointments
      const upcomingAppointments = await Reservation.find({
        userId: decoded.userId,
        appointmentDate: { $gte: new Date() },
        status: { $in: ["confirmed", "pending"] },
      })
        .populate({
          path: "doctorId",
          populate: {
            path: "userId",
            select: "profile",
          },
        })
        .populate("petId", "name species")
        .sort({ appointmentDate: 1, appointmentTime: 1 })
        .limit(5);

      // Get recent medical records
      const recentMedicalRecords = await MedicalRecord.find({
        petId: { $in: petIds },
      })
        .populate("petId", "name species")
        .populate({
          path: "doctorId",
          populate: {
            path: "userId",
            select: "profile",
          },
        })
        .sort({ visitDate: -1 })
        .limit(5);

      // Get pets needing attention (due vaccinations, etc.)
      const petsNeedingAttention = userPets.filter((pet) => {
        const now = new Date();
        return pet.medicalHistory.vaccinations.some(
          (vaccination: { nextDue?: Date }) => {
            if (vaccination.nextDue) {
              const dueDate = new Date(vaccination.nextDue);
              const daysDiff = Math.ceil(
                (dueDate.getTime() - now.getTime()) / (1000 * 3600 * 24)
              );
              return daysDiff <= 30 && daysDiff >= 0; // Due in next 30 days
            }
            return false;
          }
        );
      });

      // Get total spending
      const totalSpending = await Reservation.aggregate([
        {
          $match: {
            userId: decoded.userId,
            "fees.paymentStatus": "paid",
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$fees.totalAmount" },
          },
        },
      ]);

      return NextResponse.json({
        userType: "user",
        profile: {
          name: `${user.profile.firstName} ${user.profile.lastName}`,
          email: user.email,
        },
        statistics: {
          totalPets: userPets.length,
          totalReservations: reservationStats.reduce(
            (sum, stat) => sum + stat.count,
            0
          ),
          totalSpending: totalSpending.length > 0 ? totalSpending[0].total : 0,
        },
        pets: userPets.map((pet) => ({
          id: pet._id,
          name: pet.name,
          species: pet.species,
          breed: pet.breed,
          age: pet.age,
          avatar: pet.avatar,
        })),
        reservationStats: reservationStats.reduce(
          (acc: Record<string, number>, stat) => {
            acc[stat._id] = stat.count;
            return acc;
          },
          {}
        ),
        upcomingAppointments,
        recentMedicalRecords,
        petsNeedingAttention: petsNeedingAttention.map((pet) => ({
          id: pet._id,
          name: pet.name,
          species: pet.species,
          alerts: pet.medicalHistory.vaccinations
            .filter((v: { nextDue?: Date }) => {
              if (v.nextDue) {
                const daysDiff = Math.ceil(
                  (new Date(v.nextDue).getTime() - new Date().getTime()) /
                    (1000 * 3600 * 24)
                );
                return daysDiff <= 30 && daysDiff >= 0;
              }
              return false;
            })
            .map((v: { name: string; nextDue?: Date }) => ({
              type: "vaccination",
              name: v.name,
              dueDate: v.nextDue,
            })),
        })),
      });
    }
  } catch (error) {
    console.error("Dashboard error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
