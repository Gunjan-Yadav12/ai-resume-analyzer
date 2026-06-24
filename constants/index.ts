// constants/index.ts
// Sample resume data used for UI development and testing.
// These are hardcoded resumes that appear before any real uploads exist.
// WHY KEEP THESE?
// When you're building and testing UI components, you don't want to
// upload a real PDF every single time just to see how a resume card looks.
// These give you instant test data that matches the exact shape your
// real data will have — same fields, same structure, just hardcoded values.


export const resumes: Resume[] = [
  {
    id: "1",
    companyName: "Google",
    jobTitle: "Frontend Developer",
    imageUrl: "/images/resume_01.png",
    resumeUrl: "/resumes/resume-1.pdf",
    feedback: {
      overallScore: 85,
      ATS: { score: 88, tips: [] },
      toneAndStyle: { score: 82, tips: [] },
      content: { score: 86, tips: [] },
      structure: { score: 84, tips: [] },
      skills: { score: 87, tips: [] },
    },
  },
  {
    id: "2",
    companyName: "Microsoft",
    jobTitle: "Cloud Engineer",
    imageUrl: "/images/resume_02.png",
    resumeUrl: "/resumes/resume-2.pdf",
    feedback: {
      overallScore: 55,
      ATS: { score: 52, tips: [] },
      toneAndStyle: { score: 58, tips: [] },
      content: { score: 54, tips: [] },
      structure: { score: 56, tips: [] },
      skills: { score: 53, tips: [] },
    },
  },
  {
    id: "3",
    companyName: "Apple",
    jobTitle: "iOS Developer",
    imageUrl: "/images/resume_03.png",
    resumeUrl: "/resumes/resume-3.pdf",
    feedback: {
      overallScore: 75,
      ATS: { score: 77, tips: [] },
      toneAndStyle: { score: 73, tips: [] },
      content: { score: 74, tips: [] },
      structure: { score: 76, tips: [] },
      skills: { score: 78, tips: [] },
    },
  },
  {
    id: "4",
    companyName: "Google",
    jobTitle: "Frontend Developer",
    imageUrl: "/images/resume_01.png",
    resumeUrl: "/resumes/resume-1.pdf",
    feedback: {
      overallScore: 85,
      ATS: { score: 88, tips: [] },
      toneAndStyle: { score: 82, tips: [] },
      content: { score: 86, tips: [] },
      structure: { score: 84, tips: [] },
      skills: { score: 87, tips: [] },
    },
  },
  {
    id: "5",
    companyName: "Microsoft",
    jobTitle: "Cloud Engineer",
    imageUrl: "/images/resume_02.png",
    resumeUrl: "/resumes/resume-2.pdf",
    feedback: {
      overallScore: 55,
      ATS: { score: 52, tips: [] },
      toneAndStyle: { score: 58, tips: [] },
      content: { score: 54, tips: [] },
      structure: { score: 56, tips: [] },
      skills: { score: 53, tips: [] },
    },
  },
  {
    id: "6",
    companyName: "Apple",
    jobTitle: "iOS Developer",
    imageUrl: "/images/resume_03.png",
    resumeUrl: "/resumes/resume-3.pdf",
    feedback: {
      overallScore: 75,
      ATS: { score: 77, tips: [] },
      toneAndStyle: { score: 73, tips: [] },
      content: { score: 74, tips: [] },
      structure: { score: 76, tips: [] },
      skills: { score: 78, tips: [] },
    },
  },
];

