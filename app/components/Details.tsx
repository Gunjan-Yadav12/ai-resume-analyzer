import { cn } from "~/lib/utils";

const ScoreBadge = ({ score }: { score: number }) => {
    return (
        <div
            className={cn(
                "flex flex-row gap-1 items-center px-2 py-0.5 rounded-[96px]",
                score > 69
                    ? "bg-badge-green"
                    : score > 39
                    ? "bg-badge-yellow"
                    : "bg-badge-red"
            )}
        >
            <img
                src={score > 69 ? "/icons/check.svg" : "/icons/warning.svg"}
                alt="score"
                className="size-4"
            />
            <p
                className={cn(
                    "text-sm font-medium",
                    score > 69
                        ? "text-badge-green-text"
                        : score > 39
                        ? "text-badge-yellow-text"
                        : "text-badge-red-text"
                )}
            >
                {score}/100
            </p>
        </div>
    );
};

const CategoryHeader = ({
    title,
    categoryScore,
}: {
    title: string;
    categoryScore: number;
}) => {
    return (
        <div className="flex flex-row gap-4 items-center py-2">
            <p className="text-2xl font-semibold">{title}</p>
            <ScoreBadge score={categoryScore} />
        </div>
    );
};

type Tip = {
    type: "good" | "improve";
    tip: string;
    explanation?: string;
};

const CategoryContent = ({ tips }: { tips: Tip[] }) => {
    if (!tips || tips.length === 0) {
        return (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 text-slate-500">
                No detailed feedback available for this section.
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4 items-center w-full">
            <div className="bg-gray-50 w-full rounded-lg px-5 py-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                {tips.map((tip, index) => (
                    <div className="flex flex-row gap-2 items-center" key={index}>
                        <img
                            src={tip.type === "good" ? "/icons/check.svg" : "/icons/warning.svg"}
                            alt="score"
                            className="size-5"
                        />
                        <p className="text-base md:text-lg text-gray-700">{tip.tip}</p>
                    </div>
                ))}
            </div>

            <div className="flex flex-col gap-4 w-full">
                {tips.map((tip, index) => (
                    <div
                        key={index + tip.tip}
                        className={cn(
                            "flex flex-col gap-2 rounded-2xl p-4",
                            tip.type === "good"
                                ? "bg-green-50 border border-green-200 text-green-700"
                                : "bg-yellow-50 border border-yellow-200 text-yellow-700"
                        )}
                    >
                        <div className="flex flex-row gap-2 items-center">
                            <img
                                src={tip.type === "good" ? "/icons/check.svg" : "/icons/warning.svg"}
                                alt="score"
                                className="size-5"
                            />
                            <p className="text-lg md:text-xl font-semibold">{tip.tip}</p>
                        </div>

                        {tip.explanation && (
                            <p className="text-sm md:text-base leading-7">{tip.explanation}</p>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

const FeedbackSection = ({
    title,
    score,
    tips,
}: {
    title: string;
    score: number;
    tips: Tip[];
}) => {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <CategoryHeader title={title} categoryScore={score} />
            <div className="mt-4">
                <CategoryContent tips={tips} />
            </div>
        </div>
    );
};

const Details = ({ feedback }: { feedback: Feedback }) => {
    const toneAndStyle = feedback?.toneAndStyle ?? { score: 0, tips: [] };
    const content = feedback?.content ?? { score: 0, tips: [] };
    const structure = feedback?.structure ?? { score: 0, tips: [] };
    const skills = feedback?.skills ?? { score: 0, tips: [] };

    return (
        <div className="flex flex-col gap-6 w-full mt-8">
            <FeedbackSection
                title="Tone & Style"
                score={toneAndStyle.score}
                tips={toneAndStyle.tips}
            />

            <FeedbackSection
                title="Content"
                score={content.score}
                tips={content.tips}
            />

            <FeedbackSection
                title="Structure"
                score={structure.score}
                tips={structure.tips}
            />

            <FeedbackSection
                title="Skills"
                score={skills.score}
                tips={skills.tips}
            />
        </div>
    );
};

export default Details;