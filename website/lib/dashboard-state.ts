export type DashboardSectionId =
  | "activity"
  | "pro"
  | "client_requests"
  | "actions"
  | "join_pro"
  | "account_management";

export type DashboardActionId = "explore" | "preferences" | "saved_requests";

type DashboardSectionInput = {
  hasClientActivity: boolean;
  hasProfessionalProfile: boolean;
  showClientRequests?: boolean;
};

type DashboardActionInput = DashboardSectionInput & {
  hasRecentSaved: boolean;
  hasRecentOutgoingRequests: boolean;
};

type ProfessionalPresentationInput = {
  status: string;
  isPubliclyListed: boolean;
};

export function getDashboardSectionOrder({
  hasClientActivity,
  hasProfessionalProfile,
  showClientRequests = false,
}: DashboardSectionInput): DashboardSectionId[] {
  if (hasProfessionalProfile) {
    return [
      ...(hasClientActivity ? (["activity"] as const) : []),
      "pro",
      ...(showClientRequests ? (["client_requests"] as const) : []),
      "actions",
      "account_management",
    ];
  }

  if (hasClientActivity) {
    return ["activity", "actions", "join_pro", "account_management"];
  }

  return ["actions", "join_pro", "account_management"];
}

export function getDashboardActionOrder({
  hasClientActivity,
  hasProfessionalProfile,
  hasRecentSaved,
  hasRecentOutgoingRequests,
}: DashboardActionInput): DashboardActionId[] {
  if (!hasClientActivity && !hasProfessionalProfile) {
    return ["explore", "preferences", "saved_requests"];
  }

  const primaryActions: DashboardActionId[] = ["preferences", "explore"];

  if (!hasRecentSaved || !hasRecentOutgoingRequests) {
    primaryActions.push("saved_requests");
  }

  return primaryActions;
}

export function getProfessionalDashboardPresentation({
  status,
  isPubliclyListed,
}: ProfessionalPresentationInput) {
  if (isPubliclyListed) {
    return {
      statusLabel: "Live",
      editorActionLabel: "Edit Profile",
    };
  }

  switch (status) {
    case "draft":
      return {
        statusLabel: "Draft",
        editorActionLabel: "Continue Profile",
      };
    case "pending_review":
      return {
        statusLabel: "Pending Review",
        editorActionLabel: "View / Edit Profile",
      };
    case "rejected":
      return {
        statusLabel: "Rejected",
        editorActionLabel: "Update Profile",
      };
    case "suspended":
      return {
        statusLabel: "Suspended",
        editorActionLabel: "View Profile",
      };
    case "inactive":
      return {
        statusLabel: "Inactive",
        editorActionLabel: "View / Edit Profile",
      };
    default:
      return {
        statusLabel: "Profile Status",
        editorActionLabel: "View / Edit Profile",
      };
  }
}
