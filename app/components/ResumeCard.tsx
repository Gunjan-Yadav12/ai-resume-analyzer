import React, { useRef } from 'react'
import { Link } from "react-router";
import ScoreCircle from "~/components/ScoreCircle";

const ResumeCard = ({resume: {id, companyName, jobTitle, feedback, imagePath}}: {resume: Resume}) => {
  const imageRef = useRef<HTMLDivElement>(null);

  const handleScroll = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    imageRef.current?.scrollBy({ top: 150, behavior: 'smooth' });
  };

  return (
    <Link to={`/resume/${id}`} className="resume-card animate-in fade-in duration-1000">
      <div className="resume-card-header">
        <div className="flex flex-col gap-2">
          <h2 className="!text-black font-bold break-words">{companyName}</h2>
          <h3 className="text-lg break-words text-gray-500">{jobTitle}</h3>
        </div>
        <div className="flex-shrink-0">
          <ScoreCircle score={feedback.overallScore} />
        </div>
      </div>

      <div className="gradient-border animate-in fade-in duration-1000">
        <div
          ref={imageRef}
          className="w-full h-[240px] overflow-y-auto rounded-xl scrollbar-hide"
        >
          <img
            src={imagePath}
            alt="resume"
            className="w-full object-top rounded-xl"
          />
        </div>

        {/* Scroll button sits inside gradient-border, below the image, in normal flow */}
        <button
          onClick={handleScroll}
          className="mx-auto mt-2 flex items-center gap-1 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-full px-3 py-1 text-xs text-gray-500 shadow-sm hover:bg-white transition-all"
        >
          ↓ scroll
        </button>
      </div>

    </Link>
  );
};

export default ResumeCard;