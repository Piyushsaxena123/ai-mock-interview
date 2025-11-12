"use client";

import Image from "next/image";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { vapi } from "@/lib/vapi.sdk";
import { interviewer } from "@/constants";
import { createFeedback, createInterview } from "@/lib/actions/general.action";

// --- ADD THESE INTERFACES TO THE TOP OF Agent.tsx ---
enum CallStatus {
  INACTIVE = "INACTIVE",
  CONNECTING = "CONNECTING",
  ACTIVE = "ACTIVE",
  FINISHED = "FINISHED",
}

interface SavedMessage {
  role: "user" | "system" | "assistant";
  content: string;
}

interface AgentProps {
  userName: string;
  userId?: string;
  interviewId?: string;
  feedbackId?: string;
  type: "generate" | "interview";
  questions?: string[];
  role?: string;
  level?: string;
  techstack?: string[];
}

enum MessageTypeEnum { TRANSCRIPT = "transcript", FUNCTION_CALL = "function-call", FUNCTION_CALL_RESULT = "function-call-result", ADD_MESSAGE = "add-message" }
enum MessageRoleEnum { USER = "user", SYSTEM = "system", ASSISTANT = "assistant" }
enum TranscriptMessageTypeEnum { PARTIAL = "partial", FINAL = "final" }
interface BaseMessage { type: MessageTypeEnum; }
interface TranscriptMessage extends BaseMessage { type: MessageTypeEnum.TRANSCRIPT; role: MessageRoleEnum; transcriptType: TranscriptMessageTypeEnum; transcript: string; }
interface FunctionCallMessage extends BaseMessage { type: MessageTypeEnum.FUNCTION_CALL; functionCall: { name: string; parameters: unknown; }; }
interface FunctionCallResultMessage extends BaseMessage { type: MessageTypeEnum.FUNCTION_CALL_RESULT; functionCallResult: { forwardToClientEnabled?: boolean; result: unknown; [a: string]: unknown; }; }
type Message = TranscriptMessage | FunctionCallMessage | FunctionCallResultMessage;
// --- END OF FIX ---

