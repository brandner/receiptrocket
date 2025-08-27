# ReceiptRocket Development Roadmap

This document outlines the planned features and improvements for the ReceiptRocket application. It is a living document that will evolve as the project grows.

## Current Status

The application is currently in a stable, feature-complete state for its core purpose:
- Users can securely sign in with Google.
- Users can upload receipt images or use their device camera.
- AI (Genkit/Gemini) extracts key data from receipts.
- All user data is securely stored and associated with their account.
- Users can view, manage, and export their receipt data.

---

## ✅ Immediate Priorities (Short-Term)

These items address the most critical next steps, focusing on security and robustness.

### 1. Implement Firestore Security Rules

- **Goal**: Add a non-bypassable "defense-in-depth" security layer directly within Firebase.
- **Description**: While the server-side code already prevents users from accessing each other's data, Firestore rules will enforce this at the database level. This is a critical security best practice for any production application.
- **Task**: Write and deploy rules that ensure a user can only read, write, or delete a receipt if the document's `userId` matches their authenticated `uid`.

### 2. Enhance AI Error Handling

- **Goal**: Make the AI data extraction process more resilient.
- **Description**: Currently, if the AI model fails to extract data from a poor-quality image or a non-receipt image, the process can fail. The system should gracefully handle these cases.
- **Task**: Update the Genkit flow to handle null or incomplete responses from the AI model and display a user-friendly message, rather than throwing an error.

---

## 🚀 Next Features (Medium-Term)

These features will significantly enhance the user experience and utility of the application.

### 1. Spending Dashboard & Analytics

- **Goal**: Provide users with insights into their spending habits.
- **Description**: A new "Dashboard" page that visualizes receipt data.
- **Tasks**:
    - Bar chart showing total spending by month.
    - Pie chart breaking down spending by category (e.g., "Groceries", "Dinner", "Gas").

### 2. In-Place Editing of Receipt Data

- **Goal**: Allow users to correct AI extraction errors without re-uploading.
- **Description**: Sometimes the AI might misread a detail. Users should be able to click on a field in the receipt list and edit it directly.
- **Task**: Implement an "edit mode" for the receipt list or detail view to update Firestore records.

### 3. Search and Filtering

- **Goal**: Make it easier for users to find specific receipts.
- **Description**: Add controls to the receipt list to narrow down the view.
- **Tasks**:
    - Add a search bar to filter by Company Name or Description.
    - Implement a date range picker to show receipts from a specific period.

---

## 🔭 Future Vision (Long-Term)

These are larger ideas that could be explored once the immediate and medium-term priorities are complete.

- **Multi-Currency Support**: Allow users to specify a currency for a receipt and see converted totals.
- **Recurring Receipts**: Ability to mark a receipt as a recurring expense (e.g., monthly subscriptions).
- **Advanced Exporting**: Support exporting to formats compatible with financial software like QuickBooks or Xero.
- **Native Mobile App**: A dedicated iOS/Android app for an even better on-the-go experience.
