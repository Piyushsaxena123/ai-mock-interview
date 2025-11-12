import dayjs from "dayjs";
import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";

import {
  getFeedbackByInterviewId,
  getInterviewById,
} from "@/lib/actions/general.action";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/actions/auth.action";

// Define the type for the parsed category score
interface CategoryScore {
  name: string;
  score: number;
  comment: string;
}

const Feedback = async ({ params }: { params: { id: string } }) => {
  const { id } = params;
  const user = await getCurrentUser();

  // --- FIX 1: Check for user ---
  if (!user) {
    redirect("/sign-in");
  }

  const interview = await getInterviewById(id);
  if (!interview) {
    redirect("/");
  }

  const feedback = await getFeedbackByInterviewId({
    interviewId: id,
    userId: user.id, // User is guaranteed to exist here
  });

  // --- FIX 2: Check for NULL feedback ---
  // This is the main crash. If feedback failed to save, we redirect.
  if (!feedback) {
    console.log("No feedback found, redirecting to home.");
    redirect("/");
  }
  // --- END OF FIX 2 ---

  // --- FIX 3: Parse the STRING data from Firestore ---
  let categoryScores: CategoryScore[] = [];
  let strengths: string[] = [];
  let areasForImprovement: string[] = [];

  try {
    // Safely parse the JSON string
    if (feedback.categoryScores) {
      categoryScores = JSON.parse(feedback.categoryScores);
    }
  } catch (e) {
    console.error("Failed to parse categoryScores:", e);
    // categoryScores will remain an empty array
  }

  try {
    // Safely parse the strengths string (which is a bulleted list)
    if (feedback.strengths) {
      // Split by newline and remove the "- " prefix
      strengths = feedback.strengths.split('\n').map(s => s.replace(/^- /, ''));
    }
  } catch (e) {
    console.error("Failed to parse strengths:", e);
  }

  try {
    // Safely parse the areasForImprovement string
    if (feedback.areasForImprovement) {
      // Split by newline and remove the "- " prefix
      areasForImprovement = feedback.areasForImprovement.split('\n').map(s => s.replace(/^- /, ''));
    }
  } catch (e) {
    console.error("Failed to parse areasForImprovement:", e);
  }
  // --- END OF FIX 3 ---

  return (
    <section className="section-feedback">
      <div className="flex flex-row justify-center">
        <h1 className="text-4xl font-semibold">
          Feedback on the Interview -{" "}
          <span className="capitalize">{interview.role}</span> Interview
        </h1>
      </div>

      <div className="flex flex-row justify-center ">
        <div className="flex flex-row gap-5">
          {/* Overall Impression */}
          <div className="flex flex-row gap-2 items-center">
            <Image src="/star.svg" width={22} height={22} alt="star" />
            <p>
              Overall Impression:{" "}
              <span className="text-primary-200 font-bold">
                {feedback.totalScore}
              </span>
              /100
            </p>
          </div>

          {/* Date */}
          <div className="flex flex-row gap-2">
            <Image src="/calendar.svg" width={22} height={22} alt="calendar" />
            <p>
              {feedback.createdAt
                ? dayjs(feedback.createdAt).format("MMM D, YYYY h:mm A")
                : "N/A"}
            </p>
          </div>
        </div>
      </div>

      <hr />

      <p>{feedback.finalAssessment}</p>

      {/* Interview Breakdown */}
      <div className="flex flex-col gap-4">
        <h2>Breakdown of the Interview:</h2>
        {/* Use the parsed categoryScores variable */}
        {categoryScores.map((category, index) => (
          <div key={index}>
            <p className="font-bold">
              {index + 1}. {category.name} ({category.score}/100)
            </p>
            <p>{category.comment}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        <h3>Strengths</h3>
        <ul>
          {/* Use the parsed strengths variable */}
          {strengths.map((strength, index) => (
            <li key={index}>{strength}</li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-3">
        <h3>Areas for Improvement</h3>
        <ul>
          {/* Use the parsed areasForImprovement variable */}
          {areasForImprovement.map((area, index) => (
            <li key={index}>{area}</li>
          ))}
        </ul>
      </div>

      <div className="buttons">
        <Button className="btn-secondary flex-1">
          <Link href="/" className="flex w-full justify-center">
            <p className="text-sm font-semibold text-primary-200 text-center">
              Back to dashboard
            </p>
          </Link>
        </Button>

        <Button className="btn-primary flex-1">
          <Link
            href={`/interview/${id}`}
            className="flex w-full justify-center"
          >
            <p className="text-sm font-semibold text-black text-center">
              Retake Interview
            </p>
          </Link>
        </Button>
      </div>
    </section>
  );
};

export default Feedback;