const Agent = ({
  userName,
  userId,
  interviewId,
  feedbackId,
  type,
  questions,
  role = "Frontend Developer",
  level = "Junior",
  techstack = ["React", "Next.js"],
}: AgentProps) => {
  const router = useRouter();
  const [callStatus, setCallStatus] = useState<CallStatus>(CallStatus.INACTIVE);
  const [messages, setMessages] = useState<SavedMessage[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [lastMessage, setLastMessage] = useState<string>("");
  const [currentInterviewId, setCurrentInterviewId] = useState(interviewId);

  // --- THIS IS THE FIX FOR BUG #1 ---
  // We remove the `if (type === "generate")` check
  // so that feedback is generated for *all* interview types.
  const handleGenerateFeedback = useCallback(async (transcript: SavedMessage[]) => {
    console.log("handleGenerateFeedback triggered with", transcript.length, "messages");

    try {
      const { success, feedbackId: id } = await createFeedback({
        interviewId: currentInterviewId!,
        userId: userId!,
        transcript: transcript,
        feedbackId: feedbackId,
      });

      if (success && id) {
        // This is the correct redirect
        router.push(`/interview/${currentInterviewId}/feedback`);
      } else {
        console.log("Error saving feedback from createFeedback");
        toast.error("Sorry, we couldn't save your feedback.");
        router.push("/");
      }
    } catch (error) {
      console.error("Error in handleGenerateFeedback:", error);
      toast.error("An error occurred while generating feedback.");
      router.push("/");
    }
  }, [currentInterviewId, userId, feedbackId, router]); // Removed 'type' from dependencies

  useEffect(() => {
    const onCallStart = () => setCallStatus(CallStatus.ACTIVE);

    const onCallEnd = () => {
      console.log("Call ended. Triggering feedback generation.");
      setCallStatus(CallStatus.FINISHED);

      setMessages((currentMessages) => {
        if (currentMessages.length > 0) {
          handleGenerateFeedback(currentMessages);
        } else {
          console.log("No messages recorded, redirecting.");
          router.push("/");
        }
        return currentMessages;
      });
    };

enum CallStatus {
  INACTIVE = "INACTIVE",
  CONNECTING = "CONNECTING",
  ACTIVE = "ACTIVE",
  FINISHED = "FINISHED",
}

interface SavedMessage {
  role: "user" | "system" | "assistant";
  content: string;
}



    const onMessage = (message: Message) => {
      if (message.type === "transcript" && message.transcriptType === "final") {
        const newMessage = { role: message.role, content: message.transcript };
        setMessages((prev) => [...prev, newMessage]);
        setLastMessage(newMessage.content);
      }
    };

    const onSpeechStart = () => setIsSpeaking(true);
    const onSpeechEnd = () => setIsSpeaking(false);
    const onError = (error: Error) => console.log("Vapi Error:", error);

    vapi.on("call-start", onCallStart);
    vapi.on("call-end", onCallEnd);
    vapi.on("message", onMessage);
    vapi.on("speech-start", onSpeechStart);
    vapi.on("speech-end", onSpeechEnd);
    vapi.on("error", onError);

    return () => {
      vapi.off("call-start", onCallStart);
      vapi.off("call-end", onCallEnd);
      vapi.off("message", onMessage);
      vapi.off("speech-start", onSpeechStart);
      vapi.off("speech-end", onSpeechEnd);
      vapi.off("error", onError);
    };
  }, [handleGenerateFeedback, router]);

  useEffect(() => {
    if (messages.length > 0) {
      setLastMessage(messages[messages.length - 1].content);
    }
  }, [messages]);

  const handleCall = async () => {
    setCallStatus(CallStatus.CONNECTING);
    let idToCall = currentInterviewId;

    if (type === "generate" && !idToCall) {
      try {
        const interviewParams = {
          userId: userId!,
          role: role,
          level: level,
          techstack: techstack,
          type: "generate",
        };
        const { success, interviewId: newId } = await createInterview(interviewParams);
        
        if (success && newId) {
          idToCall = newId;
          setCurrentInterviewId(newId);
        } else {
          toast.error("Could not create interview. Please try again.");
          setCallStatus(CallStatus.INACTIVE);
          return;
        }
      } catch (error) {
        toast.error("Error creating interview.");
        setCallStatus(CallStatus.INACTIVE);
        return;
      }
    }

    if (type === "generate") {
      await vapi.start(process.env.NEXT_PUBLIC_VAPI_WORKFLOW_ID!, {
        variableValues: {
          username: userName,
          userid: userId,
        },
      });
    } else {
      let formattedQuestions = "";
      if (questions) {
        formattedQuestions = questions
          .map((question) => `- ${question}`)
          .join("\n");
      }
      await vapi.start(interviewer, {
        variableValues: {
          questions: formattedQuestions,
        },
      });
    }
  };

  const handleDisconnect = () => {
    setCallStatus(CallStatus.FINISHED);
    vapi.stop();
  };

  return (
    <>
      <div className="call-view">
        {/* AI Interviewer Card */}
        <div className="card-interviewer">
          <div className="avatar">
            <Image
              src="/ai-avatar.png"
              alt="profile-image"
              width={65}
              height={54}
              className="object-cover"
            />
            {isSpeaking && <span className="animate-speak" />}
          </div>
          <h3>AI Interviewer</h3>
        </div>

        {/* User Profile Card */}
        <div className="card-border">
          <div className="card-content">
            <Image
              src="/user-avatar.png"
              alt="profile-image"
              width={539}
              height={539}
              className="rounded-full object-cover size-[120px]"
            />
            <h3>{userName}</h3>
          </div>
        </div>
      </div>

      {messages.length > 0 && (
        <div className="transcript-border">
          <div className="transcript">
            <p
              key={lastMessage}
              className={cn(
                "transition-opacity duration-500 opacity-0",
                "animate-fadeIn opacity-100"
              )}
            >
              {lastMessage}
            </p>
          </div>
        </div>
      )}

      <div className="w-full flex justify-center">
        {callStatus !== "ACTIVE" ? (
          <button className="relative btn-call" onClick={() => handleCall()}>
            <span
              className={cn(
                "absolute animate-ping rounded-full opacity-75",
                callStatus !== "CONNECTING" && "hidden"
              )}
            />

            <span className="relative">
              {callStatus === "INACTIVE" || callStatus === "FINISHED"
                ? "Call"
                : ". . ."}
            </span>
          </button>
        ) : (
          <button className="btn-disconnect" onClick={() => handleDisconnect()}>
            End
          </button>
        )}
      </div>
    </>
  );
};

export default Agent;