import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import dbConnect from "@/lib/mongodb";
import { User, Doctor, VerificationCode } from "@/models/User";

export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    if (!req.body) {
      return NextResponse.json(
        { error: "Request body is required." },
        { status: 400 }
      );
    }
    const body = await req.json();
    const { email, password, userType, profile, location, doctorInfo } = body;

    // Validate required fields
    if (!email || !password || !userType || !profile) {
      return NextResponse.json(
        { error: "Email, password, userType, and profile are required." },
        { status: 400 }
      );
    }

    if (!profile.firstName || !profile.lastName) {
      return NextResponse.json(
        { error: "First name and last name are required." },
        { status: 400 }
      );
    }

    // Check if email is already in use
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { error: "Email is already in use." },
        { status: 409 }
      );
    }

    if (userType !== "user" && userType !== "doctor") {
      return NextResponse.json(
        { error: "User Type should be either 'user' or 'doctor'." },
        { status: 400 }
      );
    }

    // For doctors, validate additional required fields
    if (userType === "doctor" && !doctorInfo) {
      return NextResponse.json(
        { error: "Doctor information is required for doctor accounts." },
        { status: 400 }
      );
    }

    

    if (userType === "doctor" && doctorInfo) {
      const requiredDoctorFields = [
        "licenseNumber",
        "specialization",
        "experience",
        "clinicName",
        "clinicAddress",
        "consultationFee",
      ];

      for (const field of requiredDoctorFields) {
        if (!doctorInfo[field]) {
          return NextResponse.json(
            { error: `${field} is required for doctor accounts.` },
            { status: 400 }
          );
        }
      }
    }

    // Check if doctor's license number already exists
    if (userType === "doctor" && doctorInfo) {
      const existingDoctor = await Doctor.findOne({
        licenseNumber: doctorInfo.licenseNumber,
      });
      if (existingDoctor) {
        return NextResponse.json(
          { error: "A doctor with this license number already exists." },
          { status: 409 }
        );
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = new User({
      email,
      password: hashedPassword,
      userType,
      isVerified: true, // Set to true for testing purposes 
      profile: {
        firstName: profile.firstName,
        lastName: profile.lastName,
        phone: profile.phone,
        avatar: profile.avatar,
      },
      location: location || undefined,
    });
    await user.save();

    // If user is a doctor, create doctor profile
    if (userType === "doctor" && doctorInfo) {
      const doctor = new Doctor({
        userId: user._id,
        licenseNumber: doctorInfo.licenseNumber,
        specialization: doctorInfo.specialization,
        experience: doctorInfo.experience,
        clinicName: doctorInfo.clinicName,
        clinicAddress: doctorInfo.clinicAddress,
        isVerified: true,
        workingHours: doctorInfo.workingHours || [],
        consultationFee: doctorInfo.consultationFee,
        bio: doctorInfo.bio || "",
        education: doctorInfo.education || [],
        certificates: doctorInfo.certificates || [],
      });
      await doctor.save();
    }

    // Generate verification code
    const verificationCode = Math.floor(
      100000 + Math.random() * 900000
    ).toString();

    // Hash the verification code before storing
    const hashedVerificationCode = await bcrypt.hash(verificationCode, 10);

    await VerificationCode.create({
      email,
      code: hashedVerificationCode,
    });

    // // In a real app, send verification email here
    // console.log(`Verification code for ${email}: ${verificationCode}`);

    return NextResponse.json({
      message: "Signup successful. ",
      userType,
      verificationCode, // Remove this in production
    });
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Internal server error.: " + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}
