"use client";

import { useState } from "react";
import { trackEvent } from "@/lib/analytics";

export type WorkoutActionStatus = {
  ok: false;
  status: "unavailable";
  message: string;
};

type WorkoutActionName = "save" | "favorite" | "generate";

function buildUnavailableMessage(action: WorkoutActionName) {
  switch (action) {
    case "save":
      return "Saving workout templates to Logbook from the website is coming soon.";
    case "favorite":
      return "Favoriting workout templates on the website is coming soon.";
    case "generate":
      return "Generating a workout directly from this recommendation is coming soon.";
  }
}

export function useWorkoutRecommendationActions() {
  const [feedback, setFeedback] = useState<string | null>(null);

  const markUnavailable = async (action: WorkoutActionName, workoutTemplateId: string) => {
    const message = buildUnavailableMessage(action);

    trackEvent("workout_generator_action", {
      action_name: action,
      workout_template_id: workoutTemplateId,
      status: "unavailable",
    });

    setFeedback(message);

    return {
      ok: false,
      status: "unavailable",
      message,
    } satisfies WorkoutActionStatus;
  };

  return {
    feedback,
    clearFeedback() {
      setFeedback(null);
    },
    saveWorkoutTemplate(workoutTemplateId: string) {
      return markUnavailable("save", workoutTemplateId);
    },
    favoriteWorkoutTemplate(workoutTemplateId: string) {
      return markUnavailable("favorite", workoutTemplateId);
    },
    generateWorkoutFromRecommendation(workoutTemplateId: string) {
      return markUnavailable("generate", workoutTemplateId);
    },
  };
}
