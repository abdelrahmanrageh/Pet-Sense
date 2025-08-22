# Pet Sense Digital Platform Backend API

A comprehensive Next.js-based backend API for a digital pet hospital platform. This system supports both pet owners and veterinarians with features including appointment booking, medical records management, doctor discovery, and comprehensive analytics.

## 🚀 Features

### Authentication & User Management

- **Dual User Types**: Support for regular users (pet owners) and doctors
- **Secure Authentication**: JWT-based login system with role-based access control
- **Email Verification**: Time-expiring verification codes
- **Doctor Profiles**: Specialized profiles with medical credentials and availability

### Pet Management

- **Pet Profiles**: Comprehensive pet information with medical history
- **Medical Records**: Full medical history tracking across multiple doctors
- **Vaccination Tracking**: Automated vaccination reminders and schedules
- **Photo Management**: Pet avatar and medical photo storage

### Doctor & Clinic Features

- **Doctor Discovery**: Location-based doctor search with filtering
- **Availability Management**: Real-time availability tracking
- **Patient Management**: Comprehensive patient overview for treating doctors
- **Medical Continuity**: Access to complete patient history from all treating doctors

### Appointment System

- **Reservation Management**: Complete booking lifecycle management
- **Status Tracking**: Real-time status updates (pending, confirmed, in-progress, completed)
- **Time Slot Management**: Intelligent scheduling with availability checking
- **Emergency Bookings**: Priority booking system for urgent cases

### Reviews & Ratings

- **Multi-Category Reviews**: Separate ratings for service, professionalism, facility, and communication
- **Verified Reviews**: Only patients who completed appointments can review
- **Doctor Reputation**: Comprehensive rating system with detailed feedback

### Analytics & Dashboard

- **Pet Owner Dashboard**: Pet health tracking, upcoming appointments, vaccination alerts
- **Doctor Dashboard**: Patient statistics, revenue tracking, appointment management
- **Advanced Analytics**: Comprehensive insights for both user types

### Security & Permissions

- **Role-Based Access**: Strict permission system ensuring data privacy
- **Medical Record Access**: Doctors can access complete patient history for proper treatment
- **Data Encryption**: Secure storage of sensitive medical information

## 📋 Prerequisites

- Node.js 18+
- MongoDB database
- npm or yarn package manager

## ⚙️ Installation & Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/abdelrahmanrageh/Pet-Sense.git
   cd Pet-Sense
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Environment Configuration**

   Create a `.env.local` file in the root directory:

   ```env
   # MongoDB Connection String
   MONGODB_URI=your_mongodb_connection_string_here

   # JWT Secret Key (generate a strong random string for production)
   JWT_SECRET=your_jwt_secret_key_here
   ```

4. **Start the development server**

   ```bash
   npm run dev
   ```

   The API will be available at `http://localhost:3000`

## 📖 API Documentation

### Authentication Endpoints

#### 1. User/Doctor Registration

**Endpoint:** `POST /api/auth/signup`

**Description:** Register a new user or doctor account

**Request Body for Regular User:**

```json
{
  "email": "user@example.com", // Required
  "password": "securePassword123", // Required
  "userType": "user", // Required: "user" or "doctor"
  "profile": {
    // Required object
    "firstName": "John", // Required
    "lastName": "Doe", // Required
    "phone": "+1234567890", // Optional
    "avatar": "https://example.com/avatar.jpg" // Optional
  },
  "location": {
    // Optional object
    "coordinates": [-74.006, 40.7128], // Optional: [longitude, latitude]
    "address": "123 Main St, New York, NY", // Optional
    "city": "New York", // Optional
    "country": "USA" // Optional
  }
}
```

**Request Body for Doctor Registration:**

```json
{
  "email": "doctor@example.com", // Required
  "password": "securePassword123", // Required
  "userType": "doctor", // Required: must be "doctor"
  "profile": {
    // Required object
    "firstName": "Dr. Sarah", // Required
    "lastName": "Smith", // Required
    "phone": "+1987654321", // Optional
    "avatar": "https://example.com/doctor-avatar.jpg" // Optional
  },
  "location": {
    // Optional object
    "coordinates": [-118.2437, 34.0522], // Optional: [longitude, latitude]
    "address": "456 Medical Plaza, Los Angeles, CA", // Optional
    "city": "Los Angeles", // Optional
    "country": "USA" // Optional
  },
  "doctorInfo": {
    // Required for doctors
    "licenseNumber": "VET123456789", // Required - must be unique
    "specialization": ["General Practice", "Surgery"], // Required - array of strings
    "experience": 15, // Required - number (years)
    "clinicName": "Happy Pets Veterinary Clinic", // Required
    "clinicAddress": "456 Medical Plaza, Los Angeles, CA 90210", // Required
    "consultationFee": 150, // Required - number (minimum 0)

    // Optional doctor fields:
    "workingHours": [
      // Optional array
      {
        "day": "Monday", // Must be valid day name
        "startTime": "09:00", // Time format HH:MM
        "endTime": "17:00", // Time format HH:MM
        "isAvailable": true // Boolean, defaults to true
      },
      {
        "day": "Tuesday",
        "startTime": "09:00",
        "endTime": "17:00",
        "isAvailable": true
      }
      // ... more days
    ],
    "bio": "Experienced veterinarian with 15 years...", // Optional - max 1000 characters
    "education": [
      // Optional array of strings
      "DVM from University of California, Davis",
      "Bachelor of Science in Animal Science"
    ],
    "certificates": [
      // Optional array of strings
      "Board Certified Veterinary Surgeon",
      "Emergency and Critical Care Specialist"
    ]
  }
}
```

