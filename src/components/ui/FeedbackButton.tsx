// src/components/ui/FeedbackButton.tsx
"use client";
import { useState } from 'react';
import { ThumbsUp } from 'lucide-react'; // Or any other suitable icon
import FeedbackModal from './FeedbackModal'; // Assuming modal is in the same directory

export default function FeedbackButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpenModal = () => setIsModalOpen(true);
  const handleCloseModal = () => setIsModalOpen(false);

  return (
    <>
      <button
        onClick={handleOpenModal}
        className="fixed bottom-6 left-6 z-40 p-3 bg-primary hover:bg-primary-dark text-white rounded-full shadow-lg transition-transform duration-150 ease-in-out hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        aria-label="Open feedback form"
      >
        <ThumbsUp size={24} />
      </button>
      {isModalOpen && <FeedbackModal onClose={handleCloseModal} />}
    </>
  );
}
