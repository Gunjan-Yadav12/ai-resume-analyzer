declare interface FeedbackTip {
  type: "good" | "improve";
  tip: string;
  explanation?: string;
}

declare interface FeedbackCategory {
  score: number;
  tips: FeedbackTip[];
}

declare interface Feedback {
  overallScore: number;
  ATS: FeedbackCategory;
  toneAndStyle: FeedbackCategory;
  content: FeedbackCategory;
  structure: FeedbackCategory;
  skills: FeedbackCategory;
}

declare interface Resume {
  id: string;
  companyName: string;
  jobTitle: string;
  feedback: Feedback;

  // optional because old sample cards use them,
  // but sessionStorage analysis may not have them
  imageUrl?: string;
  resumeUrl?: string;
  jobDescription?: string;
  createdAt?: number;
}