"use client";

interface ErrorBannerProps {
  message: string | null;
}

export function ErrorBanner({ message }: ErrorBannerProps) {
  if (!message) return null;

  return (
    <div
      style={{
        padding: "1rem",
        background: "#fee",
        border: "1px solid #f00",
        borderRadius: "4px",
        marginBottom: "1rem",
      }}
    >
      <strong>Error:</strong> {message}
    </div>
  );
}
