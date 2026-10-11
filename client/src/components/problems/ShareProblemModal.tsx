import React from 'react';
import { Problem } from '../../types';
import { ShareModal } from '../common/ShareModal';

interface ShareProblemModalProps {
  problem: Problem | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ShareProblemModal: React.FC<ShareProblemModalProps> = ({
  problem,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !problem) return null;

  return (
    <ShareModal
      isOpen={isOpen}
      onClose={onClose}
      item={{
        title: problem.title,
        url: `/problems/${problem.id}`,
        description: problem.description,
        type: 'problem',
      }}
    />
  );
};
