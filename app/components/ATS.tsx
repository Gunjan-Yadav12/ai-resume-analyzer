import React from 'react';

interface ATSProps {
    score: number;
    tips: {
        type: 'good' | 'improve';
        tip: string;
        explanation?: string;
    }[];
}

const ATS: React.FC<ATSProps> = ({ score, tips }) => {
    const gradientClass =
        score > 69
            ? 'from-green-100'
            : score > 49
              ? 'from-yellow-100'
              : 'from-red-100';

    const iconSrc =
        score > 69
            ? '/icons/ats-good.svg'
            : score > 49
              ? '/icons/ats-warning.svg'
              : '/icons/ats-bad.svg';

    const subtitle =
        score > 69
            ? 'Strong ATS Match'
            : score > 49
              ? 'Decent Base, Needs Work'
              : 'Low ATS Match';

    return (
        <div
            className={`bg-gradient-to-b ${gradientClass} to-white rounded-2xl shadow-md w-full p-6`}
        >
            <div className="flex items-center gap-4 mb-6">
                <img
                    src={iconSrc}
                    alt="ATS Score Icon"
                    className="w-12 h-12"
                />
                <div>
                    <h2 className="text-2xl font-bold">ATS Score — {score}/100</h2>
                    <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
                </div>
            </div>

            <div className="mb-6">
                <p className="text-gray-600 mb-4">
                    This score estimates how well your resume aligns with ATS filters
                    and the target job description.
                </p>

                <div className="space-y-4">
                    {tips.map((tip, index) => (
                        <div
                            key={`${tip.tip}-${index}`}
                            className={`rounded-xl border p-4 ${
                                tip.type === 'good'
                                    ? 'bg-green-50 border-green-200'
                                    : 'bg-yellow-50 border-yellow-200'
                            }`}
                        >
                            <div className="flex items-start gap-3">
                                <img
                                    src={
                                        tip.type === 'good'
                                            ? '/icons/check.svg'
                                            : '/icons/warning.svg'
                                    }
                                    alt={
                                        tip.type === 'good'
                                            ? 'Positive point'
                                            : 'Improvement point'
                                    }
                                    className="w-5 h-5 mt-1"
                                />
                                <div className="flex flex-col gap-1">
                                    <p
                                        className={
                                            tip.type === 'good'
                                                ? 'text-green-700 font-medium'
                                                : 'text-amber-700 font-medium'
                                        }
                                    >
                                        {tip.tip}
                                    </p>

                                    {tip.explanation && (
                                        <p className="text-sm text-gray-700">
                                            {tip.explanation}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <p className="text-gray-700 italic">
                Focus on missing keywords, stronger bullet points, and clearer
                alignment with the target role.
            </p>
        </div>
    );
};

export default ATS;