"use server";

import { generateObject } from "ai";
import { google } from "@ai-sdk/google";

import { db } from "@/firebase/admin";
import { feedbackSchema } from "@/constants";

// --- FIX: Added all type definitions ---
interface Feedback {
  id: string;
  interviewId: string;
  totalScore: number;
  categoryScores: string;
  strengths: string;
  areasForImprovement: string;
  finalAssessment: string;
  createdAt: string;
}

interface Interview {
  id: string;
  role: string;
  level: string;
  questions: string[];
  techstack: string[];
  createdAt: string;
  userId: string;
  type: string;
  finalized: boolean;
}

interface CreateFeedbackParams {
  interviewId: string;
  userId: string;
  transcript: { role: string; content: string }[];
  feedbackId?: string;
}

interface GetFeedbackByInterviewIdParams {
  interviewId: string;
  userId: string;
}

interface GetLatestInterviewsParams {
  userId: string;
  limit?: number;
}
// --- END OF FIX ---


// NEW FUNCTION TO CREATE THE INTERVIEW *BEFORE* THE CALL
export async function createInterview(params: {
  userId: string;
  role: string;
  level: string;
  techstack: string[];
  type: string;
}) {
  const { userId, role, level, techstack, type } = params;

  try {
    const interviewRef = db.collection("interviews").doc();
    const newInterview = {
      id: interviewRef.id,
      userId,
      role,
      level,
      techstack,
      type,
      questions: [], // You can populate this later if needed
      finalized: false, // Set to true after feedback is generated
      createdAt: new Date().toISOString(),
    };

    await interviewRef.set(newInterview);
    return { success: true, interviewId: interviewRef.id };
  } catch (error) {
    console.error("Error creating interview:", error);
    return { success: false };
  }
}

export async function createFeedback(params: CreateFeedbackParams) {
  const { interviewId, userId, transcript, feedbackId } = params;

  // FIX: Prevent crash if interviewId is missing
  if (!interviewId) {
    console.error("Error saving feedback: interviewId is undefined.");
    return { success: false };
  }
  
  try {
    const formattedTranscript = transcript
      .map(
        (sentence: { role: string; content: string }) =>
          `- ${sentence.role}: ${sentence.content}\n`
      )
      .join("");

    // --- THIS IS THE CORRECTED PROMPT ---
    const { object } = await generateObject({
      model: google("gemini-1.5-pro"),
      schema: feedbackSchema,
      prompt: `
        You are an AI interviewer analyzing a mock interview. Your task is to evaluate the candidate based on structured categories. Be thorough and detailed in your analysis. Don't be lenient. If there are mistakes, point them out.
        
        Transcript:
        ${formattedTranscript}

        Please score the candidate from 0 to 100 in the following 5 areas:
        - **Communication Skills**: Clarity, articulation, structured responses.
        - **Technical Knowledge**: Understanding of key concepts for the role.
        - **Problem-Solving**: Ability to analyze problems and propose solutions.
        - **Cultural & Role Fit**: Alignment with company values and job role.
        - **Confidence & Clarity**: Confidence in responses, engagement, and clarity.

        ---
        IMPORTANT OUTPUT FORMATTING INSTRUCTIONS:
        1.  For 'categoryScores', you MUST return a valid, single-line, minified JSON string of an array. Do not include any newlines. Example: '[{"name":"Communication Skills","score":80,"comment":"Very clear."},{"name":"Technical Knowledge","score":75,"comment":"A bit weak on..."}]'
        2.  For 'strengths', you MUST return a single string containing a bulleted list (using '-'). Example: '- Good problem solving\n- Clear communication'
        3.  For 'areasForImprovement', you MUST return a single string containing a bulleted list (using '-'). Example: '- Needs more detailed examples\n- Should speak more confidently'
        4.  For 'totalScore', you MUST calculate and return the average of the 5 category scores.
        ---
      `,
      system:
        "You are a professional interviewer analyzing a mock interview. Your task is to evaluate the candidate based on structured categories",
    });
    // --- END OF CORRECTED PROMPT ---

    const feedback = {
      interviewId: interviewId,
      userId: userId,
      totalScore: object.totalScore,
      categoryScores: object.categoryScores,
      strengths: object.strengths,
      areasForImprovement: object.areasForImprovement,
      finalAssessment: object.finalAssessment,
      createdAt: new Date().toISOString(),
    };

    let feedbackRef;

    if (feedbackId) {
      feedbackRef = db.collection("feedback").doc(feedbackId);
    } else {
      feedbackRef = db.collection("feedback").doc();
    }

    await feedbackRef.set(feedback);
    
    // After feedback is saved, finalize the interview
    await db.collection("interviews").doc(interviewId).update({ finalized: true });

    return { success: true, feedbackId: feedbackRef.id };
  } catch (error) {
    console.error("Error saving feedback:", error);
    return { success: false };
  }
}

export async function getInterviewById(id: string): Promise<Interview | null> {
  if (!id) return null; // FIX: Add check
  const interview = await db.collection("interviews").doc(id).get();
  return interview.data() as Interview | null;
}

export async function getFeedbackByInterviewId(
  params: GetFeedbackByInterviewIdParams
): Promise<Feedback | null> {
  const { interviewId, userId } = params;

  // FIX: Add check for undefined values
  if (!userId || !interviewId) {
    return null;
  }

  const querySnapshot = await db
    .collection("feedback")
    .where("interviewId", "==", interviewId)
    .where("userId", "==", userId)
    .limit(1)
    .get();

  if (querySnapshot.empty) return null;

  const feedbackDoc = querySnapshot.docs[0];
  return { id: feedbackDoc.id, ...feedbackDoc.data() } as Feedback;
}

export async function getLatestInterviews(
  params: GetLatestInterviewsParams
): Promise<Interview[] | null> {
  const { userId, limit = 20 } = params;

  // FIX: Add check for undefined user
  if (!userId) {
    return []; // Return an empty array
  }

  const interviews = await db
    .collection("interviews")
    .orderBy("createdAt", "desc")
    .where("finalized", "==", true)
    .limit(limit)
    .get();

  return interviews.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Interview[];
}

export async function getInterviewsByUserId(
  userId: string
): Promise<Interview[] | null> {
  // --- THIS IS THE FIX for the 'undefined' userId homepage error ---
  if (!userId) {
    return []; // Return an empty array
  }
  // --- END OF FIX ---

  const interviews = await db
    .collection("interviews")
    .where("userId", "==", userId)
    .orderBy("createdAt", "desc")
    .get();

  return interviews.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Interview[];
}