**Success Response (201):**

```json
{
  "message": "Signup successful.",
  "userType": "user", // or "doctor"
  "verificationCode": "123456" // Only in development - remove in production
}
```

**Error Responses:**

- `400`: Missing required fields, invalid email format, or invalid userType
  ```json
  {
    "error": "Email, password, userType, and profile are required."
  }
  ```
- `400`: Missing required profile fields
  ```json
  {
    "error": "First name and last name are required."
  }
  ```
- `400`: Missing doctor-specific required fields
  ```json
  {
    "error": "licenseNumber is required for doctor accounts."
  }
  ```
- `409`: Email already exists
  ```json
  {
    "error": "Email is already in use."
  }
  ```
- `409`: License number already exists (doctors only)
  ```json
  {
    "error": "A doctor with this license number already exists."
  }
  ```
- `500`: Internal server error
  ```json
  {
    "error": "Internal server error: [error details]"
  }
  ```

**Notes:**

- Users are automatically verified (`verified: true`) for testing purposes
- Verification codes are generated and hashed for future email verification
- Doctor profiles get additional fields with default values (rating: 0, statistics: all 0, isVerified: false, isActive: true)
- Location coordinates should be provided as [longitude, latitude] format for proper geospatial indexing

#### 2. User Login

**Endpoint:** `POST /api/auth/login`

