"use server";

import { generateObject } from "ai";
import { google } from "@ai-sdk/google";

import { db } from "@/firebase/admin";
import { feedbackSchema } from "@/constants";

// ------------------- TYPES -------------------

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

// ------------------- CREATE INTERVIEW -------------------

export async function createInterview(params: {
  userId: string;
  role: string;
  level: string;
  techstack: string[];
  type: string;
}) {
  try {
    const interviewRef = db.collection("interviews").doc();

    await interviewRef.set({
      id: interviewRef.id,
      ...params,
      questions: [],
      finalized: false,
      createdAt: new Date().toISOString(),
    });

    return { success: true, interviewId: interviewRef.id };
  } catch (error) {
    console.error("Error creating interview:", error);
    return { success: false };
  }
}

// ------------------- CREATE FEEDBACK -------------------

export async function createFeedback(params: CreateFeedbackParams) {
  const { interviewId, userId, transcript, feedbackId } = params;

  if (!interviewId) {
    console.error("Error saving feedback: Missing interviewId");
    return { success: false };
  }

  try {
    const formattedTranscript = transcript
      .map((s) => `- ${s.role}: ${s.content}\n`)
      .join("");

    const { object } = await generateObject({
      model: google("gemini-1.5-pro"),
      schema: feedbackSchema,
      prompt: `
        Analyze the mock interview below and generate structured feedback.

        Transcript:
        ${formattedTranscript}

        Score the candidate in these 5 categories:
        - Communication Skills
        - Technical Knowledge
        - Problem-Solving
        - Cultural & Role Fit
        - Confidence & Clarity
        
        Follow ALL formatting rules in the schema.
      `,
    });

    const feedbackRef = feedbackId
      ? db.collection("feedback").doc(feedbackId)
      : db.collection("feedback").doc();

    await feedbackRef.set({
      interviewId,
      userId,
      totalScore: object.totalScore,
      categoryScores: object.categoryScores,
      strengths: object.strengths,
      areasForImprovement: object.areasForImprovement,
      finalAssessment: object.finalAssessment,
      createdAt: new Date().toISOString(),
    });

    await db.collection("interviews").doc(interviewId).update({
      finalized: true,
    });

    return { success: true, feedbackId: feedbackRef.id };
  } catch (error) {
    console.error("Error saving feedback:", error);
    return { success: false };
  }
}

// ------------------- FETCH FUNCTIONS -------------------

export async function getInterviewById(id: string) {
  if (!id) return null;
  const snap = await db.collection("interviews").doc(id).get();
  return snap.data() as Interview | null;
}

export async function getFeedbackByInterviewId(params: {
  interviewId: string;
  userId: string;
}) {
  const { interviewId, userId } = params;
  if (!interviewId || !userId) return null;

  const snap = await db
    .collection("feedback")
    .where("interviewId", "==", interviewId)
    .where("userId", "==", userId)
    .limit(1)
    .get();

  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() } as Feedback;
}

export async function getInterviewsByUserId(userId: string) {
  if (!userId) return [];

  const snap = await db
    .collection("interviews")
    .where("userId", "==", userId)
    .orderBy("createdAt", "desc")
    .get();

  return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Interview[];
}

export async function getLatestInterviews(params: {
  userId: string;
  limit?: number;
}) {
  const { userId, limit = 20 } = params;
  if (!userId) return [];

  const snap = await db
    .collection("interviews")
    .orderBy("createdAt", "desc")
    .where("finalized", "==", true)
    .limit(limit)
    .get();

  return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Interview[];
}
