# Resume Scanner Backend API

A Node.js/TypeScript backend API for scanning and analyzing resumes against job descriptions using Google's Gemini AI.

## Features

- **User Authentication**: JWT-based authentication with role-based access (HR/Admin)
- **Job Management**: CRUD operations for job descriptions
- **Resume Analysis**: AI-powered resume scanning and scoring using Gemini AI
- **File Upload**: Support for PDF, DOC, and DOCX resume files
- **Scoring System**: Comprehensive scoring based on skills, experience, education, and keywords
- **Data Persistence**: MongoDB integration with Mongoose ODM

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **AI Integration**: Google Gemini AI
- **Authentication**: JWT (JSON Web Tokens)
- **File Processing**: Multer for uploads, pdf-parse for PDF extraction
- **Validation**: Joi for request validation
- **Security**: Helmet, CORS, bcryptjs for password hashing

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile (protected)

### Job Management
- `POST /api/jobs` - Create job description (protected)
- `GET /api/jobs` - Get all jobs (protected)
- `GET /api/jobs/:id` - Get job by ID (protected)
- `PUT /api/jobs/:id` - Update job (protected)
- `DELETE /api/jobs/:id` - Delete job (protected)

### Resume Analysis
- `POST /api/resume/scan` - Scan resume against job (protected, file upload)
- `GET /api/resume/scores` - Get resume scores with filtering (protected)
- `GET /api/resume/scores/:id` - Get specific resume score (protected)

## Environment Variables

Create a `.env` file in the root directory:

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/resume_scanner
JWT_SECRET=your_jwt_secret_key_here
GEMINI_API_KEY=your_gemini_api_key_here
CORS_ORIGIN=http://localhost:3000
```

## Installation & Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   - Copy the environment variables above to your `.env` file
   - Replace `your_jwt_secret_key_here` with a secure random string
   - Replace `your_gemini_api_key_here` with your Google Gemini API key

3. **Start MongoDB**:
   - Make sure MongoDB is running on your system
   - Default connection: `mongodb://localhost:27017/resume_scanner`

4. **Run the application**:
   ```bash
   # Development mode
   npm run dev
   
   # Production build
   npm run build
   npm start
   ```

## Project Structure

```
src/
├── config/          # Configuration files
│   ├── database.ts  # MongoDB connection
│   └── gemini.ts    # Gemini AI configuration
├── controllers/     # Route controllers
│   ├── auth.controller.ts
│   ├── job.controller.ts
│   └── resume.controller.ts
├── middleware/      # Express middleware
│   ├── auth.middleware.ts
│   ├── upload.middleware.ts
│   └── validation.middleware.ts
├── models/          # Mongoose models
│   ├── User.model.ts
│   ├── Job.model.ts
│   ├── ResumeScore.model.ts
│   └── index.ts
├── routes/          # Express routes
│   ├── auth.routes.ts
│   ├── job.routes.ts
│   └── resume.routes.ts
├── services/        # Business logic services
│   ├── gemini.service.ts
│   ├── pdf.service.ts
│   └── resume.service.ts
├── types/           # TypeScript type definitions
│   └── index.ts
├── utils/           # Utility functions
│   ├── response.ts
│   └── validation.ts
└── app.ts           # Main application file
```

## Usage Examples

### Register a new user
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "hr@company.com",
    "password": "password123",
    "name": "HR Manager",
    "role": "hr"
  }'
```

### Create a job description
```bash
curl -X POST http://localhost:5000/api/jobs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "title": "Software Engineer",
    "company": "Tech Corp",
    "description": "We are looking for a skilled software engineer...",
    "requiredSkills": ["JavaScript", "Node.js", "React"],
    "experience": "2-5 years",
    "location": "Remote",
    "jobType": "full-time"
  }'
```

### Scan a resume
```bash
curl -X POST http://localhost:5000/api/resume/scan \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "resume=@path/to/resume.pdf" \
  -F "jobId=JOB_ID_HERE"
```

## Resume Scoring

The system provides comprehensive scoring based on:

- **Skills Match** (30%): How well candidate skills match job requirements
- **Experience Match** (25%): Relevance of candidate experience
- **Education Match** (20%): Educational background alignment
- **Keywords Match** (25%): Presence of job-specific keywords

Each resume analysis includes:
- Overall score (0-100)
- Individual category scores
- Matched and missing skills
- Experience analysis
- Strengths and weaknesses
- Improvement recommendations

## Security Features

- JWT-based authentication
- Password hashing with bcryptjs
- Role-based access control
- Request validation with Joi
- File upload restrictions
- CORS protection
- Security headers with Helmet

## Error Handling

The API uses consistent error response format:
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message (development only)"
}
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.