// ─────────────────────────────────────────────────────────────
// AI RESPONSE FORMAT
// ─────────────────────────────────────────────────────────────
// This is a TypeScript interface written as a STRING — not actual TS code.
// We embed it directly in the prompt sent to Gemini.
//
// WHY SEND A TYPESCRIPT INTERFACE TO AN AI?
// Gemini is trained on vast amounts of code including TypeScript.
// It understands TypeScript interfaces as a precise, unambiguous
// description of data structure. Sending the interface as part of
// the prompt is more reliable than saying "return JSON with these fields"
// in plain English because:
//   1. TypeScript interfaces are exact — no room for interpretation
//   2. The field names, types, and nesting are unambiguous
//   3. Gemini has seen millions of TypeScript interfaces in training
//      and knows exactly how to produce data that satisfies them
//   4. Combined with responseMimeType: 'application/json' in gemini.ts,
//      Gemini is constrained to produce valid JSON matching this shape
//
// The comments inside (//max 100, //give 3-4 tips) are also read by
// Gemini — they act as inline instructions for that specific field.
// This is a prompt engineering technique: embed instructions as close
// as possible to the field they apply to, not in a separate paragraph.
export const AIResponseFormat = `
{
  "overallScore": 0,
  "ATS": {
    "score": 0,
    "tips": [
      {
        "type": "good",
        "tip": "string",
        "explanation": "string"
      },
      {
        "type": "improve",
        "tip": "string",
        "explanation": "string"
      }
    ]
  },
  "toneAndStyle": {
    "score": 0,
    "tips": [
      {
        "type": "good",
        "tip": "string",
        "explanation": "string"
      },
      {
        "type": "improve",
        "tip": "string",
        "explanation": "string"
      }
    ]
  },
  "content": {
    "score": 0,
    "tips": [
      {
        "type": "good",
        "tip": "string",
        "explanation": "string"
      },
      {
        "type": "improve",
        "tip": "string",
        "explanation": "string"
      }
    ]
  },
  "structure": {
    "score": 0,
    "tips": [
      {
        "type": "good",
        "tip": "string",
        "explanation": "string"
      },
      {
        "type": "improve",
        "tip": "string",
        "explanation": "string"
      }
    ]
  },
  "skills": {
    "score": 0,
    "tips": [
      {
        "type": "good",
        "tip": "string",
        "explanation": "string"
      },
      {
        "type": "improve",
        "tip": "string",
        "explanation": "string"
      }
    ]
  }
}
`;

export const prepareInstructions = ({
    jobTitle,
    jobDescription,
}: {
    jobTitle: string;
    jobDescription: string;
}) => `
You are an expert ATS and resume reviewer.

Analyze the resume against:
1. ATS compatibility
2. tone and style
3. content quality
4. structure and formatting
5. skills relevance

Use the provided job title and job description to judge relevance.

Job title: ${jobTitle || 'Not provided'}
Job description: ${jobDescription || 'Not provided'}

Return ONLY valid JSON.
No markdown.
No backticks.
No explanation outside JSON.
No trailing commas.

Rules:
- Every score must be an integer from 0 to 100.
- Be strict if the resume is weak.
- Give actionable feedback, not generic praise.
- For each category, include at least 3 tips.
- Prefer "improve" tips unless the resume is genuinely strong.
- Each "improve" tip must explain exactly what should be changed.

Return JSON in exactly this shape:

{
  "overallScore": 0,
  "ATS": {
    "score": 0,
    "tips": [
      {
        "type": "good",
        "tip": "string",
        "explanation": "string"
      },
      {
        "type": "improve",
        "tip": "string",
        "explanation": "string"
      }
    ]
  },
  "toneAndStyle": {
    "score": 0,
    "tips": [
      {
        "type": "good",
        "tip": "string",
        "explanation": "string"
      },
      {
        "type": "improve",
        "tip": "string",
        "explanation": "string"
      }
    ]
  },
  "content": {
    "score": 0,
    "tips": [
      {
        "type": "good",
        "tip": "string",
        "explanation": "string"
      },
      {
        "type": "improve",
        "tip": "string",
        "explanation": "string"
      }
    ]
  },
  "structure": {
    "score": 0,
    "tips": [
      {
        "type": "good",
        "tip": "string",
        "explanation": "string"
      },
      {
        "type": "improve",
        "tip": "string",
        "explanation": "string"
      }
    ]
  },
  "skills": {
    "score": 0,
    "tips": [
      {
        "type": "good",
        "tip": "string",
        "explanation": "string"
      },
      {
        "type": "improve",
        "tip": "string",
        "explanation": "string"
      }
    ]
  }
}
`;