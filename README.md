# ReceiptRocket

ReceiptRocket is a modern, AI-powered web application designed to simplify expense tracking. Users can upload pictures of their receipts (via file upload or their device's camera), and the application's AI will automatically extract key information like the company name, total amount, taxes, and a brief description. All receipts are securely stored and tied to the user's account.

## Core Features

- **Secure User Authentication**: Sign-in and registration handled securely via Firebase Authentication with Google Sign-In. Each user can only access their own data.
- **AI-Powered Data Extraction**: Leverages Google's Gemini model through Genkit to intelligently scan receipt images and extract structured data.
- **Flexible Upload Options**: Users can either upload an image file directly or use their device's camera to snap a photo of a receipt on the fly.
- **Secure Cloud Storage**: Receipt images are stored in Firebase Cloud Storage, with data and public URLs managed in a Firestore database.
- **Data Management**: A clean, intuitive interface for viewing a list of all processed receipts, inspecting individual details, and deleting records.
- **CSV Export**: Users can export a list of their receipts and the extracted data to a CSV file for use in spreadsheets or other financial software.

## Technology Stack

This project is built with a modern, full-stack TypeScript architecture:

- **Framework**: [Next.js](https://nextjs.org/) (with App Router)
- **UI**: [React](https://react.dev/), [shadcn/ui](https://ui.shadcn.com/), and [Tailwind CSS](https://tailwindcss.com/)
- **Generative AI**: [Genkit](https://firebase.google.com/docs/genkit) (with Google's Gemini model)
- **Backend & Database**: [Firebase](https://firebase.google.com/) (Authentication, Firestore, Cloud Storage)
- **Deployment**: Configured for [Firebase App Hosting](https://firebase.google.com/docs/app-hosting)

## Getting Started

### Prerequisites

- Node.js and npm
- A Firebase project

### Setup

1.  **Clone the repository.**

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Configure Firebase:**
    - Follow the detailed instructions in the [**Configuration Guide**](./docs/configuration.md) to set up your Firebase project and environment variables.

4.  **Run the development server:**
    ```bash
    npm run dev
    ```

The application will be available at `http://localhost:9002`.
