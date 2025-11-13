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

// Interfaces
interface CategoryScore {
  name: string;
  score: number;
  comment: string;
}

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

interface RouteParams {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string>>;
}

const FeedbackPage = async ({ params }: RouteParams) => {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const interview = await getInterviewById(id);
  if (!interview) redirect("/");

  const feedback = await getFeedbackByInterviewId({
    interviewId: id,
    userId: user.id,
  });

  if (!feedback) {
    console.log("No feedback found, redirecting to home.");
    redirect("/");
  }

  // Parse feedback fields
  let categoryScores: CategoryScore[] = [];
  let strengths: string[] = [];
  let areasForImprovement: string[] = [];

  try {
    categoryScores = feedback.categoryScores
      ? JSON.parse(feedback.categoryScores)
      : [];
  } catch (e) {
    console.error("Failed to parse categoryScores:", e);
  }

  try {
    strengths = feedback.strengths
      ? feedback.strengths.split("\n").map((s) => s.replace(/^- /, ""))
      : [];
  } catch (e) {
    console.error("Failed to parse strengths:", e);
  }

  try {
    areasForImprovement = feedback.areasForImprovement
      ? feedback.areasForImprovement.split("\n").map((s) => s.replace(/^- /, ""))
      : [];
  } catch (e) {
    console.error("Failed to parse areasForImprovement:", e);
  }

  return (
    <section className="section-feedback">
      <div className="flex flex-row justify-center">
        <h1 className="text-4xl font-semibold">
          Feedback on the Interview –{" "}
          <span className="capitalize">{interview.role}</span>
        </h1>
      </div>

      <div className="flex flex-row justify-center mt-4">
        <div className="flex flex-row gap-5">
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

          <div className="flex flex-row gap-2 items-center">
            <Image src="/calendar.svg" width={22} height={22} alt="calendar" />
            <p>
              {feedback.createdAt
                ? dayjs(feedback.createdAt).format("MMM D, YYYY h:mm A")
                : "N/A"}
            </p>
          </div>
        </div>
      </div>

      <hr className="my-6" />

      <p className="text-lg">{feedback.finalAssessment}</p>

      <div className="mt-8 flex flex-col gap-4">
        <h2 className="text-xl font-bold">Breakdown of the Interview:</h2>
        {categoryScores.map((category, index) => (
          <div key={index}>
            <p className="font-bold">
              {index + 1}. {category.name} ({category.score}/100)
            </p>
            <p>{category.comment}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 flex flex-col gap-3">
        <h3 className="text-lg font-semibold">Strengths</h3>
        <ul>
          {strengths.map((strength, index) => (
            <li key={index}>• {strength}</li>
          ))}
        </ul>
      </div>

      <div className="mt-8 flex flex-col gap-3">
        <h3 className="text-lg font-semibold">Areas for Improvement</h3>
        <ul>
          {areasForImprovement.map((area, index) => (
            <li key={index}>• {area}</li>
          ))}
        </ul>
      </div>

      <div className="buttons mt-10 flex gap-4">
        <Button className="btn-secondary flex-1">
          <Link href="/" className="w-full text-center">
            <p className="text-sm font-semibold text-primary-200">
              Back to dashboard
            </p>
          </Link>
        </Button>

        <Button className="btn-primary flex-1">
          <Link href={`/interview/${id}`} className="w-full text-center">
            <p className="text-sm font-semibold text-black">
              Retake Interview
            </p>
          </Link>
        </Button>
      </div>
    </section>
  );
};

export default FeedbackPage;
