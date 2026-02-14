export interface FeedbackEntry {
  id: string;
  feedbackText: string;
  timestamp: string;
  chatSessionId: string;
  // Enriched from user profile
  userId: string;
  userName: string;
  userEmail: string;
  userCompany: string;
}
