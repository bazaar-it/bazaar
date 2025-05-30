"use client";
import { useState } from 'react';
import { MessageSquareIcon } from "~/components/ui/icons";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "~/components/ui/tooltip";
import { Button } from "~/components/ui/button";
import FeedbackModal from './FeedbackModal';

interface SidebarFeedbackButtonProps {
  isCollapsed?: boolean;
}

export default function SidebarFeedbackButton({ isCollapsed = false }: SidebarFeedbackButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpenModal = () => setIsModalOpen(true);
  const handleCloseModal = () => setIsModalOpen(false);

  return (
    <TooltipProvider>
      <>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={`flex ${isCollapsed ? 'justify-center w-full' : 'w-full'} mb-4`}>
              {isCollapsed ? (
                <Button 
                  variant="ghost"
                  className="h-9 w-9 rounded-lg flex items-center justify-center transition-all duration-200 
                    bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 
                    text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
                  onClick={handleOpenModal}
                >
                  <MessageSquareIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                </Button>
              ) : (
                <Button 
                  variant="ghost"
                  className="h-9 w-full flex items-center justify-start rounded-lg transition-all duration-200 
                    bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800
                    text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 pr-4"
                  onClick={handleOpenModal}
                >
                  <MessageSquareIcon className="h-5 w-5 text-gray-500 dark:text-gray-400 mr-3" />
                  <span className="text-sm font-normal">Feedback</span>
                </Button>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="right" className={!isCollapsed ? 'hidden' : ''}>
            Feedback
          </TooltipContent>
        </Tooltip>

        {isModalOpen && <FeedbackModal onClose={handleCloseModal} />}
      </>
    </TooltipProvider>
  );
} 