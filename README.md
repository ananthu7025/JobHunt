# Resume Scanner Backend API

A Node.js/TypeScript backend API for scanning and analyzing resumes against job descriptions using Google's Gemini AI.

## Features

- **User Authentication**: JWT-based authentication with role-based access (HR/Admin)
- **Job Management**: CRUD operations for job descriptions
- **Resume Analysis**: AI-powered resume scanning and scoring using Gemini AI
- **Candidate Ranking**: Rank candidates based on their overall resume score for a specific job.
- **File Upload**: Support for PDF, DOC, and DOCX resume files
- **Scoring System**: Comprehensive scoring based on skills, experience, education, and keywords
- **Data Persistence**: MongoDB integration with Mongoose ODM
- **Telegram Bot Integration**: Manage candidates and question sets through a Telegram bot.
- **Dynamic Cover Letter Generation**: Automatically generates a personalized cover letter for each candidate using Gemini AI.
- **Automated Emailing**: Sends the candidate's resume and cover letter to HR from the candidate's perspective.

## User Journey (HR Perspective)

1.  **Register and Log In**: An HR user registers for an account and logs in to receive a JWT token for authenticating subsequent requests.
2.  **Create a Job Description**: The HR user creates a new job description, specifying the title, required skills, experience, and other relevant details.
3.  **Scan Resumes**: The HR user scans resumes for the created job. The system analyzes each resume against the job description, generating a detailed score.
4.  **Rank Candidates**: After scanning multiple resumes, the HR user can retrieve a ranked list of the top candidates for the job based on their overall scores.
5.  **Manage Candidates via Telegram (Optional)**: The HR user can use a Telegram bot to interact with candidates, manage question sets, and view statistics.

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

All endpoints are prefixed with `/api`.

### Authentication (`/auth`)

-   `POST /register`: Register a new user.
-   `POST /login`: Log in an existing user and receive a JWT token.
-   `GET /profile`: Get the profile of the currently authenticated user.

### Job Management (`/jobs`)

-   `POST /`: Create a new job description.
-   `GET /`: Get a list of all job descriptions.
-   `GET /:id`: Get a specific job description by its ID.
-   `PUT /:id`: Update an existing job description.
-   `DELETE /:id`: Delete a job description.

### Resume Analysis (`/resume`)

-   `POST /scan`: Scan a resume against a job description. Requires a file upload and a `jobId`.
-   `GET /scores`: Get a list of all resume scores, with optional filtering.
-   `GET /scores/:id`: Get a specific resume score by its ID.

### Candidate Management (`/candidates`)

-   `GET /`: Get a list of all completed candidates.
-   `GET /all`: Get a list of all candidates, including incomplete ones.
-   `GET /stats`: Get statistics about candidates.
-   `GET /export`: Export candidate data.
-   `GET /rank`: Get a ranked list of top candidates for a specific job. Requires a `jobId` query parameter.
-   `GET /:telegramId`: Get a candidate by their Telegram ID.
-   `DELETE /:telegramId`: Delete a candidate by their Telegram ID.
-   `GET /questionset/:questionSetId/responses/:field`: Get candidate responses for a specific field in a question set.

### Question Set Management (`/question-sets`)

-   `POST /`: Create a new question set.
-   `GET /`: Get a list of all question sets.
-   `GET /active`: Get a list of all active question sets.
-   `GET /:id`: Get a specific question set by its ID.
-   `PUT /:id`: Update an existing question set.
-   `DELETE /:id`: Delete a question set.
-   `POST /:id/duplicate`: Duplicate an existing question set.
-   `PATCH /:id/set-default`: Set a question set as the default.

### Telegram Bot (`/bot`)

-   `GET /stats`: Get statistics about the bot.
-   `GET /info`: Get information about the bot.
-   `GET /questionsets`: Get a list of all question sets available to the bot.
-   `POST /questionsets/set-active`: Set the active question set for the bot.
-   `POST /broadcast`: Send a broadcast message to all candidates.

## Environment Variables

Create a `.env` file in the root directory:

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/resume_scanner
JWT_SECRET=your_jwt_secret_key_here
GEMINI_API_KEY=your_gemini_api_key_here
CORS_ORIGIN=http://localhost:3000
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
```

## Installation & Setup

1.  **Install dependencies**:
    ```bash
    npm install
    ```
2.  **Set up environment variables**:
    -   Copy the environment variables above to your `.env` file
    -   Replace `your_jwt_secret_key_here` with a secure random string
    -   Replace `your_gemini_api_key_here` with your Google Gemini API key
3.  **Start MongoDB**:
    -   Make sure MongoDB is running on your system
    -   Default connection: `mongodb://localhost:27017/resume_scanner`
4.  **Run the application**:
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

### Rank Candidates

```bash
curl -X GET "http://localhost:5000/api/candidates/rank?jobId=JOB_ID_HERE&limit=5" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Resume Scoring

The system provides comprehensive scoring based on:

-   **Skills Match** (30%): How well candidate skills match job requirements
-   **Experience Match** (25%): Relevance of candidate experience
-   **Education Match** (20%): Educational background alignment
-   **Keywords Match** (25%): Presence of job-specific keywords

Each resume analysis includes:

-   Overall score (0-100)
-   Individual category scores
-   Matched and missing skills
-   Experience analysis
-   Strengths and weaknesses
-   Improvement recommendations

## Security Features

-   JWT-based authentication
-   Password hashing with bcryptjs
-   Role-based access control
-   Request validation with Joi
-   File upload restrictions
-   CORS protection
-   Security headers with Helmet

## Error Handling

The API uses a consistent error response format:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message (development only)"
}
```

## Contributing

1.  Fork the repository
2.  Create a feature branch
3.  Make your changes
4.  Add tests if applicable
5.  Submit a pull request

## License

This project is licensed under the MIT License.