**Description:** Authenticate user/doctor and receive JWT token

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Success Response (200):**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_object_id",
    "email": "user@example.com",
    "userType": "user",
    "verified": true,
    "profile": {
      "firstName": "John",
      "lastName": "Doe",
      "phone": "+1234567890"
    }
  }
}
```

**Error Responses:**

- `400`: Missing email or password
- `401`: Invalid credentials or unverified email
- `500`: Internal server error

#### 3. Email Verification

**Endpoint:** `POST /api/auth/verify`

**Description:** Verify user email with verification code

**Request Body:**

```json
{
  "email": "user@example.com",
  "code": "123456"
}
```

**Success Response (200):**

```json
{
  "message": "Email verified successfully.",
  "user": {
    "id": "user_object_id",
    "email": "user@example.com",
    "verified": true
  }
}
```

**Error Responses:**

- `400`: Missing email/code or invalid/expired code
- `404`: User not found
- `500`: Internal server error

### Pet Management

#### 1. Get User Pets

**Endpoint:** `GET /api/pets`

**Headers:** `Authorization: Bearer <jwt_token>`

**Query Parameters:**

- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)
- `search`: Search by pet name

**Success Response (200):**

```json
{
  "pets": [
    {
      "id": "pet_object_id",
      "name": "Buddy",
      "species": "Dog",
      "breed": "Golden Retriever",
      "age": 3,
      "weight": 30.5,
      "gender": "male",
      "color": "Golden",
      "microchipId": "123456789012345",
      "avatar": "pet_avatar_url",
      "medicalHistory": {
        "allergies": ["Chicken", "Wheat gluten"],
        "chronicConditions": ["Hip dysplasia"],
        "medications": ["Joint supplement"],
        "vaccinations": [
          {
            "name": "Rabies",
            "date": "2024-01-15T00:00:00.000Z",
            "nextDue": "2025-01-15T00:00:00.000Z",
            "veterinarian": "Dr. Smith"
          }
        ],
        "surgeries": [
          {
            "name": "Neutering",
            "date": "2023-08-15T00:00:00.000Z",
            "veterinarian": "Dr. Brown",
            "notes": "Routine procedure"
          }
        ]
      },
      "emergencyContact": {
        "name": "Emergency Vet Clinic",
        "phone": "+1234567890",
        "relation": "Emergency Veterinarian"
      },
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

#### 2. Create Pet Profile

**Endpoint:** `POST /api/pets`

**Headers:** `Authorization: Bearer <jwt_token>`

**Request Body:**

```json
{
  "name": "Buddy", // Required
  "species": "Dog", // Required
  "breed": "Golden Retriever", // Required
  "age": 3, // Required - number
  "weight": 30.5, // Required - number
  "gender": "male", // Required - "male" or "female"
  "color": "Golden", // Required
  "microchipId": "123456789012345", // Optional - must be unique if provided
  "avatar": "https://example.com/buddy.jpg", // Optional
  "medicalHistory": {
    // Optional object
    "allergies": ["Chicken", "Wheat gluten"], // Optional array
    "chronicConditions": ["Hip dysplasia"], // Optional array
    "medications": ["Joint supplement"], // Optional array
    "vaccinations": [
      // Optional array
      {
        "name": "Rabies", // Required if vaccination provided
        "date": "2024-01-15", // Required if vaccination provided
        "nextDue": "2025-01-15", // Optional
        "veterinarian": "Dr. Smith" // Required if vaccination provided
      }
    ],
    "surgeries": [
      // Optional array
      {
        "name": "Neutering", // Required if surgery provided
        "date": "2023-08-15", // Required if surgery provided
        "veterinarian": "Dr. Brown", // Required if surgery provided
        "notes": "Routine procedure" // Optional
      }
    ]
  },
  "emergencyContact": {
    // Required object
    "name": "Emergency Vet Clinic", // Required
    "phone": "+1234567890", // Required
    "relation": "Emergency Veterinarian" // Required
  }
}
```

**Field Requirements:**

- ✅ **Required:** `name`, `species`, `breed`, `age`, `weight`, `gender`, `color`, `emergencyContact` (complete object)
- ⚠️ **Optional:** `microchipId`, `avatar`, `medicalHistory` (complete object)
- ⚠️ **Conditional:** If `vaccinations` or `surgeries` arrays are provided, their required sub-fields become mandatory

````

**Success Response (201):**

```json
{
  "message": "Pet created successfully.",
  "pet": {
    "id": "pet_object_id",
    "name": "Buddy",
    "species": "Dog",
    "breed": "Golden Retriever",
    "age": 3,
    "weight": 30.5,
    "gender": "male",
    "color": "Golden",
    "microchipId": "123456789012345",
    "avatar": "https://example.com/buddy.jpg",
    "ownerId": "user_object_id",
    "medicalHistory": {
      "allergies": ["Chicken", "Wheat gluten"],
      "chronicConditions": ["Hip dysplasia"],
      "medications": ["Joint supplement"],
      "vaccinations": [
        {
          "name": "Rabies",
          "date": "2024-01-15T00:00:00.000Z",
          "nextDue": "2025-01-15T00:00:00.000Z",
          "veterinarian": "Dr. Smith"
        }
      ],
      "surgeries": [
        {
          "name": "Neutering",
          "date": "2023-08-15T00:00:00.000Z",
          "veterinarian": "Dr. Brown",
          "notes": "Routine procedure"
        }
      ]
    },
    "emergencyContact": {
      "name": "Emergency Vet Clinic",
      "phone": "+1234567890",
      "relation": "Emergency Veterinarian"
    },
    "isActive": true,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
````

**Error Responses:**

- `400`: Missing required fields
  ```json
  {
    "error": "Name, species, breed, age, weight, gender, and color are required."
  }
  ```
- `400`: Missing emergency contact
  ```json
  {
    "error": "Emergency contact information (name, phone, relation) is required."
  }
  ```
- `401`: Authentication required
- `403`: Doctors cannot register pets
  ```json
  {
    "error": "Doctors cannot register pets. Only regular users can own pets."
  }
  ```
- `409`: Microchip ID already exists
  ```json
  {
    "error": "A pet with this microchip ID already exists."
  }
  ```

#### 3. Update Pet Profile

**Endpoint:** `PUT /api/pets/[petId]`

**Headers:** `Authorization: Bearer <jwt_token>`

**Request Body:** (Same as create, all fields optional)

```json
{
  "name": "Buddy Jr.",
  "weight": 32.0,
  "medicalHistory": {
    "allergies": ["Chicken", "Wheat", "Corn"],
    "medications": ["Flea prevention", "Joint supplement"]
  }
}
```

**Success Response (200):**

```json
{
  "message": "Pet updated successfully.",
  "pet": {
    "id": "pet_object_id",
    "name": "Buddy Jr.",
    "weight": 32.0,
    "updatedAt": "2024-01-15T11:00:00.000Z"
  }
}
```

**Error Responses:**

- `400`: Invalid data
- `401`: Authentication required
- `403`: Not your pet
- `404`: Pet not found
- `500`: Internal server error

#### 4. Delete Pet Profile

**Endpoint:** `DELETE /api/pets/[petId]`

**Headers:** `Authorization: Bearer <jwt_token>`

**Success Response (200):**

```json
{
  "message": "Pet deleted successfully."
}
```

**Error Responses:**

- `401`: Authentication required
- `403`: Not your pet
- `404`: Pet not found
- `500`: Internal server error

### Profile Management

#### 1. Get User Profile

**Endpoint:** `GET /api/users`

**Headers:**

```
Authorization: Bearer your_jwt_token_here
```

**Success Response (200):**

```json
{
  "user": {
    "_id": "user_id",
    "email": "user@example.com",
    "userType": "user",
    "profile": {
      "firstName": "John",
      "lastName": "Doe",
      "phone": "+1234567890",
      "avatar": "/uploads/avatars/uuid-filename.jpg"
    },
    "location": {
      "address": "123 Main St",
      "city": "New York",
      "country": "USA"
    },
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "doctorProfile": {
    // Only included if user is a doctor
    "_id": "doctor_id",
    "licenseNumber": "DOC123456",
    "specialization": ["General Practice"],
    "experience": 5,
    "clinicName": "Pet Care Clinic",
    "clinicAddress": "456 Pet St",
    "consultationFee": 100,
    "bio": "Experienced veterinarian...",
    "rating": {
      "average": 4.5,
      "totalReviews": 10
    }
  }
}
```

#### 2. Update User Profile

**Endpoint:** `PUT /api/users`

**Headers:**

```
Authorization: Bearer your_jwt_token_here
Content-Type: application/json
```

**Request Body:**

```json
{
  "profile": {
    "firstName": "Jane",
    "lastName": "Smith",
    "phone": "+1987654321"
  },
  "location": {
    "address": "789 New St",
    "city": "Los Angeles",
    "country": "USA",
    "coordinates": [-118.2437, 34.0522]
  }
}
```

**Success Response (200):**

```json
{
  "message": "Profile updated successfully.",
  "user": {
    // Updated user object
  }
}
```

#### 3. Change Password

**Endpoint:** `PUT /api/users/password`

**Headers:**

```
Authorization: Bearer your_jwt_token_here
Content-Type: application/json
```

**Request Body:**

```json
{
  "currentPassword": "oldPassword123",
  "newPassword": "newSecurePassword456"
}
```

**Success Response (200):**

```json
{
  "message": "Password updated successfully."
}
```

**Error Responses:**

- `400`: Incorrect current password or weak new password
- `401`: Authentication required
- `500`: Internal server error

#### 4. Update Doctor Profile

**Endpoint:** `PUT /api/doctors/profile`

**Headers:**

```
Authorization: Bearer your_jwt_token_here
Content-Type: application/json
```

**Request Body:**

```json
{
  "licenseNumber": "DOC789012",
  "specialization": ["Surgery", "Emergency Care"],
  "experience": 8,
  "clinicName": "Advanced Pet Hospital",
  "clinicAddress": "123 Vet Lane",
  "consultationFee": 150,
  "bio": "Specialist in emergency veterinary care...",
  "education": ["DVM from UC Davis", "Surgery Residency"],
  "certificates": ["Board Certified Surgeon"],
  "workingHours": [
    {
      "day": "Monday",
      "startTime": "09:00",
      "endTime": "17:00",
      "isAvailable": true
    },
    {
      "day": "Tuesday",
      "startTime": "09:00",
      "endTime": "17:00",
      "isAvailable": true
    }
  ]
}
```

**Success Response (200):**

```json
{
  "message": "Doctor profile updated successfully.",
  "doctor": {
    // Updated doctor profile object
  }
}
```

#### 5. Get Clinic Information

**Endpoint:** `GET /api/doctors/clinic`

**Headers:**

```
Authorization: Bearer your_jwt_token_here
```

**Success Response (200):**

```json
{
  "clinic": {
    "clinicName": "Advanced Pet Hospital",
    "clinicAddress": "123 Vet Lane",
    "workingHours": [
      {
        "day": "Monday",
        "startTime": "09:00",
        "endTime": "17:00",
        "isAvailable": true
      },
      {
        "day": "Tuesday",
        "startTime": "09:00",
        "endTime": "17:00",
        "isAvailable": true
      }
    ],
    "consultationFee": 150,
    "contactInfo": {
      "phone": "+1234567890",
      "email": "doctor@hospital.com"
    },
    "location": {
      "address": "123 Vet Lane",
      "city": "New York",
      "country": "USA",
      "coordinates": [-74.006, 40.7128]
    },
    "specialization": ["Surgery", "Emergency Care"],
    "isActive": true
  }
}
```

#### 6. Update Clinic Information

**Endpoint:** `PUT /api/doctors/clinic`

**Headers:**

```
Authorization: Bearer your_jwt_token_here
Content-Type: application/json
```

**Request Body:**

```json
{
  "clinicName": "New Clinic Name",
  "clinicAddress": "456 New Address St",
  "consultationFee": 200,
  "contactPhone": "+1987654321",
  "specialization": ["Internal Medicine", "Surgery"],
  "workingHours": [
    {
      "day": "Monday",
      "startTime": "08:00",
      "endTime": "18:00",
      "isAvailable": true
    },
    {
      "day": "Tuesday",
      "startTime": "08:00",
      "endTime": "18:00",
      "isAvailable": true
    },
    {
      "day": "Wednesday",
      "startTime": "08:00",
      "endTime": "12:00",
      "isAvailable": true
    },
    {
      "day": "Thursday",
      "startTime": "08:00",
      "endTime": "18:00",
      "isAvailable": true
    },
    {
      "day": "Friday",
      "startTime": "08:00",
      "endTime": "16:00",
      "isAvailable": true
    },
    {
      "day": "Saturday",
      "startTime": "09:00",
      "endTime": "13:00",
      "isAvailable": true
    },
    {
      "day": "Sunday",
      "startTime": "",
      "endTime": "",
      "isAvailable": false
    }
  ],
  "location": {
    "address": "456 New Address St",
    "city": "Los Angeles",
    "country": "USA",
    "coordinates": [-118.2437, 34.0522]
  }
}
```

**Success Response (200):**

```json
{
  "message": "Clinic information updated successfully.",
  "clinic": {
    // Updated clinic information object
  }
}
```

**Error Responses:**

- `400`: Invalid clinic data (name too short, invalid working hours, etc.)
- `401`: Authentication required
- `403`: Only doctors can update clinic information
- `404`: Doctor profile not found
- `500`: Internal server error

#### 5. Upload Avatar

**Endpoint:** `POST /api/users/avatar`

**Headers:**

```
Authorization: Bearer your_jwt_token_here
Content-Type: multipart/form-data
```

**Request Body (Form Data):**

- `avatar`: Image file (JPEG, PNG, WebP, max 5MB)

**Success Response (200):**

```json
{
  "message": "Avatar uploaded successfully.",
  "avatarUrl": "/uploads/avatars/uuid-filename.jpg"
}
```

#### 6. Remove Avatar

**Endpoint:** `DELETE /api/users/avatar`

**Headers:**

```
Authorization: Bearer your_jwt_token_here
```

**Success Response (200):**

```json
{
  "message": "Avatar removed successfully."
}
```

#### 7. Deactivate Account

**Endpoint:** `DELETE /api/users/account`

**Headers:**

```
Authorization: Bearer your_jwt_token_here
Content-Type: application/json
```

**Request Body:**

```json
{
  "password": "userPassword123",
  "deleteType": "deactivate" // or "permanent"
}
```

**Success Response (200):**

```json
{
  "message": "Account deactivated successfully. You can reactivate it by contacting support."
}
```

#### 8. Reactivate Account

**Endpoint:** `POST /api/users/account`

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "userPassword123"
}
```

**Success Response (200):**

```json
{
  "message": "Account reactivated successfully.",
  "token": "new_jwt_token",
  "user": {
    // User profile object
  }
}
```

### Doctor Discovery

#### 1. Find Doctors

**Endpoint:** `GET /api/doctors`

**Query Parameters:**

- `latitude`, `longitude`: User location for distance calculation
- `radius`: Search radius in km (default: 10)
- `specialization`: Filter by doctor specialization
- `minRating`: Minimum rating filter
- `maxFee`: Maximum consultation fee
- `availability`: Filter by availability
- `search`: Search by doctor name
  **Success Response (200):**

```json
{
  "doctors": [
    {
      "id": "doctor_object_id",
      "user": {
        "email": "dr.smith@example.com",
        "profile": {
          "firstName": "Sarah",
          "lastName": "Smith",
          "phone": "+1234567890"
        }
      },
      "specialization": "General Practice",
      "licenseNumber": "DOC123456",
      "experience": 8,
      "education": "DVM from University of Veterinary Medicine",
      "consultationFee": 75,
      "location": {
        "latitude": 40.7128,
        "longitude": -74.006,
        "address": "123 Clinic St, New York, NY"
      },
      "rating": {
        "average": 4.7,
        "totalReviews": 156,
        "distribution": {
          "5": 98,
          "4": 42,
          "3": 12,
          "2": 3,
          "1": 1
        }
      },
      "availability": {
        "isAvailable": true,
        "nextAvailableSlot": "2024-01-20T10:00:00.000Z",
        "emergencyAvailable": true
      },
      "distance": 2.3,
      "isVerified": true,
      "joinedDate": "2023-01-15T00:00:00.000Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 3,
    "totalDoctors": 25,
    "hasNext": true,
    "hasPrev": false
  },
  "filters": {
    "appliedFilters": {
      "specialization": "General Practice",
      "maxDistance": 10,
      "minRating": 4.0
    },
    "availableSpecializations": [
      "General Practice",
      "Surgery",
      "Cardiology",
      "Dermatology",
      "Emergency Medicine"
    ]
  }
}
```

**Error Responses:**

- `400`: Invalid query parameters
- `500`: Internal server error

### Appointment Management

#### 1. Create Reservation

**Endpoint:** `POST /api/reservations`

**Headers:** `Authorization: Bearer <jwt_token>`

**Request Body:**

```json
{
  "doctorId": "doctor_object_id", // Required
  "petId": "pet_object_id", // Required
  "appointmentDate": "2024-01-15", // Required - YYYY-MM-DD format
  "appointmentTime": "10:00", // Required - HH:MM format
  "type": "consultation", // Required - "consultation", "checkup", "vaccination", "surgery", "emergency"
  "reason": "Annual checkup and vaccination", // Required
  "symptoms": ["Lethargy", "Loss of appetite"], // Optional array
  "urgency": "low", // Optional - "low", "medium", "high", "emergency" (default: "medium")
  "notes": "Pet seems healthy but due for annual checkup" // Optional
}
```

**Field Requirements:**

- ✅ **Required:** `doctorId`, `petId`, `appointmentDate`, `appointmentTime`, `type`, `reason`
- ⚠️ **Optional:** `symptoms`, `urgency`, `notes`
- **Note:** Only regular users can make reservations (not doctors)

**Success Response (201):**

```json
{
  "message": "Reservation created successfully.",
  "reservation": {
    "id": "reservation_object_id",
    "userId": "user_object_id",
    "doctorId": "doctor_object_id",
    "petId": "pet_object_id",
    "appointmentDate": "2024-01-15T00:00:00.000Z",
    "appointmentTime": "10:00",
    "duration": 30,
    "type": "consultation",
    "reason": "Annual checkup and vaccination",
    "symptoms": ["Lethargy", "Loss of appetite"],
    "urgency": "low",
    "notes": "Pet seems healthy but due for annual checkup",
    "status": "pending",
    "fees": {
      "consultationFee": 150,
      "additionalCharges": 0,
      "totalAmount": 150,
      "paymentStatus": "pending"
    },
    "reminders": {
      "sent": false
    },
    "createdAt": "2024-01-10T09:00:00.000Z",
    "updatedAt": "2024-01-10T09:00:00.000Z"
  }
}
```

**Error Responses:**

- `400`: Missing required fields
  ```json
  {
    "error": "Doctor, pet, appointment date, time, type, and reason are required."
  }
  ```
- `400`: Doctor not available on selected date
  ```json
  {
    "error": "Doctor is not available on the selected date."
  }
  ```
- `400`: Time slot not available
  ```json
  {
    "error": "The selected time slot is not available."
  }
  ```
- `401`: Authentication required
- `403`: Only regular users can make reservations
  ```json
  {
    "error": "Only regular users can make reservations."
  }
  ```
- `404`: Doctor not found or not available
  ```json
  {
    "error": "Doctor not found or not available."
  }
  ```
- `404`: Pet not found or not yours
  ```json
  {
    "error": "Pet not found or you don't have permission to book for this pet."
  }
  ```

#### 2. Get User Reservations

**Endpoint:** `GET /api/reservations`

**Headers:** `Authorization: Bearer <jwt_token>`

**Query Parameters:**

- `status`: Filter by status (pending, confirmed, in-progress, completed, cancelled)
- `type`: Filter by appointment type
- `petId`: Filter by specific pet
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)

**Success Response (200):**

```json
{
  "reservations": [
    {
      "id": "reservation_object_id",
      "pet": {
        "id": "pet_object_id",
        "name": "Buddy",
        "species": "Dog",
        "avatar": "pet_avatar_url"
      },
      "doctor": {
        "id": "doctor_object_id",
        "name": "Dr. Sarah Smith",
        "specialization": "General Practice",
        "phone": "+1234567890",
        "location": "123 Clinic St, New York, NY"
      },
      "appointmentDate": "2024-01-15",
      "appointmentTime": "10:00",
      "type": "checkup",
      "reason": "Regular checkup",
      "status": "confirmed",
      "totalCost": 75,
      "notes": "Pet seems lethargic lately",
      "canCancel": true,
      "canReschedule": true,
      "createdAt": "2024-01-10T09:00:00.000Z",
      "updatedAt": "2024-01-12T14:30:00.000Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 2,
    "totalReservations": 12,
    "hasNext": true,
    "hasPrev": false
  },
  "summary": {
    "totalReservations": 12,
    "upcomingReservations": 3,
    "completedReservations": 8,
    "cancelledReservations": 1
  }
}
```

#### 3. Update Reservation Status

**Endpoint:** `PUT /api/reservations/[reservationId]`

**Headers:** `Authorization: Bearer <jwt_token>`

**Request Body:**

```json
{
  "status": "confirmed", // pending, confirmed, in-progress, completed, cancelled
  "notes": "Additional notes about the status change",
  "rescheduleDate": "2024-01-20", // Only for rescheduling
  "rescheduleTime": "14:00" // Only for rescheduling
}
```

**Success Response (200):**

```json
{
  "message": "Reservation updated successfully.",
  "reservation": {
    "id": "reservation_object_id",
    "status": "confirmed",
    "updatedAt": "2024-01-12T14:30:00.000Z"
  }
}
```

**Error Responses:**

- `400`: Invalid status or missing required fields
- `401`: Authentication required
- `403`: Not authorized to update this reservation
- `404`: Reservation not found
- `409`: Cannot update reservation in current status
- `500`: Internal server error

### Medical Records

#### 1. Get Pet Medical Records

**Endpoint:** `GET /api/medical-records`

**Headers:** `Authorization: Bearer <jwt_token>`

**Query Parameters:**

- `petId`: Required - Pet ID to get records for
- `doctorId`: Optional - Filter by specific doctor
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)
- `startDate`: Filter records from this date (YYYY-MM-DD)
- `endDate`: Filter records until this date (YYYY-MM-DD)

**Success Response (200):**

```json
{
  "medicalRecords": [
    {
      "id": "medical_record_object_id",
      "pet": {
        "id": "pet_object_id",
        "name": "Buddy",
        "species": "Dog",
        "avatar": "pet_avatar_url"
      },
      "doctor": {
        "id": "doctor_object_id",
        "name": "Dr. Sarah Smith",
        "specialization": "General Practice",
        "licenseNumber": "DOC123456"
      },
      "visitDate": "2024-01-15",
      "diagnosis": "Ear infection",
      "treatment": "Prescribed antibiotics and ear cleaning solution",
      "medications": [
        {
          "name": "Amoxicillin",
          "dosage": "500mg",
          "frequency": "Twice daily",
          "duration": "7 days"
        }
      ],
      "notes": "Pet responded well to treatment. Follow up in 1 week",
      "attachments": [
        {
          "type": "image",
          "url": "medical_image_url",
          "description": "Ear examination photo"
        }
      ],
      "followUpRequired": true,
      "followUpDate": "2024-01-22",
      "cost": 125,
      "createdAt": "2024-01-15T14:30:00.000Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 3,
    "totalRecords": 25,
    "hasNext": true,
    "hasPrev": false
  },
  "summary": {
    "totalRecords": 25,
    "recordsNeedingFollowUp": 3,
    "lastVisit": "2024-01-15",
    "treatingDoctors": 4
  }
}
```

**Error Responses:**

- `400`: Missing petId parameter
- `401`: Authentication required
- `403`: Not authorized to view these records
- `404`: Pet not found
- `500`: Internal server error

#### 2. Create Medical Record (Doctors Only)

**Endpoint:** `POST /api/medical-records`

**Headers:** `Authorization: Bearer <doctor_jwt_token>`

**Request Body:**

```json
{
  "petId": "pet_object_id",
  "visitDate": "2024-01-15",
  "diagnosis": "Ear infection",
  "treatment": "Prescribed antibiotics and ear cleaning solution",
  "medications": [
    {
      "name": "Amoxicillin",
      "dosage": "500mg",
      "frequency": "Twice daily",
      "duration": "7 days"
    }
  ],
  "notes": "Pet responded well to treatment. Follow up in 1 week",
  "attachments": [
    {
      "type": "image",
      "url": "base64_image_or_url",
      "description": "Ear examination photo"
    }
  ],
  "followUpRequired": true,
  "followUpDate": "2024-01-22",
  "cost": 125
}
```

**Success Response (201):**

```json
{
  "message": "Medical record created successfully.",
  "medicalRecord": {
    "id": "medical_record_object_id",
    "petId": "pet_object_id",
    "doctorId": "doctor_object_id",
    "visitDate": "2024-01-15",
    "diagnosis": "Ear infection",
    "treatment": "Prescribed antibiotics and ear cleaning solution",
    "medications": [...],
    "notes": "Pet responded well to treatment. Follow up in 1 week",
    "followUpRequired": true,
    "followUpDate": "2024-01-22",
    "cost": 125,
    "createdAt": "2024-01-15T14:30:00.000Z"
  }
}
```

**Error Responses:**

- `400`: Missing required fields or invalid data
- `401`: Authentication required
- `403`: Only doctors can create medical records
- `404`: Pet not found or no reservation with this pet
- `500`: Internal server error

### Doctor Patient Management

#### 1. Get Doctor's Patients

**Endpoint:** `GET /api/doctor-patients`

**Headers:** `Authorization: Bearer <doctor_jwt_token>`

**Query Parameters:**

- `status`: Filter patients (active, completed, all)
- `search`: Search by pet name or owner name
- `page`, `limit`: Pagination

**Response:**

```json
{
  "patients": [
    {
      "id": "pet_id",
      "name": "Buddy",
      "species": "Dog",
      "owner": {
        "name": "John Doe",
        "email": "john@example.com",
        "phone": "+1234567890"
      },
      "lastVisit": {
        "date": "2024-01-15",
        "status": "completed",
        "type": "checkup"
      },
      "totalVisitsWithDoctor": 3,
      "needsFollowUp": false
    }
  ],
  "pagination": { ... },
  "summary": {
    "totalActivePatients": 15,
    "totalTreatedPatients": 45,
    "patientsNeedingFollowUp": 3
  }
}
```

### Reviews & Ratings

#### 1. Create Review

**Endpoint:** `POST /api/reviews`

**Description:** Create a review for a completed appointment (users only)

**Headers:** `Authorization: Bearer <jwt_token>`

**Request Body:**

```json
{
  "reservationId": "reservation_object_id",
  "rating": 4,
  "comment": "Great service and very professional doctor",
  "categories": {
    "communication": 5,
    "professionalism": 4,
    "facilities": 4,
    "overall": 4
  }
}
```

**Success Response (201):**

```json
{
  "message": "Review created successfully.",
  "review": {
    "id": "review_object_id",
    "reservationId": "reservation_object_id",
    "userId": "user_object_id",
    "doctorId": "doctor_object_id",
    "rating": 4,
    "comment": "Great service and very professional doctor",
    "categories": {
      "communication": 5,
      "professionalism": 4,
      "facilities": 4,
      "overall": 4
    },
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Error Responses:**

- `400`: Missing required fields or invalid rating values (must be 1-5)
- `401`: Authentication required or invalid token
- `403`: Only users can write reviews
- `404`: Reservation not found, not yours, or not completed yet
- `409`: You have already reviewed this reservation

#### 2. Get Doctor Reviews

**Endpoint:** `GET /api/reviews/[doctorId]`

**Description:** Get all reviews for a specific doctor with pagination and filtering

**Query Parameters:**

- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)
- `minRating`: Filter reviews with minimum rating

**Success Response (200):**

```json
{
  "reviews": [
    {
      "id": "review_object_id",
      "user": {
        "name": "John Doe",
        "avatar": "user_avatar_url"
      },
      "rating": 4,
      "comment": "Great service and very professional doctor",
      "categories": {
        "communication": 5,
        "professionalism": 4,
        "facilities": 4,
        "overall": 4
      },
      "reservation": {
        "appointmentDate": "2024-01-15",
        "type": "checkup"
      },
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 3,
    "totalReviews": 25,
    "hasNext": true,
    "hasPrev": false
  },
  "averageRating": {
    "overall": 4.2,
    "communication": 4.5,
    "professionalism": 4.1,
    "facilities": 4.0,
    "ratingDistribution": {
      "5": 10,
      "4": 8,
      "3": 5,
      "2": 2,
      "1": 0
    }
  }
}
```

### Dashboard Analytics

#### 1. User Dashboard

**Endpoint:** `GET /api/dashboard/user`

**Description:** Get comprehensive dashboard analytics for pet owners

**Headers:** `Authorization: Bearer <jwt_token>`

**Success Response (200):**

```json
{
  "user": {
    "name": "John Doe",
    "email": "john@example.com",
    "memberSince": "2024-01-01T00:00:00.000Z"
  },
  "petStatistics": {
    "totalPets": 3,
    "petsNeedingVaccination": 1,
    "petsWithUpcomingAppointments": 2
  },
  "reservationStatistics": {
    "totalReservations": 12,
    "completedReservations": 10,
    "upcomingReservations": 2,
    "recentReservations": [
      {
        "id": "reservation_id",
        "pet": {
          "name": "Buddy",
          "avatar": "pet_avatar_url"
        },
        "doctor": {
          "name": "Dr. Smith",
          "specialization": "General Practice"
        },
        "appointmentDate": "2024-01-20",
        "appointmentTime": "10:00",
        "status": "confirmed",
        "type": "checkup"
      }
    ]
  },
  "healthAlerts": [
    {
      "type": "vaccination",
      "petId": "pet_id",
      "petName": "Buddy",
      "message": "Rabies vaccination due in 2 weeks",
      "dueDate": "2024-02-01",
      "priority": "medium"
    }
  ],
  "recommendedDoctors": [
    {
      "id": "doctor_id",
      "name": "Dr. Johnson",
      "specialization": "Cardiology",
      "rating": 4.8,
      "distance": 2.5,
      "consultationFee": 85
    }
  ]
}
```

#### 2. Doctor Dashboard

**Endpoint:** `GET /api/dashboard/doctor`

**Description:** Get comprehensive dashboard analytics for doctors

**Headers:** `Authorization: Bearer <doctor_jwt_token>`

**Success Response (200):**

```json
{
  "doctor": {
    "name": "Dr. Sarah Smith",
    "specialization": "General Practice",
    "licenseNumber": "DOC123456",
    "joinedDate": "2024-01-01T00:00:00.000Z"
  },
  "todaySchedule": {
    "totalAppointments": 8,
    "completedAppointments": 5,
    "upcomingAppointments": 3,
    "appointments": [
      {
        "id": "reservation_id",
        "time": "14:00",
        "pet": {
          "name": "Buddy",
          "species": "Dog",
          "avatar": "pet_avatar_url"
        },
        "owner": {
          "name": "John Doe",
          "phone": "+1234567890"
        },
        "type": "checkup",
        "status": "confirmed"
      }
    ]
  },
  "statistics": {
    "totalPatients": 156,
    "totalReservations": 342,
    "totalRevenue": 25650,
    "averageRating": 4.7,
    "monthlyStats": {
      "reservations": 28,
      "revenue": 2100,
      "newPatients": 8
    }
  },
  "recentPatients": [
    {
      "id": "pet_id",
      "name": "Buddy",
      "species": "Dog",
      "owner": "John Doe",
      "lastVisit": "2024-01-15",
      "condition": "Healthy"
    }
  ],
  "upcomingFollowUps": [
    {
      "petId": "pet_id",
      "petName": "Max",
      "ownerName": "Jane Doe",
      "followUpDate": "2024-01-25",
      "reason": "Post-surgery checkup"
    }
  ]
}
```

### Doctor Availability

#### 1. Get Doctor Availability

**Endpoint:** `GET /api/availability/[doctorId]`

**Description:** Get doctor's availability schedule for specific dates

**Query Parameters:**

- `date`: Specific date (YYYY-MM-DD) - for single day availability
- `startDate`: Start date range (YYYY-MM-DD)
- `endDate`: End date range (YYYY-MM-DD)

**Success Response (200):**

```json
{
  "doctorId": "doctor_object_id",
  "doctorName": "Dr. Sarah Smith",
  "availability": [
    {
      "date": "2024-01-20",
      "dayOfWeek": "Saturday",
      "isAvailable": true,
      "timeSlots": [
        {
          "startTime": "09:00",
          "endTime": "09:30",
          "isAvailable": true
        },
        {
          "startTime": "09:30",
          "endTime": "10:00",
          "isAvailable": false,
          "reason": "booked"
        },
        {
          "startTime": "10:00",
          "endTime": "10:30",
          "isAvailable": true
        }
      ],
      "totalSlots": 16,
      "availableSlots": 14,
      "bookedSlots": 2
    }
  ],
  "summary": {
    "totalDays": 7,
    "availableDays": 6,
    "totalTimeSlots": 112,
    "availableTimeSlots": 98
  }
}
```

#### 2. Update Availability (Doctors Only)

**Endpoint:** `PUT /api/availability`

**Description:** Update doctor's availability schedule

**Headers:** `Authorization: Bearer <doctor_jwt_token>`

**Request Body:**

```json
{
  "weeklySchedule": {
    "monday": {
      "isAvailable": true,
      "startTime": "09:00",
      "endTime": "17:00",
      "slotDuration": 30
    },
    "tuesday": {
      "isAvailable": true,
      "startTime": "09:00",
      "endTime": "17:00",
      "slotDuration": 30
    },
    "wednesday": {
      "isAvailable": false
    },
    "thursday": {
      "isAvailable": true,
      "startTime": "09:00",
      "endTime": "17:00",
      "slotDuration": 30
    },
    "friday": {
      "isAvailable": true,
      "startTime": "09:00",
      "endTime": "15:00",
      "slotDuration": 30
    },
    "saturday": {
      "isAvailable": true,
      "startTime": "10:00",
      "endTime": "14:00",
      "slotDuration": 30
    },
    "sunday": {
      "isAvailable": false
    }
  },
  "exceptions": [
    {
      "date": "2024-01-25",
      "isAvailable": false,
      "reason": "Holiday"
    },
    {
      "date": "2024-01-30",
      "isAvailable": true,
      "startTime": "10:00",
      "endTime": "16:00",
      "reason": "Special hours"
    }
  ],
  "emergencyAvailable": true,
  "consultationFee": 75
}
```

**Success Response (200):**

```json
{
  "message": "Availability updated successfully.",
  "availability": {
    "doctorId": "doctor_object_id",
    "weeklySchedule": { ... },
    "exceptions": [ ... ],
    "emergencyAvailable": true,
    "lastUpdated": "2024-01-15T10:30:00.000Z"
  }
}
```

**Error Responses:**

- `400`: Invalid schedule format or time values
- `401`: Authentication required or invalid token
- `403`: Only doctors can update availability
- `404`: Doctor profile not found

## 🔌 API Endpoints

### Base URL

```
http://localhost:3000/api/auth
```

### User Login

**Endpoint:** `POST /api/auth/login`

**Description:** Authenticate user and receive JWT token

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Success Response (200):**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "60d5ecb74f3b2c001f5e4e95",
    "email": "user@example.com",
    "verified": true
  }
}
```

**Error Responses:**

- `400`: Missing email or password
- `401`: Invalid credentials
- `500`: Internal server error

---

### 3. Email Verification

**Endpoint:** `POST /api/auth/verify`

**Description:** Verify user email with verification code

**Request Body:**

```json
{
  "email": "user@example.com",
  "code": "123456"
}
```

**Success Response (200):**

```json
{
  "message": "Email verified successfully.",
  "user": {
    "id": "60d5ecb74f3b2c001f5e4e95",
    "email": "user@example.com",
    "verified": true
  }
}
```

**Error Responses:**

- `400`: Missing email/code or invalid/expired code
- `404`: User not found
- `500`: Internal server error

## 🔒 Authentication

The API uses JWT (JSON Web Tokens) for authentication. After successful login, include the token in your requests:

```javascript
// Example header for authenticated requests
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Token Payload:**

```json
{
  "email": "user@example.com",
  "userId": "60d5ecb74f3b2c001f5e4e95",
  "iat": 1625097600,
  "exp": 1625702400
}
```

**Token Expiration:** 7 days

### Environment Variables for Production

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database
JWT_SECRET=your_super_secure_jwt_secret_key_here_make_it_long_and_random
NODE_ENV=production
```

### Deployment Platforms

- **Vercel** (Recommended for Next.js)
- **Railway**
- **Heroku**
- **DigitalOcean App Platform**

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

**Note**: This API is optimized for mobile applications and returns JSON responses suitable for Flutter, React Native, and other mobile frameworks.
