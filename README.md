# Pet-Sense Backend API

A Next.js-based authentication API designed for mobile applications, particularly Flutter apps. This backend provides secure user authentication with signup, login, and email verification endpoints.

## 🚀 Features

- **User Registration**: Secure user signup with password hashing
- **User Authentication**: JWT-based login system
- **Email Verification**: Time-expiring verification codes (currently in development)
- **MongoDB Integration**: Persistent data storage with Mongoose ODM
- **Security**: bcrypt password hashing, JWT tokens, hashed verification codes
- **Mobile-First**: API responses optimized for mobile app consumption

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

## 🔌 API Endpoints

### Base URL

```
http://localhost:3000/api/auth
```

### 1. User Signup

**Endpoint:** `POST /api/auth/signup`

**Description:** Register a new user account

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
  "message": "Signup successful. Please verify your email.",
  "verificationCode": "123456"
}
```

**Error Responses:**

- `400`: Missing email or password
- `409`: User already exists
- `500`: Internal server error

---

### 2. User Login

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

## 📱 Flutter Integration

### Example Implementation

```dart
// Signup
final response = await http.post(
  Uri.parse('http://your-api-url/api/auth/signup'),
  headers: {'Content-Type': 'application/json'},
  body: json.encode({
    'email': 'user@example.com',
    'password': 'securePassword123'
  }),
);

// Login
final loginResponse = await http.post(
  Uri.parse('http://your-api-url/api/auth/login'),
  headers: {'Content-Type': 'application/json'},
  body: json.encode({
    'email': 'user@example.com',
    'password': 'securePassword123'
  }),
);

final data = json.decode(loginResponse.body);
final token = data['token'];

// Store token for future requests
SharedPreferences prefs = await SharedPreferences.getInstance();
await prefs.setString('auth_token', token);
```

## 🗄️ Database Schema

### User Model

```javascript
{
  email: String,      // Unique, lowercase, trimmed
  password: String,   // bcrypt hashed
  verified: Boolean,  // Default: false
  createdAt: Date,    // Auto-generated
  updatedAt: Date     // Auto-generated
}
```

### Verification Code Model

```javascript
{
  email: String,      // Lowercase, trimmed
  code: String,       // bcrypt hashed
  expiresAt: Date,    // Auto-expires after 10 minutes
  createdAt: Date     // Auto-generated
}
```

## 🔧 Development Status

### ✅ Completed Features

- User registration with password hashing
- User authentication with JWT tokens
- Hashed verification code storage
- MongoDB integration
- Input validation and error handling

### 🚧 In Development

- **Email SMTP Integration**: Email verification is temporarily disabled until SMTP configuration is complete
- **Password Reset**: Forgot password functionality
- **Rate Limiting**: API rate limiting for security

### 🔮 Planned Features

- User profile management
- OAuth integration (Google, Facebook)
- Two-factor authentication
- Admin panel endpoints

## 🛠️ Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (jsonwebtoken)
- **Password Hashing**: bcrypt
- **Language**: TypeScript
- **Runtime**: Node.js

## 📋 Error Handling

All endpoints return consistent error responses:

```json
{
  "error": "Descriptive error message"
}
```

Common HTTP status codes:

- `200`: Success
- `400`: Bad Request (validation errors)
- `401`: Unauthorized
- `404`: Not Found
- `409`: Conflict (e.g., user already exists)
- `500`: Internal Server Error

## 🚀 Deployment

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
